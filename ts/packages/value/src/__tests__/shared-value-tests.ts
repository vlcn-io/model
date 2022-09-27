import { IValue } from "../Value";
import { asyncTx, tx } from "../transaction.js";
import { PSD } from "@vulcan.sh/context-provider";

async function nativePromiseDelay(n: number) {
  await new Promise((resolve) => setTimeout(resolve, n));
}

/**
 * All value types (normal, observable, persisted) should pass these test cases.
 */
export function createCases(
  value: (v: any) => IValue<any>
): [string, () => any][] {
  return [
    // [
    //   "reading and writing utside of transaction(s)",
    //   () => {
    //     let d = { x: "y" };
    //     const v = value(d);

    //     expect(v.val).toBe(d);

    //     d = { x: "z" };
    //     v.val = d;
    //     expect(v.val).toBe(d);
    //   },
    // ],
    // [
    //   "reading and writing within a transaction where nothing is modified",
    //   async () => {
    //     let d = { x: "y" };
    //     const v = value(d);

    //     // sync
    //     tx(() => {
    //       expect(v.val).toBe(d);
    //     });

    //     // async
    //     await tx(async () => {
    //       expect(v.val).toBe(d);
    //     });
    //   },
    // ],
    // [
    //   "Within a transaction where nothing is concurrently modified",
    //   async () => {
    //     // sync
    //     tx(() => {
    //       let d = { x: "y" };
    //       const v = value(d);

    //       // the value was created within the current tx...
    //       // should this not mean it was touched by the current tx?
    //       expect(v.val).toBe(d);

    //       d = { x: "z" };
    //       v.val = d;
    //       expect(v.val).toBe(d);
    //     });

    //     // cb fn that returns a promise
    //     await tx(async () => {
    //       let d = { x: "y" };
    //       const v = value(d);

    //       expect(v.val).toBe(d);

    //       d = { x: "z" };
    //       v.val = d;
    //       expect(v.val).toBe(d);
    //     });

    //     let d = { x: "y" };
    //     const v = value(d);

    //     // test when the value exists before entering the tx.
    //     tx(() => {
    //       expect(v.val).toBe(d);

    //       d = { x: "z" };
    //       v.val = d;
    //       expect(v.val).toBe(d);
    //     });
    //   },
    // ],
    // [
    //   "Within a transaction that awaits and is thus suspended",
    //   async () => {
    //     await tx(async () => {
    //       let d = { x: "y" };
    //       const v = value(d);

    //       await new Promise((resolved) => setTimeout(resolved, 0));

    //       expect(v.val).toBe(d);

    //       d = { x: "z" };
    //       v.val = d;
    //       await new Promise((resolved) => setTimeout(resolved, 0));

    //       expect(v.val).toBe(d);
    //     });
    //   },
    // ],
    // [
    //   "Within a transaction with concurrent modifications",
    //   async () => {
    //     const initial = { x: 1 };
    //     const shared = value(initial);

    //     let taskCompletions = 0;

    //     const task = () =>
    //       tx(async () => {
    //         const txid = (PSD as any).txid;

    //         expect(shared.val).toBe(initial);

    //         await new Promise((resolved) =>
    //           setTimeout(resolved, Math.random() * 25)
    //         );

    //         // chack that interleaving executions get the correct
    //         // transaction reassigned to them
    //         expect((PSD as any).txid).toBe(txid);

    //         expect(shared.val).toBe(initial);

    //         const newVal = Math.random() * 1000 + 2;
    //         shared.val = { x: newVal };

    //         expect(shared.val.x).toBe(newVal);

    //         await nativePromiseDelay(25);
    //         expect((PSD as any).txid).toBe(txid);

    //         // we should never see updates made by other tasks when inside a tx.
    //         expect(shared.val.x).toBe(newVal);
    //         taskCompletions++;
    //       });

    //     const txResults = await Promise.allSettled([
    //       task(),
    //       task(),
    //       task(),
    //       task(),
    //       task(),
    //     ]);

    //     // all tasks should reach the end -- checking so we can ensure all our expects were run.
    //     // we do this since the transactions will throw concurrent modification exceptions
    //     // and we're swallowing all errors with `allSettled`
    //     expect(taskCompletions).toEqual(5);

    //     expect(shared.val).not.toBe(initial);

    //     // one transaction should have committed, all others should have been rejected with concurrent modification exceptions
    //     expect(txResults.filter((r) => r.status === "fulfilled").length).toBe(
    //       1
    //     );
    //   },
    // ],
    // [
    //   "An aborted tx",
    //   async () => {
    //     const initial = { x: 1 };
    //     const shared = value(initial);

    //     let caught = false;
    //     try {
    //       tx(() => {
    //         shared.val = { x: -1 };
    //         throw new Error("Failed");
    //       });
    //     } catch (e) {
    //       caught = true;
    //     }
    //     expect(caught).toBe(true);
    //     caught = false;

    //     // failed transactions leave no trace
    //     expect(shared.val.x).toBe(1);

    //     try {
    //       await tx(async () => {
    //         shared.val = { x: -1 };
    //         throw new Error("Failed");
    //       });
    //     } catch (e) {
    //       caught = true;
    //     }
    //     expect(caught).toBe(true);

    //     // failed transactions on async functions leave no trace
    //     expect(shared.val.x).toBe(1);
    //   },
    // ],
    [
      "effects of a tx are not observable until that tx is committed",
      async () => {
        const initial = { x: 1 };
        const shared = value(initial);

        const handle = asyncTx(async () => {
          shared.val = { x: 2 };
          await new Promise((resolved) => setTimeout(resolved, 0));
        });

        expect(shared.val.x).toBe(1);

        await handle;

        console.log((PSD as any).tx);
        expect(shared.val.x).toBe(2);
      },
    ],
    // [
    //   "effects of a tx are observable post commit",
    //   async () => {
    //     const initial = "initial";
    //     const shared = value(initial);

    //     tx(() => {
    //       shared.val = "sync set";
    //     });

    //     expect(shared.val).toBe("sync set");

    //     await tx(async () => {
    //       shared.val = "async set";
    //     });

    //     expect(shared.val).toBe("async set");
    //   },
    // ],
  ];
}

// test multiple awaits in tx... and that nothing was committed on fail
// dexie zone seems broke
// .then.then leaves the zone, .then doesn't
