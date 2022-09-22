/**
 * Persisted models add themselves to the tracker at the end of a transaction.
 *
 * The persist tracker schedules a task for the next tick to persist the accumulated data.
 * Next tick works since transaction commit _must_ always complete in a single tick.
 *
 * Deletes, Creates, Updates are registered.
 *
 * Hydrates are not since hydrate events _come_ from the persistence layer itself.
 *
 * If we do post-facto relational, we can ignore having to await writes? And do the queue thing on read?
 * Post-facto relational lets people encode edges directly via pointer.
 */
