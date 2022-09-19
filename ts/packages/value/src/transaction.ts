import { newScope } from "./async-context/asyncContext.js";
import { memory, MemoryVersion } from "./memory.js";
import { IValue } from "./Value.js";

export const inflight: Transaction[] = [];

export type Transaction = {
  readonly touched: Map<IValue<any>, any>;
  readonly memoryVersion: MemoryVersion;
};

function transaction(): Transaction {
  return {
    memoryVersion: memory.version,
    touched: new Map(),
  };
}

export function tx<T>(fn: () => T): T {
  const tx = transaction();
  inflight.push(tx);
  try {
    const ret = newScope(fn, {
      tx,
    });

    // removal from inflight before committing is itentional
    // so history knows to or not to add the change.
    // commit is atomic so this is ok.
    inflight.splice(inflight.indexOf(tx), 1);
    commit(tx);

    return ret;
  } catch (e) {
    inflight.splice(inflight.indexOf(tx), 1);
    throw e;
  }
}

function commit(tx: Transaction) {
  for (const [value, data] of tx.touched.entries()) {
    value.__commit(data);
  }
}
