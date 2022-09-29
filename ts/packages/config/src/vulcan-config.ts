import Cache from "@vulcan.sh/cache";
import { SQLQuery } from "@vulcan.sh/sql";

export type StorageEngine = "memory" | "sqlite";

export type ResolvedDB = SQLResolvedDB | MemoryResolvedDB;

export type MemoryReadQuery = {
  type: "read";
  tablish: string;
  // undefined --> all
  // [] --> none
  // [id, ...]  --> specific ids
  roots?: any[];
};

export type MemoryWriteQuery = {
  type: "write";
  op: "delete" | "upsert";
  tablish: string;
  models: { id: any }[];
};

export type MemoryQuery = MemoryReadQuery | MemoryWriteQuery;

export type MemoryResolvedDB = {
  read(q: MemoryReadQuery): Promise<any[]>;
  write(q: MemoryWriteQuery): Promise<void>;
  transact<T>(cb: (conn: MemoryResolvedDB) => Promise<T>): Promise<T>;
  dispose(): void;
};

export type SQLResolvedDB = {
  read(q: SQLQuery): Promise<any[]>;
  write(q: SQLQuery): Promise<void>;
  transact<T>(cb: (conn: SQLResolvedDB) => Promise<T>): Promise<T>;
  dispose(): void;
};

export type Config = {
  storage(engine: string, dbName: string): ResolvedDB;
  readonly cache: Cache;
};

let _config: Config | null = null;

export default {
  init(config: Config) {
    if (_config != null) {
      if (_config != config) {
        throw new Error(
          "Attempt to reset config to a new value after it was already set"
        );
      }
      return;
    }
    _config = config;
  },

  get config(): Config {
    return _config!;
  },
};
