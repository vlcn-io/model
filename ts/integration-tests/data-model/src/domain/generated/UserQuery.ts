// SIGNED-SOURCE: <57df95665329979e560d3c7bd66e060a>
/**
 * AUTO-GENERATED FILE
 * Do not modify. Update your schema and re-generate for changes.
 */
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
