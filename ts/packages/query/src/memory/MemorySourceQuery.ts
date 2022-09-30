import { IModel, ModelSpecWithCreate } from "@vulcan.sh/config";
import { SourceQuery } from "../Query.js";
import MemorySourceExpression from "./MemorySourceExpression.js";

export default class MemorySourceQuery<
  T extends IModel<Object>
> extends SourceQuery<T> {
  constructor(spec: ModelSpecWithCreate<T, Object>) {
    super(new MemorySourceExpression(spec, { what: "model" }));
  }
}
