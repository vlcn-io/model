import { assertUnreachable, invariant, isHex } from "../index.js";

test("assert unreachable", () => {
  // @ts-expect-error -- test typechecker via this comment
  expect(() => assertUnreachable("foo")).toThrow();
});

test("invariant", () => {
  expect(() => invariant(false, "oops")).toThrow();
  expect(() => invariant(true, "fixed")).not.toThrow();
});

// TODO: should fast-check this
test("isHex", () => {
  expect(() => isHex("zdb")).toThrow();
  expect(() => isHex("0abcdef123456789")).not.toThrow();
});
