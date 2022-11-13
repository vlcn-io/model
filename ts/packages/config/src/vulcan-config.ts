import Cache from "@vlcn.io/cache";
import { SQLQuery } from "@vlcn.io/sql";

export type StorageEngine = "ephemeral" | "memory" | "sqlite";

export type DBResolver = {
  storage(engine: StorageEngine, dbName: string): ResolvedDB;
};

export type ResolvedDB = AsyncResolvedDB | SyncResolvedDB;
export type AsyncResolvedDB = SQLResolvedDB;
export type SyncResolvedDB = MemoryResolvedDB;

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
  read(q: MemoryReadQuery): any[];
  write(q: MemoryWriteQuery): void;
  dispose(): void;

  begin(): void;
  commit(): void;
  rollback(): void;
};

export type SQLResolvedDB = {
  read(q: SQLQuery): Promise<any[]>;
  write(q: SQLQuery): Promise<void>;
  dispose(): void;

  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
};

export type Config = {
  storage(engine: StorageEngine, dbName: string): ResolvedDB;
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
