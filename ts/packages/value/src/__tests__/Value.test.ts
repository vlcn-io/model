import { tx } from "../transaction.js";
import { value } from "../Value.js";

test("reading and writing utside of transaction(s)", () => {
  let d = { x: "y" };
  const v = value(d);

  expect(v.get()).toBe(d);

  d = { x: "z" };
  v.set(d);
  expect(v.get()).toBe(d);
});

test("reading and writing within a transaction where nothing is modified", async () => {
  let d = { x: "y" };
  const v = value(d);

  // sync
  tx(() => {
    expect(v.get()).toBe(d);
  });

  // async
  await tx(async () => {
    expect(v.get()).toBe(d);
  });
});

test("Within a transaction where nothing is concurrently modified", async () => {
  // sync
  tx(() => {
    let d = { x: "y" };
    const v = value(d);

    // the value was created within the current tx...
    // should this not mean it was touched by the current tx?
    expect(v.get()).toBe(d);

    d = { x: "z" };
    v.set(d);
    expect(v.get()).toBe(d);
  });

  // cb fn that returns a promise
  await tx(async () => {
    let d = { x: "y" };
    const v = value(d);

    expect(v.get()).toBe(d);

    d = { x: "z" };
    v.set(d);
    expect(v.get()).toBe(d);
  });
});

test("Within a transaction with concurrent modifications", () => {});
