import { ID_of } from "@vulcan.sh/id";
import { IPersistedModel } from "./PersistedModel.js";
import { config } from "@vulcan.sh/config";
import { BasePersistedModelData } from "./spec.js";

/**
 * This class exists to isolate the concern of looking up what cache to use.
 * In the future we might leverage `PSD` rather than a global config.
 * Or maybe we'll revert back to requiring the user to pass around a ctx object.
 * Or maybe JS will get co-effects (https://tomasp.net/coeffects/) and we can use those!
 */
export default {
  remove(m: IPersistedModel<any>) {
    config.cache.remove(m.id, m.spec.storage.db, m.spec.storage.tablish);
  },

  add(m: IPersistedModel<any>) {
    config.cache.set(m.id, m, m.spec.storage.db, m.spec.storage.tablish);
  },

  assertConsistent<D extends BasePersistedModelData>(
    m: IPersistedModel<D>,
    d: D
  ) {
    return (
      Object.keys(m.data).length === Object.keys(d).length &&
      (Object.entries(m.data) as [keyof Partial<D>, any][]).every(
        (entry) => d[entry[0]] === entry[1]
      )
    );
  },

  get<T extends IPersistedModel<any>>(
    dbName: string,
    typeName: string,
    id: ID_of<T>
  ): T | null {
    return config.cache.get(id, dbName, typeName);
  },
};
