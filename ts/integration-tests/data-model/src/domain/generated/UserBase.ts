// SIGNED-SOURCE: <3921446b2397cb9e31b4c05af5272f22>
/**
 * AUTO-GENERATED FILE
 * Do not modify. Update your schema and re-generate for changes.
 */
import User from "../User.js";
import { default as s } from "./UserSpec.js";
import { P } from "@vulcan.sh/runtime";
import { UpdateMutationBuilder } from "@vulcan.sh/runtime";
import { CreateMutationBuilder } from "@vulcan.sh/runtime";
import { DeleteMutationBuilder } from "@vulcan.sh/runtime";
import { makeSavable } from "@vulcan.sh/runtime";
import { modelGenMemo } from "@vulcan.sh/runtime";
import { Node } from "@vulcan.sh/runtime";
import { NodeSpecWithCreate } from "@vulcan.sh/runtime";
import { ID_of } from "@vulcan.sh/runtime";
import UserQuery from "./UserQuery.js";
import { Context } from "@vulcan.sh/runtime";
import DeckQuery from "./DeckQuery.js";
import Deck from "../Deck.js";

export type Data = {
  id: ID_of<User>;
  name: string;
  created: number;
  modified: number;
};

// @Sealed(User)
export default abstract class UserBase extends Node<Data> {
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

  queryDecks(): DeckQuery {
    return DeckQuery.create(this.ctx).whereOwnerId(P.equals(this.id as any));
  }

  static queryAll(ctx: Context): UserQuery {
    return UserQuery.create(ctx);
  }

  static genx = modelGenMemo(
    "test",
    "user",
    (ctx: Context, id: ID_of<User>): Promise<User> =>
      this.queryAll(ctx).whereId(P.equals(id)).genxOnlyValue()
  );

  static gen = modelGenMemo<User, User | null>(
    "test",
    "user",
    (ctx: Context, id: ID_of<User>): Promise<User | null> =>
      this.queryAll(ctx).whereId(P.equals(id)).genOnlyValue()
  );

  update(data: Partial<Data>) {
    return makeSavable(
      this.ctx,
      new UpdateMutationBuilder(this.ctx, this.spec, this)
        .set(data)
        .toChangesets()[0]
    );
  }

  static create(ctx: Context, data: Partial<Data>) {
    return makeSavable(
      ctx,
      new CreateMutationBuilder(ctx, s).set(data).toChangesets()[0]
    );
  }

  delete() {
    return makeSavable(
      this.ctx,
      new DeleteMutationBuilder(this.ctx, this.spec, this).toChangesets()[0]
    );
  }
}
