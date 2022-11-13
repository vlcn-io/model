import { IPersistedModel, specToDatasetKey } from "@vlcn.io/model-persisted";
import { EdgeSpec } from "@vlcn.io/schema-api";
import { ChunkIterable } from "../ChunkIterable.js";
import { HopExpression } from "../Expression.js";
import HopPlan from "../HopPlan.js";
import { IPlan } from "../Plan.js";
import MemoryHopChunkIterable from "./MemoryHopChunkIterable.js";
import { HoistedOperations } from "./MemorySourceExpression.js";

export default class MemoryHopExpression<TIn extends IPersistedModel<any>, TOut>
  implements HopExpression<TIn, TOut>
{
  constructor(public readonly edge: EdgeSpec, private ops: HoistedOperations) {}

  chainAfter(iterable: ChunkIterable<TIn>): ChunkIterable<TOut> {
    // We have an implicit join condition going on.
    // "chain after" will have roots populated from "iterable"
    return new MemoryHopChunkIterable(this.edge, this.ops, iterable);
  }

  /**
   * Optimizes the current plan (plan) and folds in the next hop (nextHop) if possible.
   * SourcePlan is retained in case we need to chain after source.
   */
  optimize(sourcePlan: IPlan, plan: HopPlan, nextHop?: HopPlan): HopPlan {
    // TODO: commonize with `MemorySourceExpression`
    // const [hoistedExpressions, remainingExpressions] = this.hoist(plan, nextHop);
    let derivs = [...plan.derivations];
    if (nextHop) {
      derivs.push(nextHop.hop);
      derivs = derivs.concat(nextHop.derivations);
    }
    return new HopPlan(
      sourcePlan,
      new MemoryHopExpression(this.edge, this.ops),
      derivs
    );
    // return plan;
  }

  type: "hop" = "hop";

  get destSpec() {
    return this.edge.dest;
  }

  implicatedDataset(): string {
    return specToDatasetKey(this.destSpec);
  }
}
