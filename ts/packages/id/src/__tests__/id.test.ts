import { isHex } from "@aphrodite.sh/util";
import { newId } from "../id.js";

test("Requires hex device id", () => {
  expect(() => newId("zyx")).toThrow();
  expect(() => newId("01AF")).not.toThrow();
});

test("Returned value is hex", () => {
  const id = newId("01AF", "hex");
  expect(isHex(id)).toBe(true);
});

test("Returned value is 64bits (8 bytes)", () => {
  const id = newId("F1AF", "hex");
  expect(id.length).toBe(16);
});

test("Device ids are required to be 2 bytes or more", () => {
  expect(() => newId("1")).toThrow();
  expect(() => newId("12")).toThrow();
  expect(() => newId("123")).toThrow();
  expect(() => newId("1234")).not.toThrow();
});

test("sids can be decimal or hex", () => {
  const decimal = newId("01AF", "decimal");
  const hex = newId("01AF", "hex");

  expect(BigInt("0x" + hex)).toEqual(BigInt(decimal) + 1n);
});
