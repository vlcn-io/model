import { ZoneContextManager, BaseContext } from "../ZoneContextManager.js";
import "zone.js";

test("setTimeout", (done) => {
  const mgr = new ZoneContextManager();
  mgr.enable();

  const outerContext = new BaseContext();

  let timerCount = 0;
  const maybeDone = () => {
    ++timerCount;
    if (timerCount >= 3) {
      done();
    }
  };

  mgr.with(outerContext, () => {
    expect(mgr.active()).toBe(outerContext);
    const innerContext = new BaseContext();

    setTimeout(() => {
      expect(mgr.active()).toBe(outerContext);
      maybeDone();
    }, 0);

    mgr.with(innerContext, () => {
      expect(mgr.active()).toBe(innerContext);

      setTimeout(() => {
        expect(mgr.active()).toBe(innerContext);
        maybeDone();
      }, 0);
    });

    setTimeout(() => {
      expect(mgr.active()).toBe(outerContext);
      maybeDone();
    }, 0);
  });
});

test("async/await", async () => {
  const mgr = new ZoneContextManager();
  mgr.enable();

  const task = async () => {
    const context = new BaseContext();
    await mgr.with(context, async () => {
      expect(mgr.active()).toBe(context);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mgr.active()).toBe(context);
    });
  };

  await Promise.all([task(), task(), task(), task()]);
});

test("promise", () => {});

// micro task
// animation frame?
