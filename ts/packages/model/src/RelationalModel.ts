import { nanoid } from "nanoid";
import { Model } from "./Model.js";

type Key = string | number;

export abstract class RelationalModel<T extends { id: Key }> extends Model<T> {
  constructor(data: T | Omit<T, "id">) {
    if (!("id" in data)) {
      // @ts-ignore
      super({
        id: nanoid(),
        ...data,
      });
    } else {
      super(data);
    }
  }

  abstract readonly collection: string;
}

/**
 * Are collections values too?
 * If so they'd need immutability :/
 *
 * The other option is to support explicit rollback...
 * but then that breaks isolation.
 */
