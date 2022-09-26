import { IValue } from "../Value";
import { tx } from "../transaction.js";

export function createCases(
  value: (v: any) => IValue<any>
): [string, () => any][] {
  return [
    [
      "reading and writing utside of transaction(s)",
      () => {
        let d = { x: "y" };
        const v = value(d);

        expect(v.get()).toBe(d);

        d = { x: "z" };
        v.set(d);
        expect(v.get()).toBe(d);
      },
    ],
    [
      "reading and writing within a transaction where nothing is modified",
      async () => {
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
      },
    ],
    [
      "Within a transaction where nothing is concurrently modified",
      async () => {
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

        let d = { x: "y" };
        const v = value(d);

        // test when the value exists before entering the tx.
        tx(() => {
          expect(v.get()).toBe(d);

          d = { x: "z" };
          v.set(d);
          expect(v.get()).toBe(d);
        });
      },
    ],
    [
      "Within a transaction that awaits and is thus suspended",
      async () => {
        await tx(async () => {
          let d = { x: "y" };
          const v = value(d);

          await new Promise((resolved) => setTimeout(resolved, 0));

          expect(v.get()).toBe(d);

          d = { x: "z" };
          v.set(d);
          await new Promise((resolved) => setTimeout(resolved, 0));

          expect(v.get()).toBe(d);
        });
      },
    ],
    [
      "Within a transaction with concurrent modifications",
      async () => {
        const initial = { x: 1 };
        const shared = value(initial);

        const task = () =>
          tx(async () => {
            expect(shared.get()).toBe(initial);

            const newVal = Math.random() * 1000;
            shared.set({ x: newVal });

            expect(shared.get().x).toBe(newVal);

            await new Promise((resolved) =>
              setTimeout(resolved, Math.random() * 25)
            );

            // we should never see updates made by other tasks when inside a tx.
            expect(shared.get().x).toBe(newVal);
          });

        await Promise.all([task(), task(), task(), task(), task()]);
      },
    ],
    [
      "An aborted tx",
      async () => {
        const initial = { x: 1 };
        const shared = value(initial);

        let caught = false;
        try {
          tx(() => {
            shared.set({ x: -1 });
            throw new Error("Failed");
          });
        } catch (e) {
          caught = true;
        }
        expect(caught).toBe(true);
        caught = false;

        // failed transactions leave no trace
        expect(shared.get().x).toBe(1);

        try {
          await tx(async () => {
            shared.set({ x: -1 });
            throw new Error("Failed");
          });
        } catch (e) {
          caught = true;
        }
        expect(caught).toBe(true);

        // failed transactions on async functions leave no trace
        expect(shared.get().x).toBe(1);
      },
    ],
    [
      "effects of a tx are not observable until that tx is committed",
      async () => {
        const initial = { x: 1 };
        const shared = value(initial);

        const handle = tx(async () => {
          shared.set({ x: 2 });
          await new Promise((resolved) => setTimeout(resolved, 0));
        });

        expect(shared.get().x).toBe(1);

        await handle;

        expect(shared.get().x).toBe(2);
      },
    ],
    [
      "effects of a tx are observable post commit",
      async () => {
        const initial = "initial";
        const shared = value(initial);

        tx(() => {
          shared.set("sync set");
        });

        expect(shared.get()).toBe("sync set");

        await tx(async () => {
          shared.set("async set");
        });

        expect(shared.get()).toBe("async set");
      },
    ],
    [
      "async txns do not lose scope",
      async () => {
        // TODO await a bunch of stuff in different orders to try to drop scope
      },
    ],
  ];
}

// test multiple awaits in tx... and that nothing was committed on fail
// dexie zone seems broke
// .then.then leaves the zone, .then doesn't
