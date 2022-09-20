import { ObservableValue } from "@aphrodite.sh/value";

export interface IModel<T extends {} = {}> {
  update(updates: Partial<T>): void;
  subscribe(c: () => void): () => void;
  subscribeTo(keys: (keyof T)[], c: () => void): () => void;
}

export class Model<T extends {}> implements IModel<T> {
  #value: ObservableValue<T>;

  // make these weak references?
  #subscriptions: Set<() => void> = new Set();
  #keyedSubscriptions: Map<keyof T, Set<() => void>> = new Map();

  constructor(data: T) {
    this.#value = new ObservableValue(data);
  }

  update(updates: Partial<T>): void {
    this.#value.set({
      ...this.#value.get(),
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
