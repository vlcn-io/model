import { Key, RelationalModel } from "./RelationalModel.js";

export type MemoryReadQuery = {
  type: "read";
  collection: string;
  // undefined --> all
  // [] --> none
  // [id, ...]  --> specific ids
  roots?: Key[];
};

export type MemoryWriteQuery = {
  type: "write";
  op: "delete" | "upsert";
  collection: string;
  models: RelationalModel<any>[];
};

export type MemoryQuery = MemoryReadQuery | MemoryWriteQuery;

/**
 * Holds all in-memory nodes in-memory.
 */
export default class MemoryDB {
  private collections: Map<string, { [key: Key]: any }> = new Map();

  async read(q: MemoryReadQuery): Promise<any[]> {
    const collection = this.collections.get(q.collection);
    if (collection == null) {
      return [];
    }

    if (q.roots == null) {
      return Object.values(collection);
    }

    return q.roots.map((r) => collection[r]);
  }

  async write(q: MemoryWriteQuery): Promise<void> {
    const c = this.collections.get(q.collection);
    let collection: { [key: Key]: any };
    // To make the type checker happy
    if (c == null) {
      collection = {};
      this.collections.set(q.collection, collection);
    } else {
      collection = c;
    }

    switch (q.op) {
      case "delete":
        q.models.forEach((m) => delete collection[m.id]);
      case "upsert":
        q.models.forEach((m) => (collection[m.id] = m));
    }
  }

  dispose(): void {
    this.collections = new Map();
  }
}
