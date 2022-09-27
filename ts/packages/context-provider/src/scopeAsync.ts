import { context } from "./context.js";

export function runInScopeAsync<T>(
  fn: () => Promise<T>,
  props: {}
): Promise<T> {
  // we know we enter
  // when we exit fn we know we paused (can pop context)
  // how do we know when we enter again?
  // well we would exit if/when we hit an await or promise.then
  //
  const asyncContext = context.createAndSwitchTo(props);
  // TODO: re-establish the async context when we re-enter `fn`
  try {
    return fn();
  } finally {
    // pops but needs to push again when we re-enter fn
    context.pop();
  }
}
