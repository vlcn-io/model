import { memory, MemoryVersion } from "./memory.js";
import { IObservableValue, ObservableValue } from "./ObservableValue.js";

export interface IPersistedValue<T> extends IObservableValue<T> {}

/**
 * On create we need to know:
 * - is this a hydration
 * - is this a new create
 *
 * If it is a hydration the caller should tell us.
 * If it is a hydration we need to:
 * 1. Check cache. If the thing is already in the cache, return that thing.
 *  Should we update the cached thing if there is a delta?
 * 2. If the thing is not in the cache, return new item with mem vers set to min vers
 *
 * If not hydration, just create the thing as usual. Setting mem vers to next vers
 *
 * Our unique key for the cache for a value is:
 * db + collection + id
 */
class PersistedValue<T>
  extends ObservableValue<T>
  implements IPersistedValue<T>
{
  constructor(data: T, memoryVersion: MemoryVersion) {
    super(data, memoryVersion);
  }
}

export function newPersistedValue<T>(data: T): [IPersistedValue<T>, boolean] {
  const ret = new PersistedValue(data, memory.nextVersion());

  // @ts-ignore
  const tx = PSD.tx as Transaction;
  let txComplete = false;
  if (tx) {
    tx.created.set(ret, data);
  } else {
    txComplete = true;
    ret.__transactionComplete("create");
  }

  return [ret, txComplete];
}

// nothing to do on hydration.
export function hydratePersistedValue<T>(data: T): IPersistedValue<T> {
  // we're reading off disk -- this is thus a value from before any in-flight transaction
  // how do we know?
  // well there are certain rules the persitence layer must follow to guarantee this.
  // TODO: enforce those rules
  // We can do so by:
  // 1. having a weak ref cache of persisted values
  // 2. on hydrate, return the cached value if it exists
  // 3. if it does not exist, we're mostly (still not guaranteed yet) safe to return the following statement:
  return new PersistedValue(data, memory.MIN_VERSION);
}
