import { newScope, PSD } from "@vulcan.sh/context-provider";
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

export function tx<T>(fn: () => T): T {
  const tx = transaction();
  inflight.push(tx);

  let updatedInflight = false;
  try {
    const ret = newScope(fn, {
      tx,
    });
    inflight.splice(inflight.indexOf(tx), 1);
    updatedInflight = true;
    commit(tx);
    // TODO: warn if a promise is returned?
    return ret;
  } finally {
    if (!updatedInflight) {
      const idx = inflight.indexOf(tx);
      inflight.splice(idx, 1);
    }
  }
}

export async function txAsync<T>(fn: () => Promise<T>): Promise<T> {
  const tx = transaction();
  inflight.push(tx);

  let updatedInflight = false;
  try {
    const ret = await newScope(fn, { tx });
    inflight.splice(inflight.indexOf(tx), 1);
    updatedInflight = true;
    commit(tx);
    return ret;
  } finally {
    if (!updatedInflight) {
      const idx = inflight.indexOf(tx);
      inflight.splice(idx, 1);
    }
  }
}

function commit(tx: Transaction) {
  // If still in a tx, roll values up into parent tx rather
  // than committing. We only commit when outer most tx finally
  // commits.
  // @ts-ignore
  const parentTx = PSD.tx as Transaction | undefined;
  console.log(PSD);
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
