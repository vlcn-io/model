import { GrammarExtension } from "@vulcan.sh/grammar-extension-api";
import { Step } from "@vulcan.sh/codegen-api";

export type Config = {
  grammarExtensions?: GrammarExtension<any, any>[];
  codegenExtensions?: Step[];
};
