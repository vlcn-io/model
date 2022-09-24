/**
 * Persisted models add themselves to the tracker at the end of a transaction.
 *
 * The persist tracker schedules a task for the next tick to persist the accumulated data.
 * Next tick works since transaction commit _must_ always complete in a single tick.
 * Or if users do a bunch of transactions in a single tick, might was well collapse and persist all at once on next tick.
 *
 * Deletes, Creates, Updates are registered.
 *
 * Hydrates are not since hydrate events _come_ from the persistence layer itself.
 *
 * If we do post-facto relational, we can ignore having to await writes? And do the queue thing on read?
 * Post-facto relational lets people encode edges directly via pointer.
 */

import { invariant } from "@vulcan.sh/util";
import { PersistedModel } from "./PersistedModel";

export type Listener = (
  pendingCreates: ModelSet,
  pendingUpdates: ModelSet,
  pendingDeletes: ModelSet
) => void;

type ModelSet = Set<PersistedModel<any>>;
class PersistTracker {
  // instead collect all events
  // in a list.
  // then collapse them
  // and incr causal length on create + deletes to figure out
  // final state (created or deleted) of a thing
  // #pendingEvents: [PersistedModel<any>, "create" | "update" | "delete"][] = [];

  #pendingCreates = new Set<PersistedModel<any>>();
  #pendingUpdates = new Set<PersistedModel<any>>();
  #pendingDeletes = new Set<PersistedModel<any>>();
  #listeners = new Set<Listener>();

  #hasPendingMicroTask = false;

  constructor() {}

  onBatchReady() {}

  addCreate(m: PersistedModel<any>) {
    this.#pendingCreates.add(m);

    // if someone is creating after deleting, cancel the delete
    this.#pendingDeletes.delete(m);
    // create includes update
    this.#pendingUpdates.delete(m);

    this.#maybeQueueMicroTask();
  }

  addUpdate(m: PersistedModel<any>) {
    if (this.#pendingCreates.has(m)) {
      // create event will capture update data too -- in current implementation
      return;
    }

    invariant(
      !this.#pendingDeletes.has(m),
      "Updating something after it was requested to be deleted"
    );

    this.#pendingUpdates.add(m);
    this.#maybeQueueMicroTask();
  }

  addDelete(m: PersistedModel<any>) {
    this.#pendingDeletes.add(m);

    this.#pendingCreates.delete(m);
    this.#pendingUpdates.delete(m);

    this.#maybeQueueMicroTask();
  }

  /**
   * If no micro task is pending, enqueues one to save off all pending creates/update/deletes
   */
  #maybeQueueMicroTask() {
    if (this.#hasPendingMicroTask) {
      return;
    }

    queueMicrotask(() => {
      const [pendingCreates, pendingUpdates, pendingDeletes] = [
        this.#pendingCreates,
        this.#pendingUpdates,
        this.#pendingDeletes,
      ];
      this.#pendingCreates = new Set();
      this.#pendingUpdates = new Set();
      this.#pendingDeletes = new Set();

      this.#hasPendingMicroTask = false;
      this.#notifyBackends(pendingCreates, pendingUpdates, pendingDeletes);
    });
    this.#hasPendingMicroTask = true;
  }

  #notifyBackends(
    pendingCreates: ModelSet,
    pendingUpdates: ModelSet,
    pendingDeletes: ModelSet
  ) {
    for (const l of this.#listeners) {
      try {
        l(pendingCreates, pendingUpdates, pendingDeletes);
      } catch (e) {
        // one backend failing shouldn't prevent telling other backends
        console.error(e);
      }
    }
  }
}

export const persistTracker = new PersistTracker();

/**
 * Post facto:
 *
 * tx(() => {
 *   foo = Foo.create({});
 *   bar = Bar.create({foo});
 * });
 *
 * When persisting fields that are models, we encode their id
 *
 * Well.. if someone queries them do they want the full graph? Or just partial? :|
 * The API is different on optimistic write vs load.
 *
 * If full DS in mem, then no issue.
 *
 * So back to regular Aphrodite with field edges based on id?
 * Should be fine given direct links are resolvable from cache.
 * FK and JX edges are not resolvable from cache with total confidence. There could always be something extra.
 *
 * So we need to return a wait handle from the tx.
 * TX override for persisted model module?
 *
 * This override captures the handle from the tracker as soon as normal tx concludes?
 *
 * Certain types should be able to debounce their persist events? So a promise to the debouncer.
 * Or should the `tx` allow a `debounce` param? It'd need a debounce key then too.
 * If single model the key is the model id.
 *
 * If a manual tx then the key is user provided?
 */
