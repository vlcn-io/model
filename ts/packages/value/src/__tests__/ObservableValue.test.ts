import { observableValue } from "../ObservableValue.js";
import { tx } from "../transaction.js";
import { createCases } from "./shared-value-tests.js";

const tests = createCases((x) => observableValue(x)[0]);

tests.forEach(([name, fn]) => {
  test(name, fn);
});

test("Observers are not called back until after tx commit", () => {
  const [v] = observableValue(1);

  let notified = false;
  v.onTransactionComplete(() => {
    notified = true;
  });

  tx(() => {
    v.set(2);
    expect(notified).toBe(false);
  });
  expect(notified).toBe(true);
});
