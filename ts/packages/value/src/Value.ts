export type Transaction = {
  readonly touched: Map<IValue<any>, any>;
  readonly memoryVersion: MemoryVersion;
};

export interface IValue<T> {
  get(tx?: Transaction): T;
  set(data: T, tx?: Transaction): void;

  __commit(data: T): void;
}

let memoryVersion: MemoryVersion = Number.MIN_SAFE_INTEGER;
type MemoryVersion = number;

function nextVersion(): MemoryVersion {
  return ++memoryVersion;
}

/**
 * Value is the primitive building block to creating ACI memory. Value can hold anything.
 * If you put complex types into value those types should be immutable.
 */
export class Value<T> implements IValue<T> {
  public readonly symbol = Symbol();
  constructor(private data: T, private memVers: MemoryVersion) {}

  /**
   * Reads the current value. If a transaction is provided this method will return
   * the value as seen through transaction isolation.
   * @param tx
   * @returns
   */
  get(tx?: Transaction): T {
    if (!tx) {
      return this.data;
    }

    if (tx.touched.has(this)) {
      return tx.touched.get(this);
    }

    // Now check based on memory version.

    return this.data;
  }

  /**
   * Sets the value. If a transaction is not provided the value
   * is set and committed. If a transaction is provided, the value is only
   * set from the perspective of that transaction. Once the transaction
   * is committed the value will be visible to all transactions.
   * @param data
   * @param tx
   * @returns
   */
  set(data: T, tx?: Transaction): void {
    if (!tx) {
      this.__commit(data);
      return;
    }

    tx.touched.set(this, data);
  }

  /**
   * Commit the change. Should only be called by
   * transaction logic and not end users.
   */
  __commit(data: T): void {
    this.data = data;
    this.memVers = nextVersion();
  }

  /**
   * Since transaction mutations are written to the transaction object and not to the value prior to commit,
   * we don't have to do anything to roll back a value.
   */
  // rollback(data: T, tx: Transaction): void {}
}

export function value<T>(data: T) {
  return new Value(data, nextVersion());
}

export function transaction(): Transaction {
  return {
    memoryVersion,
    touched: new Map(),
  };
}

// TODO: read up on how sqlite provides guarantees:
// https://www.sqlite.org/lang_transaction.html
