import {
  BasePersistedModelData,
  IPersistedModel,
  ModelSpecWithCreate,
} from "@vulcan.sh/model-persisted";
import { SourceQuery } from "../Query.js";
import SQLSourceExpression from "./SQLSourceExpression.js";

export default class SQLSourceQuery<
  T extends IPersistedModel<BasePersistedModelData>
> extends SourceQuery<T> {
  constructor(spec: ModelSpecWithCreate<T, BasePersistedModelData>) {
    super(new SQLSourceExpression(spec, { what: "model" }));
  }
}
