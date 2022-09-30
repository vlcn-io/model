import { HopExpression } from "../Expression.js";
import { HopQuery, Query } from "../Query.js";
import { EdgeSpec } from "@vulcan.sh/schema-api";
import { Context, IModel } from "@vulcan.sh/config";
import MemoryHopExpression from "./MemoryHopExpression.js";

export default class MemoryHopQuery<TIn extends IModel, TOut> extends HopQuery<
  TIn,
  TOut
> {
  static create<TIn extends IModel, TOut>(
    ctx: Context,
    sourceQuery: Query<TIn>,
    edge: EdgeSpec
  ) {
    // source could be anything.
    // dest is memory.
    // standalone edge could be memory or sql...
    return new MemoryHopQuery<TIn, TOut>(
      ctx,
      sourceQuery,
      new MemoryHopExpression(ctx, edge, { what: "model" })
    );
  }
}

function createChainedHopExpression<TIn, TOut>(
  edge: EdgeSpec
): HopExpression<TIn, TOut> {
  throw new Error("In memory hop not yet supported");
}
