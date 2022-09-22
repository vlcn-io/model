/**
 * Like ObservableValue but understand why it was created:
 * - hydration
 * - actual new object
 *
 * This distinction is important since we don't want to create persist events for things
 * that were hydrated from storage.
 */
