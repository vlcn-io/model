import { EdgeSpec } from "@vulcan.sh/schema-api";
import { assertUnreachable } from "@vulcan.sh/util";
import MemorySourceQuery from "./memory/MemorySourceQuery.js";
import MemoryHopQuery from "./memory/MemoryHopQuery.js";
import { DerivedQuery, HopQuery, Query } from "./Query.js";
import SQLHopQuery from "./sql/SQLHopQuery.js";
import SQLSourceQuery from "./sql/SQLSourceQuery.js";
import { IPersistedModel } from "@vulcan.sh/model-persisted";

// Runtime factory so we can swap to `Wire` when running on a client vs
// the native platform.
const factory = {
  createSourceQueryFor<T extends IPersistedModel<any>>(
    spec: ModelSpecWithCreate<T, {}>
  ): Query<T> {
    switch (spec.storage.type) {
      case "sql":
        return new SQLSourceQuery(spec);
      case "memory":
        return new MemorySourceQuery(spec);
      default:
        throw new Error(spec.storage.type + " is not yet supported");
    }
  },

  // TODO: get types into the edge specs so our hop and have types?
  createHopQueryFor<TDest>(
    priorQuery: DerivedQuery<any>,
    edge: EdgeSpec
  ): HopQuery<any, any> {
    const type = edge.dest.storage.type;
    switch (type) {
      case "sql":
        return SQLHopQuery.create(priorQuery, edge);
      case "memory":
        return MemoryHopQuery.create(priorQuery, edge);
      case "ephemeral":
        throw new Error(`Hops for ${type} are not implemented yet`);
    }
    assertUnreachable(type);
  },
};

export default factory;
