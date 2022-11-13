import { observableValue, IObservableValue, Event } from "@vlcn.io/value";

export interface IModel<T extends {} = {}> {
  update(updates: Partial<T>): void;
  subscribe(c: () => void): () => void;
  subscribeTo(keys: (keyof T)[], c: () => void): () => void;

  readonly data: T;
}

export class Model<T extends {}> implements IModel<T> {
  protected value: IObservableValue<T>;
  #lastData: T;

  // TODO: make these weak references?
  #subscriptions: Set<() => void> = new Set();
  #keyedSubscriptions: Map<keyof T, Set<() => void>> = new Map();

  protected disposers: (() => void)[] = [];

  constructor(data: T) {
    const frozen = Object.freeze(data);
    let txComplete = false;
    [this.value, txComplete] = this.constructValue(frozen);
    this.#lastData = frozen;

    this.disposers.push(
      this.value.onTransactionComplete(this.#onTransactionComplete)
    );

    if (txComplete) {
      this.onTransactionComplete("create");
    }
  }

  get data(): T {
    return this.value.val;
  }

  protected constructValue(frozen: T): [IObservableValue<T>, boolean] {
    return observableValue(frozen);
  }
  protected onTransactionComplete(e: Event) {}

  #onTransactionComplete = (data: T, e: Event) => {
    this.onTransactionComplete(e);

    const lastData = this.#lastData;
    this.#lastData = data;

    if (this.#keyedSubscriptions.size === 0 && this.#subscriptions.size === 0) {
      return;
    }

    const toNotify = new Set<() => void>(this.#subscriptions);
    if (this.#keyedSubscriptions.size > 0) {
      this.#gatherKeyedNotifications(toNotify, lastData, data);
    }

    this.#notify(toNotify);
  };

  #gatherKeyedNotifications(
    toNotify: Set<() => void>,
    lastData: T,
    newData: T
  ) {
    let unchangedKeys = new Set();
    if (newData != null) {
      (Object.entries(newData) as [keyof Partial<T>, any][]).forEach(
        (entry) => {
          if (lastData[entry[0]] === entry[1]) {
            unchangedKeys.add(entry[0]);
          }
        }
      );
    }

    const changedKeys =
      unchangedKeys.size === 0
        ? typedKeys(newData)
        : typedKeys(newData).filter((k) => !unchangedKeys.has(k));

    for (const key of changedKeys) {
      const subs = this.#keyedSubscriptions.get(key);
      if (subs) {
        for (const c of subs) {
          toNotify.add(c);
        }
      }
    }
  }

  #notify(toNotify: Set<() => void>) {
    for (const cb of toNotify) {
      // We notify in a try/catch since the failure of one observer should not preclude others
      // from observing the change.
      try {
        cb();
      } catch (e) {
        console.error(e);
      }
    }
  }

  protected isNoop(updates: Partial<T>): boolean {
    return (Object.entries(updates) as [keyof Partial<T>, any][]).every(
      (entry) => this.data[entry[0]] === entry[1]
    );
  }

  update(updates: Partial<T>): void {
    if (this.isNoop(updates)) {
      return;
    }

    this.value.val = Object.freeze({
      ...this.value.val,
      ...updates,
    });
  }

  subscribe(c: () => void): () => void {
    this.#subscriptions.add(c);
    return () => this.#subscriptions.delete(c);
  }

  subscribeTo(keys: (keyof T)[], c: () => void): () => void {
    keys.forEach((k) => {
      let subs = this.#keyedSubscriptions.get(k);
      if (subs == null) {
        subs = new Set();
        this.#keyedSubscriptions.set(k, subs);
      }

      subs.add(c);
    });

    return () =>
      keys.forEach((k) => this.#keyedSubscriptions.get(k)?.delete(c));
  }
}

function typedKeys<T>(o: T): (keyof T)[] {
  // @ts-ignore
  return Object.keys(o);
}
