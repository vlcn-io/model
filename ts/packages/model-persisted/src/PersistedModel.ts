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
import persistor from "./persistor.js";

type Cause = "create" | "hydrate" | "sync";

export type BasePersistedModelData = { id: ID_of<any> };

export interface IPersistedModel<T extends BasePersistedModelData>
  extends IModel<T> {
  get id(): ID_of<T>;

  // delete(): Promise<void> | void;
  // update(): Promise<void> | void;
}

export abstract class PersistedModel<T extends BasePersistedModelData>
  extends Model<T>
  implements IPersistedModel<T>
{
  abstract readonly dbName: string;
  abstract readonly typeName: string;

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

    // stick into cache on construct
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

  protected onTransactionComplete(e: Event) {
    if (e === "delete") {
      // remove from cache
    }
  }

  static async create<
    D extends BasePersistedModelData,
    M extends IPersistedModel<D>
  >(ctor: (data: D | Omit<D, "id">) => M, data: D): Promise<M> {
    // assert cache consistency first!!!
    const model = ctor(data);
    // TODO: evalulate privacy policy in app layer? if we go that route.
    cache.add(model);
    await persistor.create(model);
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
  }

  delete(): Promise<void> {
    // TODO: notify cache
    // issue delete operation to persist layer
    // but we need to fold this into the current tx
    cache.remove(this);
    return persistor.delete(this);
  }

  static hydrate<
    D extends BasePersistedModelData,
    M extends IPersistedModel<D>
  >(
    ctor: (data: D) => M, // add dbName and typeName props to ctor
    data: D
  ): M {
    const existing = cache.get(data.id);
    if (existing) {
      cache.assertConsistent(existing, data);
      return existing as M;
    }

    const model = ctor(data);
    // TODO: evalulate privacy policy in app layer? if we go that route.
    cache.add(model);
    return model;
  }
}
