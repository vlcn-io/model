test("see Value.test.ts which inorporates transaction tests", () => {});

test("nested transactions", () => {
  // Nested transactions should roll their changes into the parent transaction
  // Nothing should be committed until the parent transaction completes.
  //
  // If a child transaction throws, the parent can still complete if the parent
  // catches the error. The child's changes won't be included.
});
test("sibling transactions throw if they modify the same data", async () => {});
test("sibling transactions can be automatically serialized if desired", async () => {});
test("we do not lose track of the transaction we are in -- even across multiple promise and async function boundaries", async () => {});
test("when leaving a transaction we're in the correct scope", () => {
  // no more tx in scope as we're out of the top most tx
});
