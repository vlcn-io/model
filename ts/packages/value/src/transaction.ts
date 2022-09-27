import {
  decrementExpectedAwaits,
  incrementExpectedAwaits,
  isAsyncFunction,
  newScope,
  PSD,
} from "@vulcan.sh/context-provider";
import { memory, MemoryVersion } from "./memory.js";
import { Event, IValue } from "./Value.js";

// export const inflight: Transaction[] = [];

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

// Need to track what transactions
// ran concurrently.
// inflight provides a window into what is running _now_.
// When a new tx starts, it should register itself with all
// other inflights.
// When a tx commits,
// it should check everyone who ran with it.
// if they are all still inflight (not committed)
// then the tx can commit.
// If any of them committed (not inflight), we need to check if we conflict
// if we conflict, throw.  We _could_ retry if the dev indicates that is safe.

// tx serialization --
// either a mutex
// or a queue of promises

export type Transaction = {
  // The models that were touched, the first event that touched them,
  // the causal length if subsequent events touched them, their most recent data
  readonly touched: ReadonlyMap<IValue<any>, [Event, any]>;
  touch(value: IValue<any>, e: Event, d: any): void;
  // merge(subTransaction: Transaction): void;
  readonly memoryVersion: MemoryVersion;
};

export function transaction(): Transaction {
  const touched = new Map<IValue<any>, [Event, any]>();
  return {
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
    // merge(subTransaction: Transaction): void {
    //   for (const [value, [event, data]] of subTransaction.touched) {
    //     const existing = touched.get(value);
    //     if (existing != null) {
    //       if (event === "create" || event === "delete") {
    //         // deletes and creates take precedence over update.
    //         // as if create or delete exists then that's what is important
    //         // to the outside world post transaction
    //         existing[0] = event;
    //       }
    //       existing[1] = data;
    //     } else {
    //       touched.set(value, [event, data]);
    //     }
    //   }
    // },
    touched,
    memoryVersion: memory.version,
  };
}

let txid = 0;
export function tx<T>(fn: () => T): T {
  // If still in a tx, use that tx.
  // @ts-ignore
  const parentTx = PSD.tx as Transaction | undefined;
  let tx: Transaction;
  if (parentTx) {
    tx = parentTx;
  } else {
    tx = transaction();
    inflight.add(tx);
  }

  let updatedInflight = false;
  const fnAsync = isAsyncFunction(fn);
  try {
    // Detect native async function usage
    if (fnAsync) {
      incrementExpectedAwaits();
    }

    let ret = newScope(fn, {
      tx,
      txid: txid++,
    });

    if (typeof ret?.then === "function") {
      ret = ret.then(
        (result: any) => {
          if (fnAsync) {
            decrementExpectedAwaits();
          }
          if (!updatedInflight) {
            inflight.remove(tx);
            // no need to set but for symmetry
            updatedInflight = true;
          }

          commit(tx);
          return result;
        },
        (reason: any) => {
          if (fnAsync) {
            decrementExpectedAwaits();
          }
          if (!updatedInflight) {
            inflight.remove(tx);
            // no need to set but for symmetry
            updatedInflight = true;
          }

          throw reason;
        }
      );
    } else {
      // removal from inflight before committing is intentional
      // so history knows to or not to add the change.
      // commit is atomic so this is ok.
      inflight.remove(tx);
      updatedInflight = true;
      commit(tx);
    }

    return ret;
  } catch (e) {
    // not in a finally. Since if the inner func is async we don't want to run
    // until then/catch.
    // finally would run too early / before the inner func completes.
    // Catch will only run if the sync code throws -- aborting
    // the tx in all cases.
    if (!updatedInflight) {
      updatedInflight = true;
      inflight.remove(tx);
    }

    throw e;
  }
}

function commit(tx: Transaction) {
  for (const [value, [event, data]] of tx.touched.entries()) {
    value.__commit(data, event);
  }

  for (const [value, [event, _data]] of tx.touched.entries()) {
    value.__transactionComplete(event);
  }
}
