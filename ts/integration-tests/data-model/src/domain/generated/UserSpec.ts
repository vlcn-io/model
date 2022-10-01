// SIGNED-SOURCE: <13397690d2362cf18cfc12cd2be79abf>
/**
 * AUTO-GENERATED FILE
 * Do not modify. Update your schema and re-generate for changes.
 */
import { Context } from "@vulcan.sh/runtime";
import { decodeModelData } from "@vulcan.sh/runtime";
import { encodeModelData } from "@vulcan.sh/runtime";
import { ID_of } from "@vulcan.sh/runtime";
import { NodeSpecWithCreate } from "@vulcan.sh/runtime";
import User from "../User.js";
import { Data } from "./UserBase.js";

const fields = {
  id: {
    encoding: "none",
  },
  name: {
    encoding: "none",
  },
  created: {
    encoding: "none",
  },
  modified: {
    encoding: "none",
  },
} as const;
const UserSpec: NodeSpecWithCreate<User, Data> = {
  type: "node",
  createFrom(ctx: Context, data: Data, raw: boolean = true) {
    const existing = ctx.cache.get(data["id"], "test", "user");
    if (existing) {
      return existing;
    }
    if (raw) data = decodeModelData(data, fields);
    const result = new User(ctx, data);
    ctx.cache.set(data["id"], result, "test", "user");
    return result;
  },

  primaryKey: "id",

  storage: {
    engine: "sqlite",
    db: "test",
    type: "sql",
    tablish: "user",
  },

  fields,

  outboundEdges: {},
};

export default UserSpec;
