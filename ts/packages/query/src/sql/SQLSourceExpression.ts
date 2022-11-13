import { SourceExpression } from "../Expression.js";
import SQLSourceChunkIterable from "./SQLSourceChunkIterable.js";
import Plan from "../Plan.js";
import { ChunkIterable } from "../ChunkIterable.js";
import HopPlan from "../HopPlan.js";
import {
  BasePersistedModelData,
  IPersistedModel,
  specToDatasetKey,
} from "@vlcn.io/model-persisted";
import SQLExpression, { HoistedOperations } from "./SQLExpression.js";
import { JunctionEdgeSpec, NodeSpec } from "@vlcn.io/schema-api";

export interface SQLResult {}

export default class SQLSourceExpression<
    T extends IPersistedModel<BasePersistedModelData>
  >
  extends SQLExpression<T>
  implements SourceExpression<T>
{
  constructor(
    // we should take a schema instead of db
    // we'd need the schema to know if we can hoist certain fields or not
    public readonly spec: NodeSpec | JunctionEdgeSpec,
    ops: HoistedOperations
  ) {
    super(ops);
  }

  optimize(plan: Plan, nextHop?: HopPlan): Plan {
    const [hoistedExpressions, remainingExpressions] = this.hoist(
      plan,
      nextHop
    );
    return new Plan(
      new SQLSourceExpression(this.spec, hoistedExpressions),
      remainingExpressions
    );
  }

  get iterable(): ChunkIterable<T> {
    return new SQLSourceChunkIterable(this.spec, this.ops);
  }

  implicatedDataset(): string {
    return specToDatasetKey(this.spec);
  }
}
