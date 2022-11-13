// SIGNED-SOURCE: <23a5b5be739eda7ec6413bbca9e02d02>
/**
 * AUTO-GENERATED FILE
 * Do not modify. Update your schema and re-generate for changes.
 */
import User from "../User.js";
import { default as s } from "./UserSpec.js";
import { P } from "@vlcn.io/runtime";
import { modelGenMemo } from "@vlcn.io/runtime";
import { AsyncPersistedModel } from "@vlcn.io/runtime";
import { INode } from "@vlcn.io/runtime";
import { NodeSpecWithCreate } from "@vlcn.io/runtime";
import { ID_of } from "@vlcn.io/runtime";
import UserQuery from "./UserQuery.js";

export type Data = {
  id: ID_of<User>;
  name: string;
  created: number;
  modified: number;
};

// @Sealed(User)
export default abstract class UserBase
  extends AsyncPersistedModel<Data>
  implements INode<Data>
{
  readonly spec = s as unknown as NodeSpecWithCreate<this, Data>;

  get id(): ID_of<this> {
    return this.data.id as unknown as ID_of<this>;
  }

  get name(): string {
    return this.data.name;
  }

  get created(): number {
    return this.data.created;
  }

  get modified(): number {
    return this.data.modified;
  }

  static queryAll(): UserQuery {
    return UserQuery.create();
  }

  static genx = modelGenMemo(
    "test",
    "user",
    (id: ID_of<User>): Promise<User> =>
      this.queryAll().whereId(P.equals(id)).genxOnlyValue()
  );

  static gen = modelGenMemo<User, User | null>(
    "test",
    "user",
    (id: ID_of<User>): Promise<User | null> =>
      this.queryAll().whereId(P.equals(id)).genOnlyValue()
  );

  static create(data: Data) {
    return User.spec.create(data);
  }
}
