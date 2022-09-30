import { SourceExpression } from "../Expression.js";
import SQLSourceChunkIterable from "./SQLSourceChunkIterable.js";
import Plan from "../Plan.js";
import { ChunkIterable } from "../ChunkIterable.js";
import HopPlan from "../HopPlan.js";
import { specToDatasetKey } from "@vulcan.sh/model-persisted";
import { IModel, INode } from "@vulcan.sh/config";
import SQLExpression, { HoistedOperations } from "./SQLExpression.js";
import { JunctionEdgeSpec, NodeSpec } from "@vulcan.sh/schema-api";

export interface SQLResult {}

export default class SQLSourceExpression<T extends IModel<Object>>
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
