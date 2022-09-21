import { Key, Row } from "./Row.js";

export type MemoryReadQuery = {
  type: "read";
  tableName: string;
  // undefined --> all
  // [] --> none
  // [id, ...]  --> specific ids
  roots?: Key[];
};

export type MemoryWriteQuery = {
  type: "write";
  op: "delete" | "upsert";
  tableName: string;
  rows: Row<any>[];
};

export type MemoryQuery = MemoryReadQuery | MemoryWriteQuery;

/**
 * Holds all in-memory nodes in-memory.
 */
export default class MemoryDB {
  private tables: Map<string, { [key: Key]: any }> = new Map();

  async read(q: MemoryReadQuery): Promise<any[]> {
    const table = this.tables.get(q.tableName);
    if (table == null) {
      return [];
    }

    if (q.roots == null) {
      return Object.values(table);
    }

    return q.roots.map((r) => table[r]);
  }

  async write(q: MemoryWriteQuery): Promise<void> {
    const c = this.tables.get(q.tableName);
    let table: { [key: Key]: any };
    // To make the type checker happy
    if (c == null) {
      table = {};
      this.tables.set(q.tableName, table);
    } else {
      table = c;
    }

    switch (q.op) {
      case "delete":
        q.rows.forEach((m) => delete table[m.id]);
      case "upsert":
        q.rows.forEach((m) => (table[m.id] = m));
    }
  }

  dispose(): void {
    this.tables = new Map();
  }
}
