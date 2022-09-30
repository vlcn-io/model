import { DBResolver, SQLResolvedDB } from "@vulcan.sh/config";

export * from "@vulcan.sh/config";
export * from "@vulcan.sh/model-persisted";
export * from "@vulcan.sh/query";
export * from "@vulcan.sh/id";
export * from "@vulcan.sh/migration";
export { newId } from "@vulcan.sh/id";
export { default as Cache } from "@vulcan.sh/cache";
export * from "@vulcan.sh/sql";

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
