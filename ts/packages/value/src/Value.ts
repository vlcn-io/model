import { History } from "./History.js";
import { memory, MemoryVersion } from "./memory.js";
import { PSD } from "@vulcan.sh/context-provider";
import { Transaction } from "./transaction.js";

export type Event = "create" | "update" | "delete";

export interface IValue<T> {
  val: T;

  __commit(data: T, e: Event): void;
  __transactionComplete(e: Event): void;
}

/**
 * Value is the primitive building block to creating ACI memory. Value can hold anything.
 * If you put complex types into value those types should be immutable.
 */
export class Value<T> implements IValue<T> {
  private history: History<T> = new History();
  private memVers: MemoryVersion;
  constructor(private data: T, memVers?: MemoryVersion) {
    this.memVers = memVers === undefined ? memory.nextVersion() : memVers;
  }

  /**
   * Reads the current value. If a transaction is provided this method will return
   * the value as seen through transaction isolation.
   * @param tx
   * @returns
   */
  get val(): T {
    // TODO:
    // @ts-ignore
    const tx = PSD.tx as Transaction;
    if (!tx) {
      return this.data;
    }

    const v = tx.touched.get(this);
    if (v != null) {
      if (v[0] === "delete") {
        console.warn("Reading a deleted value");
        throw new Error("Reading a deleted value");
      }
      return v[1];
    }

    // Now check based on memory version.
    if (this.memVers <= tx.memoryVersion) {
      // data is the latest data for this value.
      // if the latest data for the value is not newer than when
      // the transaction started then the transaction can receive it.
      return this.data;
    }

    // if the latest data is newer than the transaction then someone wrote
    // the value while the transaction was running.
    // To preserve tx isolation we must go back into history to
    // return the value that was set when the current tx started
    return this.history.at(tx.memoryVersion);
  }

  /**
   * Sets the value. If a transaction is not provided the value
   * is set and committed. If a transaction is provided, the value is only
   * set from the perspective of that transaction. Once the transaction
   * is committed the value will be visible outside the transaction.
   * @param data
   * @param tx
   * @returns
   */
  set val(data: T) {
    // @ts-ignore
    const tx = PSD.tx as Transaction;
    if (!tx) {
      if (this.data === data) {
        return;
      }
      this.__commit(data);
      this.__transactionComplete("update");
      return;
    }

    // even if it is the same we must register a touch
    // so we can check for conflicts.
    // i.e., a competing transaction could have set it to the same
    // value.
    tx.touch(this, "update", data);
  }

  /**
   * Commit the change. Should only be called by
   * transaction logic and not end users.
   *
   */
  __commit(data: T): void {
    this.history.maybeAdd(this.data, this.memVers);
    this.data = data;
    this.memVers = memory.nextVersion();
  }

  __transactionComplete(e: Event): void {}

  /**
   * Since transaction mutations are written to the transaction object and not to the value prior to commit,
   * we don't have to do anything to roll back a value.
   */
  // rollback(data: T, tx: Transaction): void {}
}

export function value<T>(data: T): IValue<T> {
  const ret = new Value(data);
  // @ts-ignore
  const tx = PSD.tx as Transaction;
  if (tx) {
    tx.touch(ret, "create", data);
  } else {
    ret.__transactionComplete("create");
  }

  return ret;
}
