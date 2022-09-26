import { newScope } from "@vulcan.sh/context-provider";
import { memory, MemoryVersion } from "./memory.js";
import { Event, IValue } from "./Value.js";

export const inflight: Transaction[] = [];

export type Transaction = {
  // The models that were touched, the first event that touched them,
  // the causal length if subsequent events touched them, their most recent data
  readonly touched: ReadonlyMap<IValue<any>, [Event, number, any]>;
  touch(value: IValue<any>, e: Event, d: any): void;
  readonly memoryVersion: MemoryVersion;
};

export function transaction(): Transaction {
  const touched = new Map<IValue<any>, [Event, number, any]>();
  return {
    touch(value: IValue<any>, e: Event, d: any): void {
      const existing = touched.get(value);
      if (!existing) {
        touched.set(value, [e, e === "delete" ? 0 : 1, d]);
      } else {
        let cl = existing[1];
        if (e === "create" || e === "delete") {
          cl += 1;
        }
        existing[1] = cl;
        existing[2] = d;
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
  for (const [value, [event, causalLength, data]] of tx.touched.entries()) {
    value.__commit(data, finalEventFromStartEventAndCl(event, causalLength));
  }

  for (const [value, [event, causalLength, _data]] of tx.touched.entries()) {
    value.__transactionComplete(
      finalEventFromStartEventAndCl(event, causalLength)
    );
  }
}

export function finalEventFromStartEventAndCl(
  startEvent: Event,
  causalLength: number
): Event {
  // Does not matter what the start event was. If the CL is 0,
  // the thing no longer exists at the end of the transaction
  // and thus the world should see a delete.
  if (causalLength % 2 === 0) {
    return "delete";
  }

  // if the thing was first created in the tx, it should
  // be a create event. Even if there were subsequent updates.
  // The world should see a create with the latest value on tx commit.
  //
  // If the thing was first updated, then deleted, then re-created
  // well.. it was all in a tx so the delete and re-create
  // are invisible outsid the tx. Keep it an update event of the
  // original thing.
  return startEvent;
}
