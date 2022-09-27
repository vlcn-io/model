// A value that provides hooks into its life cycle (pre-commit, commit) so we can
// build triggers and observers.
// Triggers being run pre-commit
// Observers being run post-commit
import { Event, IValue, Value } from "./Value.js";
import { PSD } from "@vulcan.sh/context-provider";
import { Transaction } from "./transaction.js";

type OnTxComplete<T> = (v: T, e: Event) => void;
type Disposer = () => void;

export interface IObservableValue<T> extends IValue<T> {
  onTransactionComplete(fn: OnTxComplete<T>): Disposer;
  // TODO: add an `onValueChange` that filters events if the value was set to the same value?
}

export class ObservableValue<T>
  extends Value<T>
  implements IObservableValue<T>
{
  #observers: Set<(v: T, e: Event) => void> = new Set();

  onTransactionComplete(fn: OnTxComplete<T>): Disposer {
    this.#observers.add(fn);
    return () => this.#observers.delete(fn);
  }

  __transactionComplete(e: Event) {
    this.#notifyObservers(e);
  }

  #notifyObservers(e: Event) {
    for (const o of this.#observers) {
      try {
        o(this.val, e);
      } catch (e) {
        console.error(e);
      }
    }
  }
}

export function observableValue<T>(data: T): [IObservableValue<T>, boolean] {
  const ret = new ObservableValue(data);

  // @ts-ignore
  const tx = PSD.tx as Transaction;
  let txComplete = false;
  if (tx) {
    tx.touch(ret, "create", data);
  } else {
    // we're not inside a running tx? then the tx is the create and is done.
    txComplete = true;
    ret.__transactionComplete("create");
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
