import { PSD } from "@vulcan.sh/context-provider";
import { tx } from "../transaction";
import { value } from "../Value.js";

test("see Value.test.ts which inorporates transaction tests", () => {});

test("sync transaction immediately leaves its scope", () => {
  const currentPSD = PSD;

  tx(() => {
    expect(currentPSD).not.toBe(PSD);
  });

  expect(currentPSD).toBe(PSD);
  expect((PSD as any).tx).toBe(undefined);
});

test("async transaction leaves scope after being awaited", () => {});

test("nested transactions", () => {
  // Nested transactions should roll their changes into the parent transaction
  // Nothing should be committed until the parent transaction completes.
  //
  // If a child transaction throws, the parent can still complete if the parent
  // catches the error. The child's changes won't be included.
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
