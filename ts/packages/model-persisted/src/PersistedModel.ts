import { IModel, Model } from "@vlcn.io/model";
import { ID_of, newId, uuidv7 } from "@vlcn.io/id";
import {
  Event,
  hydratePersistedValue_UNSAFE,
  IObservableValue,
  newPersistedValue_UNSAFE,
} from "@vlcn.io/value";
import { invariant } from "@vlcn.io/util";
import { syncPersistor, asyncPersistor } from "./persistor.js";
import { NodeSpec, JunctionEdgeSpec } from "@vlcn.io/schema-api";
import { BasePersistedModelData, INode, ModelSpecWithCreate } from "./spec.js";
import { config } from "@vlcn.io/config";

type Cause = "create" | "hydrate" | "sync";

export interface IPersistedModel<T extends BasePersistedModelData>
  extends IModel<T> {
  readonly spec: NodeSpec | JunctionEdgeSpec;
}

export interface IPersistedModelCtor<
  D extends BasePersistedModelData,
  M extends IPersistedModel<D>
> {
  new (data: D | Omit<D, "id">, cause: Cause): M;
  readonly spec: ModelSpecWithCreate<M, D>;
}

export abstract class PersistedModel<T extends BasePersistedModelData>
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
    const existing = config.cache.get(
      data.id,
      ctor.spec.storage.db,
      ctor.spec.storage.tablish
    );
    // TODO: could be inconsistent due to sync ops and race
    // with publish to cache...
    if (existing) {
      // config.cache.assertConsistent(existing.data, data);
      return existing as M;
    }

    // if (raw) data = decodeModelData(data, fields);

    const model = new ctor(data, "hydrate");
    config.cache.set(
      data.id,
      model,
      ctor.spec.storage.db,
      ctor.spec.storage.tablish
    );
    return model;
  }
}

export function pullId(ctor: IPersistedModelCtor<any, any>, data: any) {
  // TODO: ideally grab primary key from spec
  switch (ctor.spec.type) {
    case "node":
      return (data as any).id;
    case "junction":
      return (data as any).id1 + "-" + (data as any).id2;
  }
}
