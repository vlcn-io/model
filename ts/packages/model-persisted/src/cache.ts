import { ID_of } from "@vulcan.sh/id";
import { BasePersistedModelData, IPersistedModel } from "./PersistedModel.js";
import { config } from "@vulcan.sh/config";

/**
 * This class exists to isolate the concern of looking up what cache to use.
 * In the future we might leverage `PSD` rather than a global config.
 * Or maybe we'll revert back to requiring the user to pass around a ctx object.
 * Or maybe JS will get co-effects (https://tomasp.net/coeffects/) and we can use those!
 */
export default {
  remove(m: IPersistedModel<any>) {
    config.cache.remove(m.id, m.dbName, m.typeName);
  },

  add(m: IPersistedModel<any>) {
    config.cache.set(m.id, m, m.dbName, m.typeName);
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

  get(dbName: string, typeName: string, id: ID_of<any>): IPersistedModel<any> {
    return config.cache.get(id, dbName, typeName);
  },
};
