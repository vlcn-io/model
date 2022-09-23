// A value that provides hooks into its life cycle (pre-commit, commit) so we can
// build triggers and observers.
// Triggers being run pre-commit
// Observers being run post-commit
import { IValue, Value } from "./Value.js";
import { PSD } from "@vulcan.sh/context-provider";

type OnTxComplete<T> = (v: T) => void;
type Disposer = () => void;

export interface IObservableValue<T> extends IValue<T> {
  onTransactionComplete(fn: (v: T) => void): Disposer;
}

class ObservableValue<T> extends Value<T> implements IObservableValue<T> {
  #observers: Set<(v: T) => void> = new Set();

  onTransactionComplete(fn: OnTxComplete<T>): Disposer {
    this.#observers.add(fn);
    return () => this.#observers.delete(fn);
  }

  __transactionComplete() {
    this.#notifyObservers();
  }

  #notifyObservers() {
    for (const o of this.#observers) {
      try {
        o(this.get());
      } catch (e) {
        console.error(e);
      }
    }
  }
}

// take mem version as optional...? for re-hydrate case?
export function observableValue<T>(data: T): [IObservableValue<T>, boolean] {
  const ret = new ObservableValue(data);

  // @ts-ignore
  const tx = PSD.tx;
  let txComplete = false;
  if (tx) {
    tx.touched.set(ret, data);
  } else {
    // we're not inside a running tx? then the tx is the create and is done.
    txComplete = true;
    ret.__transactionComplete();
  }

  // we return a bool indicating if the tx is complete.
  // We do this so references to objects still being constructed do not escape.
  // e.g., it is common to create an observable value within the constructor of another object.
  // if the transaction completes during that object's construction, that object can be called back before
  // it's construction is complete.
  // if the object does not add a listener until the end of its construction in order to avoid this problem,
  // it can miss the transactionComplete callback.
  return [ret, txComplete];
}
