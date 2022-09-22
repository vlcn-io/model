export default class Table {}

/**
 * Tables need an operation based implementation?
 * for creates and deletes.
 *
 * On create of a relational model we need to:
 * 1. tell the relation we created a thing
 * 2. store the created thing in tx buffer
 *
 * When reading/querying we need to:
 * 1. query the table
 * 2. query the table in the tx buffer if it exists
 * 3. concat the results
 * 4. apply further filters after
 *
 * I.e., base table + tx table (WAL) are unioned.
 *
 * Well... if the WAL has _deletes_ we need to retract those from the base table.
 *
 * So it isn't quite a union.
 *
 * We need a "unified" interface that combines TX memory + Base memory.
 *
 * TX memory holds [delete, id][] and/or [create, model][] operations for a given collection.
 *
 * A commit of the tx writes these ops to the base tables.
 */
