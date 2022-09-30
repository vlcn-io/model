import { IModel, Model } from "@vulcan.sh/model";
import { ID_of, newId, uuidv7 } from "@vulcan.sh/id";
import {
  Event,
  hydratePersistedValue_UNSAFE,
  IObservableValue,
  newPersistedValue_UNSAFE,
} from "@vulcan.sh/value";
import { invariant } from "@vulcan.sh/util";
import cache from "./cache.js";
import { syncPersistor, asyncPersistor } from "./persistor.js";
import { NodeSpec, JunctionEdgeSpec } from "@vulcan.sh/schema-api";

type Cause = "create" | "hydrate" | "sync";

export type BasePersistedModelData = { id: ID_of<any> };

export interface IPersistedModel<T extends BasePersistedModelData>
  extends IModel<T> {
  get id(): ID_of<T>;
  readonly spec: NodeSpec | JunctionEdgeSpec;

  // delete(): Promise<void> | void;
  // update(): Promise<void> | void;
}

interface IPersistedModelCtor<
  D extends BasePersistedModelData,
  M extends IPersistedModel<D>
> {
  new (data: D | Omit<D, "id">, cause: Cause): M;
  readonly spec: NodeSpec | JunctionEdgeSpec;
}

abstract class PersistedModel<T extends BasePersistedModelData>
  extends Model<T>
  implements IPersistedModel<T>
{
  abstract readonly spec: NodeSpec | JunctionEdgeSpec;

  constructor(data: T | Omit<T, "id">, private cause: Cause) {
    if (!("id" in data)) {
      // @ts-ignore
      super({
        id: uuidv7(),
        ...data,
      });
    } else {
      super(data);
    }
  }

  get id(): ID_of<T> {
    return this.value.val.id;
  }

  protected constructValue(frozen: T): [IObservableValue<T>, boolean] {
    if (this.cause === "create") {
      return newPersistedValue_UNSAFE(frozen);
    }

    invariant(
      this.cause === "hydrate" || this.cause === "sync",
      "unexpected cause"
    );

    return [hydratePersistedValue_UNSAFE(frozen), false];
  }

  protected onTransactionComplete(e: Event) {}

  static hydrate<
    D extends BasePersistedModelData,
    M extends IPersistedModel<D>
  >(ctor: IPersistedModelCtor<D, M>, data: D): M {
    const existing = cache.get(
      ctor.spec.storage.db,
      ctor.spec.storage.tablish,
      data.id
    );
    if (existing) {
      cache.assertConsistent(existing, data);
      return existing as M;
    }

    const model = new ctor(data, "hydrate");
    cache.add(model);
    return model;
  }
}

/**
 * We have two types here -- sync and async -- depending on the storage backend
 * used.
 *
 * If the model is served by in-memory storage than all methods (create, update, delete) and queries to it
 * can be synchronous.
 *
 * Synchronous models may still have edges to asynchronous models. Those edge queries
 * will be async as their "color" is determined by the thing being fetched.
 */
export abstract class SyncPersistedModel<
  T extends BasePersistedModelData
> extends PersistedModel<T> {
  static create<D extends BasePersistedModelData, M extends IPersistedModel<D>>(
    ctor: IPersistedModelCtor<D, M>,
    data: D | Omit<D, "id">
  ): M {
    // TODO: assert cache consistency first!!!
    const model = new ctor(data, "create");
    cache.add(model);
    syncPersistor.create(model);
    return model;
  }

  update(updates: Partial<T>): void {
    if (this.isNoop(updates)) {
      return;
    }

    this.value.val = Object.freeze({
      ...this.value.val,
      ...updates,
    });

    syncPersistor.update(this);
  }

  delete(): void {
    // GC will evict from the cache as needed.
    // cache.remove(this);
    return syncPersistor.delete(this);
  }
}

export abstract class AsyncPersistedModel<
  T extends BasePersistedModelData
> extends PersistedModel<T> {
  static async create<
    D extends BasePersistedModelData,
    M extends IPersistedModel<D>
  >(ctor: IPersistedModelCtor<D, M>, data: D | Omit<D, "id">): Promise<M> {
    // TODO: assert cache consistency first!!!
    const model = new ctor(data, "create");
    cache.add(model);
    await asyncPersistor.create(model);
    return model;
  }

  // TODO: create, update, delete
  // need to assert that we're in the correct transaction type.
  // If we're not in a durable tx then we should upgrade it to durable.
  // and have the durable commit occur at the end
  // TODO: codegen `update`, `delete`, `create`
  // to be sync or async depending on backing storage.
  // in-memory models will be synchronous.
  async update(updates: Partial<T>): Promise<void> {
    if (this.isNoop(updates)) {
      return;
    }

    this.value.val = Object.freeze({
      ...this.value.val,
      ...updates,
    });

    return await asyncPersistor.update(this);
  }

  delete(): Promise<void> {
    // GC will evict from the cache as needed.
    // cache.remove(this);
    return asyncPersistor.delete(this);
  }
}
