import { context } from "./context.js";

export function runInScope<T, P extends {}>(fn: () => T, props: P): T {
  context.createAndSwitchTo(props);
  try {
    return fn();
  } finally {
    context.pop();
  }
}
