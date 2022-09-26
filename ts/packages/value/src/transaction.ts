import {
  decrementExpectedAwaits,
  incrementExpectedAwaits,
  isAsyncFunction,
  newScope,
  PSD,
} from "@vulcan.sh/context-provider";
import { memory, MemoryVersion } from "./memory.js";
import { Event, IValue } from "./Value.js";

export const inflight: Transaction[] = [];

export type Transaction = {
  // The models that were touched, the first event that touched them,
  // the causal length if subsequent events touched them, their most recent data
  readonly touched: ReadonlyMap<IValue<any>, [Event, any]>;
  touch(value: IValue<any>, e: Event, d: any): void;
  merge(subTransaction: Transaction): void;
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
    merge(subTransaction: Transaction): void {
      for (const [value, [event, data]] of subTransaction.touched) {
        const existing = touched.get(value);
        if (existing != null) {
          if (event === "create" || event === "delete") {
            // deletes and creates take precedence over update.
            // as if create or delete exists then that's what is important
            // to the outside world post transaction
            existing[0] = event;
          }
          existing[1] = data;
        } else {
          touched.set(value, [event, data]);
        }
      }
    },
    touched,
    memoryVersion: memory.version,
  };
}

let txid = 0;
export function tx<T>(fn: () => T): T {
  const tx = transaction();
  inflight.push(tx);

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
            inflight.splice(inflight.indexOf(tx), 1);
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
            inflight.splice(inflight.indexOf(tx), 1);
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
      inflight.splice(inflight.indexOf(tx), 1);
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
      const idx = inflight.indexOf(tx);
      inflight.splice(idx, 1);
    }

    throw e;
  }
}

function commit(tx: Transaction) {
  // If still in a tx, roll values up into parent tx rather
  // than committing. We only commit when outer most tx finally
  // commits.
  // @ts-ignore
  const parentTx = PSD.tx as Transaction | undefined;
  if (parentTx) {
    parentTx.merge(tx);
    return;
  }

  for (const [value, [event, data]] of tx.touched.entries()) {
    value.__commit(data, event);
  }

  for (const [value, [event, _data]] of tx.touched.entries()) {
    value.__transactionComplete(event);
  }
}
