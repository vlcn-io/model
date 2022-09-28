import { PSD } from "@vulcan.sh/context-provider";
import { inflight, tx, txAsync } from "../transaction";
import { value } from "../Value.js";

async function nativePromiseDelay(n: number) {
  await new Promise((resolve) => setTimeout(resolve, n));
}

function promiseDelay(n: number) {
  return new Promise((resolve) => setTimeout(resolve, n));
}

test("see Value.test.ts which inorporates transaction tests", () => {});

test("sync transaction immediately leaves its scope", () => {
  const currentPSD = PSD;

  tx(() => {
    expect(inflight.length).toBe(1);
    expect(currentPSD).not.toBe(PSD);
  });

  expect(currentPSD).toBe(PSD);
  expect((PSD as any).tx).toBe(undefined);
  expect(inflight.length).toBe(0);
});

test("async transaction leaves scope after being awaited", async () => {
  const currentPSD = PSD;

  await txAsync(async () => {
    expect(inflight.length).toBe(1);
    expect(currentPSD).not.toBe(PSD);
  });

  expect(currentPSD).toBe(PSD);
  expect((PSD as any).tx).toBe(undefined);
  expect(inflight.length).toBe(0);
});

test("async transaction that contains inner awaits leaves scope after being awaited", async () => {
  const currentPSD = PSD;

  await txAsync(async () => {
    expect(inflight.length).toBe(1);
    const immediatePSD = PSD;
    expect(currentPSD).not.toBe(immediatePSD);

    await nativePromiseDelay(0);
    // global correctly gets re-set on re-entry
    expect(immediatePSD).toBe(PSD);

    await promiseDelay(0);
    expect(immediatePSD).toBe(PSD);

    await Promise.all([nativePromiseDelay(0), promiseDelay(0)]);
    expect(immediatePSD).toBe(PSD);

    await Promise.race([promiseDelay(0), promiseDelay(0)]);
    expect(immediatePSD).toBe(PSD);

    expect(inflight.length).toBe(1);
  });

  expect(currentPSD).toBe(PSD);
  expect((PSD as any).tx).toBe(undefined);
  expect(inflight.length).toBe(0);
});

test("async transactions that throw correctly clean up inflight transactions and psd", async () => {
  const currentPSD = PSD;

  try {
    await txAsync(async () => {
      expect(inflight.length).toBe(1);
      throw new Error();
    });
  } catch (e) {}

  expect(currentPSD).toBe(PSD);
  expect((PSD as any).tx).toBe(undefined);
  expect(inflight.length).toBe(0);
});

test("async transactions that throw do not commit", async () => {
  const shared = value(1);

  try {
    await txAsync(async () => {
      shared.val = 2;
      throw new Error();
    });
  } catch (e) {}

  expect(shared.val).toBe(1);
});

test("sync transactions that throw correctly clean up", () => {
  const currentPSD = PSD;

  try {
    tx(() => {
      expect(inflight.length).toBe(1);
      throw new Error();
    });
  } catch (e) {}

  expect(currentPSD).toBe(PSD);
  expect((PSD as any).tx).toBe(undefined);
  expect(inflight.length).toBe(0);
});

test("sync transactions that throw do not commit", () => {
  const shared = value(1);

  try {
    tx(() => {
      shared.val = 2;
      throw new Error();
    });
  } catch (e) {}

  expect(shared.val).toBe(1);
});

test("nested transactions can throw if caught by parent tx", async () => {
  const shared = value(1);

  tx(() => {
    shared.val = 2;
    try {
      // since we currently ignore nesting and make it part of the parent...
      // nested changes would actually take effect...
      // this is maybe right from a composability
      // standpoint???
      // TODO: think harder about this.
      // figure out why Clojure chose their stance
      // and how sqlite nesting works
      tx(() => {
        expect(shared.val).toBe(2);
        shared.val = 3;
        expect(shared.val).toBe(3);
        throw new Error();
      });
    } catch (e) {}
    expect(shared.val).toBe(3);
  });

  expect(shared.val).toBe(3);
  shared.val = 1;

  // test the async case
  await txAsync(async () => {
    shared.val = 2;
    try {
      await txAsync(async () => {
        expect(shared.val).toBe(2);
        shared.val = 3;
        expect(shared.val).toBe(3);
        throw new Error();
      });
    } catch (e) {}
    expect(shared.val).toBe(3);
  });
  expect(shared.val).toBe(3);
});

test("nested transactions just delegate to parent", async () => {
  const globalPSD = PSD;
  tx(() => {
    const parentPSD = PSD;
    expect(parentPSD).not.toBe(globalPSD);
    expect((globalPSD as any).tx).toBe(undefined);

    tx(() => {
      const nestedPSD = PSD;
      // a new PSD is created but the transactions should be the same
      // TODO: maybe don't even enter new scopes as a future optimization?
      expect(nestedPSD).not.toBe(parentPSD);
      expect(nestedPSD).not.toBe(globalPSD);
      expect((nestedPSD as any).tx).toBe((parentPSD as any).tx);
    });
    expect(PSD).toBe(parentPSD);
  });
  expect(PSD).toBe(globalPSD);

  await txAsync(async () => {
    const parentPSD = PSD;
    expect(parentPSD).not.toBe(globalPSD);
    expect((globalPSD as any).tx).toBe(undefined);

    await txAsync(async () => {
      const nestedPSD = PSD;
      // a new PSD is created but the transactions should be the same
      // TODO: maybe don't even enter new scopes as a future optimization?
      expect(nestedPSD).not.toBe(parentPSD);
      expect(nestedPSD).not.toBe(globalPSD);
      expect((nestedPSD as any).tx).toBe((parentPSD as any).tx);
    });
    expect(PSD).toBe(parentPSD);
  });
  expect(PSD).toBe(globalPSD);
});

test("nested transactions are not treated as concurrent transactions", () => {
  const shared = value(1);
  expect(shared.val).toBe(1);

  tx(() => {
    expect(inflight.length).toBe(1);
    expect(shared.val).toBe(1);
    shared.val = 2;
    expect(shared.val).toBe(2);
    tx(() => {
      expect(inflight.length).toBe(1);
      shared.val = 3;
      expect(shared.val).toBe(3);
    });
    expect(shared.val).toBe(3);
  });

  expect(shared.val).toBe(3);
  expect(inflight.length).toBe(0);
});

test("sibling transactions throw if they modify the same data", async () => {});

test("sibling transactions commit without error if they do not modify the same data", async () => {});

test("sibling transactions can be automatically serialized if desired", async () => {});

test("we do not lose track of the transaction we are in -- even across multiple promise and async function boundaries", async () => {});

test("when leaving a transaction we're in the correct scope", () => {
  // no more tx in scope as we're out of the top most tx
});
test("debit example", () => {});
