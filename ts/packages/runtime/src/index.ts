import { DBResolver, SQLResolvedDB } from "@vlcn.io/config";

export * from "@vlcn.io/config";
export * from "@vlcn.io/model-persisted";
export * from "@vlcn.io/query";
export * from "@vlcn.io/id";
export * from "@vlcn.io/migration";
export { newId } from "@vlcn.io/id";
export { default as Cache } from "@vlcn.io/cache";
export * from "@vlcn.io/sql";

export function basicSqliteResolver(
  dbName: string,
  connection: SQLResolvedDB
): DBResolver {
  return {
    storage: (engine, db) => {
      if (engine !== "sqlite") {
        throw new Error(
          "Tried getting a sqlite connection while specifying engine " + engine
        );
      }
      if (db !== dbName) {
        throw new Error(
          "Tried getting db named " + db + " but we only know about " + dbName
        );
      }
      return connection;
    },
  };
}
