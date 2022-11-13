import {
  BasePersistedModelData,
  IPersistedModel,
  ModelSpecWithCreate,
} from "@vlcn.io/model-persisted";
import { SourceQuery } from "../Query.js";
import MemorySourceExpression from "./MemorySourceExpression.js";

export default class MemorySourceQuery<
  T extends IPersistedModel<BasePersistedModelData>
> extends SourceQuery<T> {
  constructor(spec: ModelSpecWithCreate<T, BasePersistedModelData>) {
    super(new MemorySourceExpression(spec, { what: "model" }));
  }
}
