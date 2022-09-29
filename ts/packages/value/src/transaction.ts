import {
  decrementExpectedAwaits,
  incrementExpectedAwaits,
  isAsyncFunction,
  newScope,
  PSD,
  ZonedPromise,
} from "@vulcan.sh/context-provider";
import { assert } from "@vulcan.sh/util";
import { memory, MemoryVersion } from "./memory.js";
import { Event, IValue } from "./Value.js";

const _inflight = new Set<Transaction>();
export const inflight = {
  add(t: Transaction) {
    _inflight.add(t);
  },

  has(t: Transaction): boolean {
    return _inflight.has(t);
  },

  remove(t: Transaction) {
    _inflight.delete(t);
  },

  get length() {
    return _inflight.size;
  },

  clear() {
    _inflight.clear();
  },
};

export type TxOptions = {
  // When a concurrente modification is detected do we:
  // - fail the transaction
  // - run it again until it succeeds
  // Currently we only support failing.
  // We also support "serialize" which takes effect prior to
  // commit and at transaction submission. This mode
  // serializes all sibling transactions. Reduces throughput of your system.
  // E.g., `await Promise.all([a,b,c])` would turn into `await a; await b; await c;`
  readonly concurrentModification: "fail" | "retry"; // | "serialize";
  readonly name?: string;

  // consistent read option as in the clojure dining philosophers example?
};

export type Transaction = {
  readonly options: TxOptions;
  // The models that were touched, the first event that touched them,
  // the causal length if subsequent events touched them, their most recent data
  readonly touched: ReadonlyMap<IValue<any>, [Event, any]>;
  touch(value: IValue<any>, e: Event, d: any): void;
  // merge(subTransaction: Transaction): void;
  readonly memoryVersion: MemoryVersion;
};

export function transaction(
  options: TxOptions = { concurrentModification: "fail" }
): Transaction {
  const touched = new Map<IValue<any>, [Event, any]>();

  const ret = {
    options,
    touch(value: IValue<any>, e: Event, d: any): void {
      const existing = touched.get(value);
      if (!existing) {
        touched.set(value, [e, d]);
      } else {
        if (e === "create" || e === "delete") {
          existing[0] = e;
        }
        existing[1] = d;
      }
    },
    touched,
    memoryVersion: memory.version,
  };

  return ret;
}

let txid = 0;
export function txAsync<T>(
  fn: () => Promise<T>,
  options: TxOptions = { concurrentModification: "fail" }
): Promise<T> {
  const parentTx = (PSD as any).tx as Transaction | undefined;
  let tx: Transaction;
  if (parentTx) {
    tx = parentTx;
  } else {
    tx = transaction(options);
    inflight.add(tx);
  }

  const isAsync = isAsyncFunction(fn);
  if (isAsync) {
    incrementExpectedAwaits();
  }

  let returnValue: any;
  const promiseFollowed = (ZonedPromise as any).follow(
    () => {
      returnValue = fn();
      if (isAsync) {
        var decrementor = decrementExpectedAwaits.bind(null, null);
        returnValue.then(decrementor, decrementor);
      }
    },
    {
      tx,
      txid: txid++,
    }
  );

  const resolved = (r: any) => {
    if (!parentTx) {
      inflight.remove(tx);
      try {
        commit(tx);
      } catch (e) {
        if (e !== "retry") {
          throw e;
        }
        // retry the transaction
        // TODO: should you enqueue to next tick?
        return Promise.resolve(txAsync(fn));
      }
    }
    return r;
  };
  const rejected = (e: any) => {
    if (!parentTx) {
      inflight.remove(tx);
    }
    throw e;
  };

  return returnValue && typeof returnValue.then === "function"
    ? (ZonedPromise as any).resolve(returnValue).then(resolved, rejected)
    : promiseFollowed.then(() => returnValue).then(resolved, rejected);
}

export function tx<T>(
  fn: () => T,
  options: TxOptions = { concurrentModification: "fail" }
): T {
  const parentTx = (PSD as any).tx as Transaction | undefined;
  let tx: Transaction;
  if (parentTx) {
    tx = parentTx;
  } else {
    tx = transaction(options);
    inflight.add(tx);
  }

  try {
    let ret = newScope(
      fn,
      {
        tx,
        txid: txid++,
      },
      null,
      null
    );
    if (typeof ret?.then === "function") {
      console.error(
        "Looks like you called `tx` with a function that returns a promise. You should call `txAsync` instead."
      );
    }

    if (!parentTx) {
      inflight.remove(tx);
      commit(tx);
    }

    return ret;
  } finally {
    if (!parentTx) {
      inflight.remove(tx);
    }
  }
}

function commit<T>(tx: Transaction) {
  // If we're inside a parent transaction then the parent will handle the
  // commit for us
  const parentTx = (PSD as any).tx as Transaction | undefined;
  if (parentTx) {
    return;
  }

  // someone committed while we were running
  const conflicts = checkForConflictingWrites(tx);
  if (conflicts) {
    switch (tx.options.concurrentModification) {
      case "fail":
        throw new Error(
          `Transaction ${
            tx.options.name || "unnamed"
          } had conflicting writes. ${
            tx.options.name || "unnamed"
          } was reverted.`
        );
      case "retry":
        // will be caught and retried
        throw "retry";
    }

    throw new Error("Should be unreachable");
  }
  // else we can commit

  for (const [value, [event, data]] of tx.touched.entries()) {
    value.__commit(data, event);
  }

  // notify potential listeners to values of transaction completion
  for (const [value, [event, _data]] of tx.touched.entries()) {
    value.__transactionComplete(event);
  }
}

// TODO: what if someone writes a value you wrote
// but not inside of transaction?
// you should probs still retry the transactions impacted
// by said write.
// --
// The solution here is to then instead use memory version?
// Or wrap all single statements in a lw tx?
// "single touches" while inflights were running...
// or mem vers? --
// 1. Look through everything you touched
// 2. Check if it's memory version doesn't match what you'd expected it to be
//
// so for every touch you need to record the new memory version....
// which is some offest from your current memory version...
//
// mem vers, if we can pull it off, would let us figure out
// if the write was before or after our read. For stable
// reads anyway
//
// at commit, does everything you touched have a memory version <= your
// transaction memory version?
// if so, no conflicts
// if not, conflicts
// this captures all conflicts with no cross registration.
function checkForConflictingWrites(tx: Transaction): boolean {
  for (const touched of tx.touched.keys()) {
    // Someone committed after we started running and before we committed
    if (touched.__memVers > tx.memoryVersion) {
      return true;
    }
  }

  return false;
}
