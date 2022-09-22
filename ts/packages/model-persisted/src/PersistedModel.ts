import { Model } from "@aphrodite.sh/model";
import { ID_of, newId } from "@aphrodite.sh/id";
import { config } from "./config.js";

export abstract class PersistedModel<
  T extends { id: ID_of<T> }
> extends Model<T> {
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
  }

  abstract readonly typeName: string;

  get id(): ID_of<T> {
    return this.value.get().id;
  }

  delete() {}
}
