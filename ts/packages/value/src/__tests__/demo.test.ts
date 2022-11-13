import { PSD } from "@vlcn.io/zone";
import { inflight, tx, txAsync, txSerializedAsync } from "../transaction";
import { value } from "../Value.js";

async function nativePromiseDelay(n: number) {
  await new Promise((resolve) => setTimeout(resolve, n));
}

function promiseDelay(n: number) {
  return new Promise((resolve) => setTimeout(resolve, n));
}

test("sibling transactions can be retried until success if they modify the same data concurrently", async () => {
  const shared = value(1);

  const task = async () => {
    const temp = shared.val;
    await promiseDelay(0);
    shared.val = temp + 1;
  };

  const t1 = txAsync(task, { concurrentModification: "retry" });
  const t2 = txAsync(task, { concurrentModification: "retry" });

  // run em concurrently
  await Promise.all([t1, t2]);

  // should have retried the loser and incremented to the correct value
  expect(shared.val).toBe(3);
  console.log("In tx: " + shared.val);
});

test("example no tx", async () => {
  const shared = value(1);

  const task = async () => {
    const temp = shared.val;
    await promiseDelay(0);
    shared.val = temp + 1;
  };

  // run em concurrently
  await Promise.all([task(), task()]);

  console.log("No tx: " + shared.val);
});
