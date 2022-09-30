import { BaseChunkIterable } from "../ChunkIterable.js";
import { invariant } from "@vulcan.sh/util";
import { config, MemoryReadQuery, MemoryResolvedDB } from "@vulcan.sh/config";
import { JunctionEdgeSpec, NodeSpec } from "@vulcan.sh/schema-api";
import { IPersistedModel } from "@vulcan.sh/model-persisted";

export default class MemorySourceChunkIterable<
  T extends IPersistedModel<any>
> extends BaseChunkIterable<T> {
  constructor(
    private spec: NodeSpec | JunctionEdgeSpec,
    private query: MemoryReadQuery
  ) {
    super();
    invariant(
      this.spec.storage.type === "memory",
      "Memory source used for non-memory model!"
    );
  }

  async *[Symbol.asyncIterator](): AsyncIterator<readonly T[]> {
    // TODO: stronger types one day
    // e.g., exec should by parametrized and checked against T somehow.
    // Should probably allow a namespace too?
    // also... this is pretty generic and would apply to non-sql data sources too.
    // given the actual query execution happens in the resolver.
    // also -- should we chunk it at all?
    const resolvedDb = config.storage(
      this.spec.storage.engine,
      this.spec.storage.db
    ) as MemoryResolvedDB;
    yield await resolvedDb.read(this.query);
  }
}
