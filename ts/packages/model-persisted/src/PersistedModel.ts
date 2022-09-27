import { Model } from "@vulcan.sh/model";
import { ID_of, newId } from "@vulcan.sh/id";
import { config } from "./config.js";
import {
  Event,
  hydratePersistedValue_UNSAFE,
  IObservableValue,
  newPersistedValue_UNSAFE,
} from "@vulcan.sh/value";

type Cause = "create" | "hydrate" | "sync";

export abstract class PersistedModel<
  T extends { id: ID_of<T> }
> extends Model<T> {
  abstract readonly dbName: string;
  abstract readonly typeName: string;

  constructor(data: T | Omit<T, "id">, private cause: Cause) {
    if (!("id" in data)) {
      // @ts-ignore
      super({
        id: newId(config.deviceId),
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

    return [hydratePersistedValue_UNSAFE(frozen), false];
  }

  protected onTransactionComplete(e: Event) {}

  delete() {
    // TODO: notify cache
    // issue delete operation to persist layer
    // but we need to fold this into the current tx
  }

  /*
  // TODO: notify cache w/ cause

  static create<D, M extends IModel<D>>(ctor: (data: D) => M) {
    // registers with persist tracker... well... post commit it does.
    // so we need to listen for __transactionComplete

    // on tx complete of a create should issue a create operation to persist layer
  }

  static hydrate<D, M extends IModel<D>>(ctor: (data: D) => M) {
    // no need to do anything on tx complete of a hydrate
  }

  // on tx complete of an update would issue an update operation to persist layer
  */
}
