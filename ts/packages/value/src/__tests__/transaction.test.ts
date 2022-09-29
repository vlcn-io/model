import { PSD } from "@vulcan.sh/context-provider";
import { inflight, tx, txAsync, txSerializedAsync } from "../transaction";
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

test("async transaction that contains inner awaits loses", async () => {
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

test("sibling transactions throw if they modify the same data concurrently", async () => {
  const shared = value(1);

  const t1 = txAsync(async () => {
    await promiseDelay(0);
    shared.val = 2;
  });

  const t2 = txAsync(async () => {
    await promiseDelay(0);
    shared.val = 3;
  });

  const [r1, r2] = await Promise.allSettled([t1, t2]);

  if (r1.status === "fulfilled") {
    expect(r2.status).toBe("rejected");
    expect(shared.val).toBe(2);
  }
  if (r2.status === "fulfilled") {
    expect(r1.status).toBe("rejected");
    expect(shared.val).toBe(3);
  }
});

test("sibling transactions can be retried until success if they modify the same data concurrently", async () => {
  const shared = value(1);

  const t1 = txAsync(
    async () => {
      await promiseDelay(0);
      shared.val = shared.val + 1;
    },
    { concurrentModification: "retry" }
  );

  const t2 = txAsync(
    async () => {
      await promiseDelay(0);
      shared.val = shared.val + 1;
    },
    { concurrentModification: "retry" }
  );

  // run em concurrently
  await Promise.all([t1, t2]);

  // should have retried the loser and incremented to the correct value
  expect(shared.val).toBe(3);
});

test("A transaction can conflict with an auto transaction", async () => {
  // h = txAsync();
  // shared.val = x;
  // await h;
});

test("sibling transactions commit without error if they do not modify the same data", async () => {
  const shared1 = value(1);
  const shared2 = value(2);

  const t1 = txAsync(async () => {
    await promiseDelay(0);
    shared1.val = 2;
  });

  const t2 = txAsync(async () => {
    await promiseDelay(0);
    shared2.val = 3;
  });

  await Promise.all([t1, t2]);

  expect(shared1.val).toBe(2);
  expect(shared2.val).toBe(3);
});

test("serialized siblings can never conflict", async () => {
  const shared = value(1);

  await txAsync(async () => {
    await promiseDelay(0);
    shared.val = shared.val + 1;
  });

  await txAsync(async () => {
    await promiseDelay(0);
    shared.val = shared.val + 1;
  });

  expect(shared.val).toBe(3);
});

test("sibling transactions can be automatically serialized if desired", async () => {
  const shared = value(1);

  // The runtime forces these to run serially even though the user
  // attempts to await them in parallel.
  // This is very important for things like sqlite transactions
  // where we cannot start two on the same connection
  // concurrently.
  // If we introduce connection pooling that we'd want to serialize
  // against some pool of resources.
  const t1 = txSerializedAsync(async () => {
    await promiseDelay(0);
    shared.val = shared.val + 1;
  });

  const t2 = txSerializedAsync(async () => {
    await promiseDelay(0);
    shared.val = shared.val + 1;
  });

  await Promise.all([t1, t2]);

  expect(shared.val).toBe(3);
});

test("we do not lose track of the transaction we are in -- even across multiple promise and async function boundaries", async () => {});

test("debit example", () => {});
