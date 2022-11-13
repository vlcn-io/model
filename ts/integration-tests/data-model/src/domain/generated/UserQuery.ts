// SIGNED-SOURCE: <57df95665329979e560d3c7bd66e060a>
/**
 * AUTO-GENERATED FILE
 * Do not modify. Update your schema and re-generate for changes.
 */
import { DerivedQuery } from "@vlcn.io/runtime";
import { QueryFactory } from "@vlcn.io/runtime";
import { modelLoad } from "@vlcn.io/runtime";
import { filter } from "@vlcn.io/runtime";
import { Predicate } from "@vlcn.io/runtime";
import { take } from "@vlcn.io/runtime";
import { orderBy } from "@vlcn.io/runtime";
import { P } from "@vlcn.io/runtime";
import { ModelFieldGetter } from "@vlcn.io/runtime";
import { Expression } from "@vlcn.io/runtime";
import { EmptyQuery } from "@vlcn.io/runtime";
import { ID_of } from "@vlcn.io/runtime";
import User from "../User.js";
import { Data } from "./UserBase.js";
import UserSpec from "./UserSpec.js";

export default class UserQuery extends DerivedQuery<User> {
  static create() {
    return new UserQuery(
      QueryFactory.createSourceQueryFor(UserSpec),
      modelLoad(UserSpec.hydrate)
    );
  }

  static empty() {
    return new UserQuery(new EmptyQuery());
  }

  protected derive(expression: Expression): UserQuery {
    return new UserQuery(this, expression);
  }

  static fromId(id: ID_of<User>) {
    return this.create().whereId(P.equals(id));
  }

  whereId(p: Predicate<Data["id"]>) {
    return this.derive(filter(new ModelFieldGetter<"id", Data, User>("id"), p));
  }

  whereName(p: Predicate<Data["name"]>) {
    return this.derive(
      filter(new ModelFieldGetter<"name", Data, User>("name"), p)
    );
  }

  whereCreated(p: Predicate<Data["created"]>) {
    return this.derive(
      filter(new ModelFieldGetter<"created", Data, User>("created"), p)
    );
  }

  whereModified(p: Predicate<Data["modified"]>) {
    return this.derive(
      filter(new ModelFieldGetter<"modified", Data, User>("modified"), p)
    );
  }

  take(n: number) {
    return new UserQuery(this, take(n));
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
