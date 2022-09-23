import { History } from "./History.js";
import { memory } from "./memory.js";
import { PSD } from "@vulcan.sh/context-provider";
import { Transaction } from "./transaction.js";

export type Event = "create" | "update";

export interface IValue<T> {
  get(): T;
  set(data: T): void;

  __commit(data: T): void;
  __transactionComplete(e: Event): void;
}

/**
 * Value is the primitive building block to creating ACI memory. Value can hold anything.
 * If you put complex types into value those types should be immutable.
 */
export class Value<T> implements IValue<T> {
  private history: History<T> = new History();
  private memVers = memory.nextVersion();
  constructor(private data: T) {}

  /**
   * Reads the current value. If a transaction is provided this method will return
   * the value as seen through transaction isolation.
   * @param tx
   * @returns
   */
  get(): T {
    // TODO:
    // @ts-ignore
    const tx = PSD.tx as Transaction;
    if (!tx) {
      return this.data;
    }

    if (tx.created.has(this)) {
      return tx.created.get(this);
    }
    if (tx.updated.has(this)) {
      return tx.updated.get(this);
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
  set(data: T): void {
    if (this.data === data) {
      return;
    }

    // @ts-ignore
    const tx = PSD.tx as Transaction;
    if (!tx) {
      this.__commit(data);
      this.__transactionComplete("update");
      return;
    }

    if (tx.created.has(this)) {
      tx.created.set(this, data);
    } else {
      tx.updated.set(this, data);
    }
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
    tx.created.set(ret, data);
  } else {
    ret.__transactionComplete("create");
  }

  return ret;
}
