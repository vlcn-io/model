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

  get(/* static interface */): IPersistedModel<any> {
    throw new Error("unimplemented");
  },
};
