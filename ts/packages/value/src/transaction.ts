import {
  decrementExpectedAwaits,
  incrementExpectedAwaits,
  isAsyncFunction,
  newScope,
  PSD,
  ZonedPromise,
} from "@vulcan.sh/context-provider";
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
  readonly concurrentModification: "fail"; // | "retry" | "serialize";
  readonly name?: string;

  // consistent read option as in the clojure dining philosophers example?
};

export type Transaction = {
  readonly options: TxOptions;
  // The models that were touched, the first event that touched them,
  // the causal length if subsequent events touched them, their most recent data
  readonly touched: ReadonlyMap<IValue<any>, [Event, any]>;
  touch(value: IValue<any>, e: Event, d: any): void;
  // Whenever a tx starts while we are still running, it'll register itself with us as being
  // a concurrent transaction.
  registerConcurrentSibling(sibling: Transaction): void;
  // Whenever a tx commits while we are still running, it'll register itself with us as being
  // a concurrent commit.
  registerConcurrentCommit(sibling: Transaction): void;
  // merge(subTransaction: Transaction): void;
  readonly memoryVersion: MemoryVersion;
  readonly concurrentSiblings: Transaction[];
  readonly concurrentCommits: Transaction[];
};

export function transaction(
  options: TxOptions = { concurrentModification: "fail" }
): Transaction {
  const touched = new Map<IValue<any>, [Event, any]>();

  // copy off inflight transactions and save them as being run
  // as concurrent siblings with this transaction
  const siblings: Transaction[] = [..._inflight];
  const concurrentCommits: Transaction[] = [];

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
    registerConcurrentSibling(sibling: Transaction) {
      siblings.push(sibling);
    },
    registerConcurrentCommit(sibling: Transaction) {
      concurrentCommits.push(sibling);
    },
    touched,
    concurrentSiblings: siblings,
    concurrentCommits,
    memoryVersion: memory.version,
  };

  // When a new tx starts, it registers itself with all currently running
  // transactions.
  for (const tx of _inflight) {
    tx.registerConcurrentSibling(ret);
  }

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
      commit(tx);
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

function commit(tx: Transaction) {
  // If we're inside a parent transaction then the parent will handle the
  // commit for us
  const parentTx = (PSD as any).tx as Transaction | undefined;
  if (parentTx) {
    return;
  }

  if (tx.concurrentCommits.length !== 0) {
    // someone committed while we were running
    const conflicts = checkForConflictingWrites(tx);
    if (conflicts != null) {
      switch (tx.options.concurrentModification) {
        case "fail":
          throw new Error(
            `Transaction ${
              tx.options.name || "unnamed"
            } and ${conflicts} had conflicting writes. ${
              tx.options.name || "unnamed"
            } was reverted.`
          );
      }

      throw new Error("Should be unreachable");
    }
    // else we can commit
  }

  for (const [value, [event, data]] of tx.touched.entries()) {
    value.__commit(data, event);
  }

  // No need to register a concurrent commit if we did not write anything.
  if (tx.touched.size > 0) {
    // we were able to fully commit
    // some of these siblings might be done...
    // so registering a concurrent commit with them will be a no-op
    // maybe we shouldn't even register a concurrent commit if the sibling has already committed?
    for (const sibling of tx.concurrentSiblings) {
      sibling.registerConcurrentCommit(tx);
    }
  }

  // notify potential listeners to values of transaction completion
  for (const [value, [event, _data]] of tx.touched.entries()) {
    value.__transactionComplete(event);
  }
}

function checkForConflictingWrites(tx: Transaction): string | undefined {
  const iTouched = [...tx.touched.keys()];
  // for each sibling
  for (const sibling of tx.concurrentCommits) {
    // if any of them touched a value I did
    if (iTouched.some((x) => sibling.touched.has(x))) {
      // return them as a conflict
      return sibling.options.name || "unnamed";
    }
  }
  return undefined;
}
