import { config } from "@vulcan.sh/config";
import { ID_of } from "@vulcan.sh/id";

/**
 * Memoizes `gen`, `genFoo` type methods where we're loading a model by id.
 *
 * If multiple concurrent access to the method happens, return the promise awaiting to be resolved.
 * If the thing is already cached, returns that.
 *
 * TODO: can we move this deeper into the query layer itself?
 * TODO: apply this to 1-1 edges too. E.g., `deck->genOwner`
 */
export default function modelGenMemo<T extends Object, X extends T | null>(
  dbname: string,
  tablish: string,
  gen: (id: ID_of<T>) => Promise<X>
) {
  const priorHandles: Map<string, Promise<X>> = new Map();
  return async (id: ID_of<T>) => {
    const priorHandle = priorHandles.get(id);
    if (priorHandle) {
      return priorHandle;
    }
    const existing = config.cache.get(id as ID_of<T>, dbname, tablish);
    if (existing != null) {
      return existing;
    }
    const currentHandle = gen(id);
    priorHandles.set(id, currentHandle);
    currentHandle.finally(() => priorHandles.delete(id));
    return currentHandle;
  };
}
