import { config } from "@vlcn.io/config";
import { ID_of } from "@vlcn.io/id";
import {
  IPersistedModel,
  IPersistedModelCtor,
  PersistedModel,
  pullId,
} from "./PersistedModel.js";
import { syncPersistor } from "./persistor.js";
import { BasePersistedModelData } from "./spec.js";

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
  static createOrUpdate<
    D extends BasePersistedModelData,
    M extends IPersistedModel<D>
  >(ctor: IPersistedModelCtor<D, M>, data: D | Omit<D, "id">): M {
    const id = pullId(ctor, data) as ID_of<M>;

    const existing = config.cache.get(
      id,
      ctor.spec.storage.db,
      ctor.spec.storage.tablish
    );

    // we add to the cache regardless of transaction outcome --
    // so the thing could be in there from a failed tx.
    // update it to final state if so.
    if (existing) {
      existing.update(data as D);
      return existing;
    }

    // TODO: rename `create` to `upsert` to update rather than create
    // on conflict. In a replicated world we could issue a create
    // that should be an update.
    const model = new ctor(data, "create");
    config.cache.set(
      id,
      model,
      ctor.spec.storage.db,
      ctor.spec.storage.tablish
    );
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
