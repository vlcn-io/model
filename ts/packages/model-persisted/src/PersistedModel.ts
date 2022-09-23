import { Model } from "@vulcan.sh/model";
import { ID_of, newId } from "@vulcan.sh/id";
import { config } from "./config.js";

export abstract class PersistedModel<
  T extends { id: ID_of<T> }
> extends Model<T> {
  abstract readonly dbName: string;
  abstract readonly typeName: string;

  constructor(data: T | Omit<T, "id">) {
    if (!("id" in data)) {
      // @ts-ignore
      super({
        id: newId(config.deviceId),
        ...data,
      });
    } else {
      super(data);
    }

    // TODO: we need to override value construction so we can use `PersistedValue` and indicate the source
    // of creation.
  }

  get id(): ID_of<T> {
    return this.value.get().id;
  }

  protected onTransactionComplete() {
    // pass off to persist tracker.
    // how do we know the kind of event?
    // well... tx events should not fire for hydrates?
    // so push concept of hydrate into value?
  }

  delete() {
    // issue delete operation to persist layer
    // but we need to fold this into the current tx
  }

  /*
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
