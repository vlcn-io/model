import { value } from "../Value.js";
import { createCases } from "./shared-value-tests.js";

const tests = createCases(value);

tests.forEach(([name, fn]) => {
  test(name, fn);
});
