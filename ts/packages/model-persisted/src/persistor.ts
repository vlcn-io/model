/**
 * Reads the current Vulcan config to fetch:
 * - resolved db
 * -
 */

import { AsyncResolvedDB, config, ResolvedDB } from "@vulcan.sh/config";
import { IPersistedModel } from "./PersistedModel";
import { PSD } from "@vulcan.sh/zone";

// mem db must use transactional values then?
export const syncPersistor = {
  create(m: IPersistedModel<any>): void {
    throw new Error("unimplemented");
  },
  update(m: IPersistedModel<any>): void {
    throw new Error("unimplemented");
  },
  delete(m: IPersistedModel<any>): void {
    throw new Error("unimplemented");
  },
};

// persistor will need to check if in tx and do appropriate things.
export const asyncPersistor = {
  create(m: IPersistedModel<any>): Promise<void> {
    const storage = config.storage(
      m.spec.storage.engine,
      m.spec.storage.db
    ) as AsyncResolvedDB;
    const keeping = doTransactionBookkeeping(storage);
    if (keeping == null) {
      return writeUpsert(storage, m);
    }
    return keeping.then(() => writeUpsert(storage, m));
  },

  update(m: IPersistedModel<any>): Promise<void> {
    // creates are upserts at the moment
    return this.create(m);
  },

  delete(m: IPersistedModel<any>): Promise<void> {
    const storage = config.storage(
      m.spec.storage.engine,
      m.spec.storage.db
    ) as AsyncResolvedDB;
    const keeping = doTransactionBookkeeping(storage);
    if (keeping == null) {
      return writeDelete(storage, m);
    }
  },
};

function doTransactionBookkeeping(
  storage: AsyncResolvedDB
): null | Promise<void> {
  const tx = (PSD as any).tx;
  if (!tx) {
    // No tx? No need to start a storage layer tx.
    return null;
  }

  let durableFor: Set<ResolvedDB> = tx.__durableFor;
  if (!durableFor) {
    durableFor = new Set();
    tx.__durableFor = durableFor;
  }

  const durable = durableFor.has(storage);
  if (durable) {
    // Already started a storage layer tx? return.
    return null;
  }

  const ret = storage.begin();
  durableFor.add(storage);

  // TODO: listen to the tx for commit or revert

  return ret.catch((e) => {
    durableFor.delete(storage);
    console.error(e);
    throw e;
  });
}

function writeUpsert(
  storage: AsyncResolvedDB,
  m: IPersistedModel<any>
): Promise<void> {}

function writeDelete(
  storage: AsyncResolvedDB,
  m: IPersistedModel<any>
): Promise<void> {}

// TODO: sql persist will need to check id for hex only and use blob literal?
// depending on byte length?
