import { GrammarExtension } from "@vlcn.io/grammar-extension-api";
import { Step } from "@vlcn.io/codegen-api";

export type Config = {
  grammarExtensions?: GrammarExtension<any, any>[];
  codegenExtensions?: Step[];
};
