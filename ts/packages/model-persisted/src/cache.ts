import { ID_of } from "@vulcan.sh/id";
import { BasePersistedModelData, IPersistedModel } from "./PersistedModel";

// delegate to config'ed cache
export default {
  remove(m: IPersistedModel<any>) {
    throw new Error("unimplemented");
  },

  add(m: IPersistedModel<any>) {
    throw new Error("unimplemented");
  },

  assertConsistent<D extends BasePersistedModelData>(
    m: IPersistedModel<D>,
    d: D
  ) {
    throw new Error("unimplemented");
  },

  get(dbName: string, typeName: string, id: ID_of<any>): IPersistedModel<any> {
    throw new Error("unimplemented");
  },
};
