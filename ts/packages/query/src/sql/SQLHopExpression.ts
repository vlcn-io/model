import { specToDatasetKey } from "@vulcan.sh/model-persisted";
import { EdgeSpec } from "@vulcan.sh/schema-api";
import { ChunkIterable } from "../ChunkIterable.js";
import { HopExpression } from "../Expression.js";
import HopPlan from "../HopPlan.js";
import { IPlan } from "../Plan.js";
import SQLExpression, { HoistedOperations } from "./SQLExpression.js";
import SQLHopChunkIterable from "./SQLHopChunkIterable.js";

export default class SQLHopExpression<TIn, TOut>
  extends SQLExpression<TOut>
  implements HopExpression<TIn, TOut>
{
  constructor(public readonly edge: EdgeSpec, ops: HoistedOperations) {
    super(ops);
  }

  chainAfter(iterable: ChunkIterable<TIn>): ChunkIterable<TOut> {
    return new SQLHopChunkIterable(this.edge, this.ops);
  }

  /**
   * Optimizes the current plan (plan) and folds in the next hop (nextHop) if possible.
   * SourcePlan is retained in case we need to chain after source.
   */
  optimize(sourcePlan: IPlan, plan: HopPlan, nextHop?: HopPlan): HopPlan {
    const [hoistedExpressions, remainingExpressions] = this.hoist(
      plan,
      nextHop
    );
    return new HopPlan(
      sourcePlan,
      new SQLHopExpression(this.edge, hoistedExpressions),
      remainingExpressions
    );
  }

  type: "hop" = "hop";

  get destSpec() {
    return this.edge.dest;
  }

  implicatedDataset(): string {
    return specToDatasetKey(this.destSpec);
  }
}
