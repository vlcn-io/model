import { IModel, ModelSpecWithCreate } from "@vulcan.sh/config";
import { SourceQuery } from "../Query.js";
import SQLSourceExpression from "./SQLSourceExpression.js";

export default class SQLSourceQuery<
  T extends IModel<Object>
> extends SourceQuery<T> {
  constructor(spec: ModelSpecWithCreate<T, Object>) {
    super(new SQLSourceExpression(spec, { what: "model" }));
  }
}
