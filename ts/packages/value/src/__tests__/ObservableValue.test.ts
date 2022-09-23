import { observableValue } from "../ObservableValue.js";
import { createCases } from "./shared-value-tests.js";

const tests = createCases((x) => observableValue(x)[0]);

tests.forEach(([name, fn]) => {
  test(name, fn);
});
