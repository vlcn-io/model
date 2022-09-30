/**
 * Reads the current Vulcan config to fetch:
 * - resolved db
 * -
 */

import { IPersistedModel } from "./PersistedModel";

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
    throw new Error("unimplemented");
  },
  update(m: IPersistedModel<any>): Promise<void> {
    throw new Error("unimplemented");
  },
  delete(m: IPersistedModel<any>): Promise<void> {
    throw new Error("unimplemented");
  },
};

// TODO: sql persist will need to check id for hex only and use blob literal?
// depending on byte length?
