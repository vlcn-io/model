import { tx } from "../transaction";
import { value } from "../Value.js";

test("see Value.test.ts which inorporates transaction tests", () => {});

test("nested transactions do not commit if the parent does not commit", () => {
  const shared = value(1);

  try {
    tx(() => {
      shared.val = 2;
      tx(() => {
        shared.val = 3;
      });

      throw new Error();
    });
  } catch (e) {}

  expect(shared.val).toBe(1);
});

test("parents of nested transactions do not commit if a nested tx throws", () => {
  const shared = value(1);

  try {
    tx(() => {
      shared.val = 2;
      tx(() => {
        shared.val = 3;

        throw new Error();
      });
    });
  } catch (e) {}

  expect(shared.val).toBe(1);
});

test("nested transactions are not treated as concurrent transactions", async () => {
  const shared = value(1);
  expect(shared.val).toBe(1);

  tx(() => {
    expect(shared.val).toBe(1);
    shared.val = 2;
    expect(shared.val).toBe(2);
    tx(() => {
      shared.val = 3;
      expect(shared.val).toBe(3);
    });
    expect(shared.val).toBe(3);
  });

  expect(shared.val).toBe(3);
});

test("sibling transactions throw if they modify the same data", async () => {});
test("sibling transactions commit without error if they do not modify the same data", async () => {});
test("sibling transactions can be automatically serialized if desired", async () => {});
test("we do not lose track of the transaction we are in -- even across multiple promise and async function boundaries", async () => {});
test("when leaving a transaction we're in the correct scope", () => {
  // no more tx in scope as we're out of the top most tx
});
test("debit example", () => {});
