import { HopExpression } from "../Expression.js";
import { HopQuery, Query } from "../Query.js";
import { EdgeSpec } from "@vulcan.sh/schema-api";
import { IPersistedModel } from "@vulcan.sh/model-persisted";
import MemoryHopExpression from "./MemoryHopExpression.js";

export default class MemoryHopQuery<
  TIn extends IPersistedModel<any>,
  TOut
> extends HopQuery<TIn, TOut> {
  static create<TIn extends IPersistedModel<any>, TOut>(
    sourceQuery: Query<TIn>,
    edge: EdgeSpec
  ) {
    // source could be anything.
    // dest is memory.
    // standalone edge could be memory or sql...
    return new MemoryHopQuery<TIn, TOut>(
      sourceQuery,
      new MemoryHopExpression(edge, { what: "model" })
    );
  }
}

function createChainedHopExpression<TIn, TOut>(
  edge: EdgeSpec
): HopExpression<TIn, TOut> {
  throw new Error("In memory hop not yet supported");
}
