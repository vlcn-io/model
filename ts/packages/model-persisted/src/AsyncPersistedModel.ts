import { config } from "@vlcn.io/config";
import { ID_of } from "@vlcn.io/id";
import {
  IPersistedModel,
  IPersistedModelCtor,
  PersistedModel,
  pullId,
} from "./PersistedModel.js";
import { asyncPersistor } from "./persistor.js";
import { BasePersistedModelData } from "./spec.js";

export abstract class AsyncPersistedModel<
  T extends BasePersistedModelData
> extends PersistedModel<T> {
  static async createOrUpdate<
    D extends BasePersistedModelData,
    M extends IPersistedModel<D>
  >(ctor: IPersistedModelCtor<D, M>, data: D | Omit<D, "id">): Promise<M> {
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
      await existing.update(data as D);
      return existing;
    }

    const model = new ctor(data, "create");
    config.cache.set(
      id,
      model,
      ctor.spec.storage.db,
      ctor.spec.storage.tablish
    );

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
