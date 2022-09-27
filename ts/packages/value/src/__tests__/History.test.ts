import { History } from "../History.js";
import { inflight, transaction } from "../transaction";

test("at", () => {
  const history = new History<string>();
  inflight.clear();

  // empty histories can't return anything
  expect(() => history.at(0)).toThrow();

  history.maybeAdd("first", 1);

  // nothing is in flight so no history should have been added
  expect(() => history.at(2)).toThrow();

  inflight.add(transaction());

  history.maybeAdd("first", 1);

  // Should get the greatest version less then or equal to the requested version.
  expect(history.at(2)).toEqual("first");
  expect(history.at(1)).toEqual("first");

  history.maybeAdd("second", 2);
  history.maybeAdd("third", 3);

  expect(history.at(3)).toEqual("third");
  expect(history.at(2)).toEqual("second");
  expect(history.at(1)).toEqual("first");

  // going back before any history exists for the node should throw
  expect(() => history.at(0)).toThrow();
});

test("maybe add prunes history", () => {
  const history = new History<string>();
  inflight.clear();

  inflight.add(transaction());

  history.maybeAdd("first", 1);
  expect(history.at(1)).toEqual("first");

  inflight.clear();

  // history should be cleaned up given no in-flight transactions
  history.maybeAdd("first", 1);
  expect(() => history.at(1)).toThrow();
});
