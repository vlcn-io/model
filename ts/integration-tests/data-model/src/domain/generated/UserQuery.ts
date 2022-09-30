// SIGNED-SOURCE: <10bf6703c2775d73b41fedd62c031aa8>
/**
 * AUTO-GENERATED FILE
 * Do not modify. Update your schema and re-generate for changes.
 */
import { Context } from "@vulcan.sh/runtime";
import { DerivedQuery } from "@vulcan.sh/runtime";
import { QueryFactory } from "@vulcan.sh/runtime";
import { modelLoad } from "@vulcan.sh/runtime";
import { filter } from "@vulcan.sh/runtime";
import { Predicate } from "@vulcan.sh/runtime";
import { take } from "@vulcan.sh/runtime";
import { orderBy } from "@vulcan.sh/runtime";
import { P } from "@vulcan.sh/runtime";
import { ModelFieldGetter } from "@vulcan.sh/runtime";
import { Expression } from "@vulcan.sh/runtime";
import { EmptyQuery } from "@vulcan.sh/runtime";
import { ID_of } from "@vulcan.sh/runtime";
import User from "../User.js";
import { Data } from "./UserBase.js";
import UserSpec from "./UserSpec.js";
import DeckSpec from "./DeckSpec.js";
import DeckQuery from "./DeckQuery.js";

export default class UserQuery extends DerivedQuery<User> {
  static create(ctx: Context) {
    return new UserQuery(
      ctx,
      QueryFactory.createSourceQueryFor(ctx, UserSpec),
      modelLoad(ctx, UserSpec.createFrom)
    );
  }

  static empty(ctx: Context) {
    return new UserQuery(ctx, new EmptyQuery(ctx));
  }

  protected derive(expression: Expression): UserQuery {
    return new UserQuery(this.ctx, this, expression);
  }

  static fromId(ctx: Context, id: ID_of<User>) {
    return this.create(ctx).whereId(P.equals(id));
  }

  whereId(p: Predicate<Data["id"]>) {
    return this.derive(
      // @ts-ignore #43
      filter(new ModelFieldGetter<"id", Data, User>("id"), p)
    );
  }

  whereName(p: Predicate<Data["name"]>) {
    return this.derive(
      // @ts-ignore #43
      filter(new ModelFieldGetter<"name", Data, User>("name"), p)
    );
  }

  whereCreated(p: Predicate<Data["created"]>) {
    return this.derive(
      // @ts-ignore #43
      filter(new ModelFieldGetter<"created", Data, User>("created"), p)
    );
  }

  whereModified(p: Predicate<Data["modified"]>) {
    return this.derive(
      // @ts-ignore #43
      filter(new ModelFieldGetter<"modified", Data, User>("modified"), p)
    );
  }
  queryDecks(): DeckQuery {
    return new DeckQuery(
      this.ctx,
      QueryFactory.createHopQueryFor(
        this.ctx,
        this,
        UserSpec.outboundEdges.decks
      ),
      modelLoad(this.ctx, DeckSpec.createFrom)
    );
  }

  take(n: number) {
    return new UserQuery(this.ctx, this, take(n));
  }

  orderById(direction: "asc" | "desc" = "asc") {
    return this.derive(
      orderBy(new ModelFieldGetter<"id", Data, User>("id"), direction)
    );
  }

  orderByName(direction: "asc" | "desc" = "asc") {
    return this.derive(
      orderBy(new ModelFieldGetter<"name", Data, User>("name"), direction)
    );
  }

  orderByCreated(direction: "asc" | "desc" = "asc") {
    return this.derive(
      orderBy(new ModelFieldGetter<"created", Data, User>("created"), direction)
    );
  }

  orderByModified(direction: "asc" | "desc" = "asc") {
    return this.derive(
      orderBy(
        new ModelFieldGetter<"modified", Data, User>("modified"),
        direction
      )
    );
  }
}
