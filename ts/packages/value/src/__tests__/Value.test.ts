import { value } from "../Value.js";

test("Outside of transaction(s)", () => {
  let d = { x: "y" };
  const v = value(d);

  expect(v.get()).toBe(d);

  d = { x: "z" };
  v.set(d);
  expect(v.get()).toBe(d);
});

test("Within a transaction where nothing is modified", () => {});

test("Within a transaction where nothing is concurrently modified", () => {});

test("Within a transaction with concurrent modifications", () => {});
