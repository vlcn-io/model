// SIGNED-SOURCE: <ce85f5bbae5f8300beea040e6c34ad4c>
/**
 * AUTO-GENERATED FILE
 * Do not modify. Update your schema and re-generate for changes.
 */
import { PersistedModel } from "@vulcan.sh/runtime";
import { AsyncPersistedModel } from "@vulcan.sh/runtime";
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

  hydrate(data: Data) {
    return PersistedModel.hydrate(User, data);
  },

  create(data: Data) {
    return AsyncPersistedModel.createOrUpdate(User, data);
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
