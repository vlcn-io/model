import { newScope, PSD } from "../asyncContext.js";

test("async/await", async () => {
  let c = 0;
  const task = async () => {
    let prop = ++c;
    const ctx = {
      prop,
    };
    await newScope(async () => {
      // TODO: fix up dexie types to understand psd extension
      // @ts-ignore
      expect(prop).toBe(PSD.prop);

      await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));
      // @ts-ignore
      expect(prop).toBe(PSD.prop);
    }, ctx);
  };

  await Promise.all([task(), task(), task(), task(), task()]);
});
