import { tx } from "@vlcn.io/value";
import { Model } from "../Model.js";

class TestModel extends Model<{ a: string; b: string }> {}

test("notifies observers", () => {
  const model = new TestModel({
    a: "b",
    b: "c",
  });

  let notified = false;
  model.subscribe(() => {
    notified = true;
  });

  expect(notified).toBe(false);

  model.update({
    a: "c",
    b: "b",
  });

  expect(notified).toBe(true);
});

test("mutations / updates", () => {
  const model = new TestModel({
    a: "b",
    b: "c",
  });

  expect(model.data.a).toBe("b");

  model.update({
    a: "z",
  });

  expect(model.data.a).toBe("z");
});

test("mutations / updates in a tx", () => {
  const model = new TestModel({
    a: "b",
    b: "c",
  });

  let notified = false;
  model.subscribe(() => {
    notified = true;
  });

  tx(() => {
    let notified = false;
    model.subscribe(() => {
      notified = true;
    });

    model.update({
      a: "c",
      b: "b",
    });

    // no notifications until commit!
    expect(notified).toBe(false);

    // we can see results of our own tx before commit
    expect(model.data.a).toBe("c");
  });

  // can see changes post commit
  expect(model.data.a).toBe("c");
  // notified post commit
  expect(notified).toBe(true);
});

test("mutations / updates in an async tx", async () => {
  const model = new TestModel({
    a: "b",
    b: "c",
  });

  let notified = false;
  model.subscribe(() => {
    notified = true;
  });

  const handle = tx(async () => {
    let notified = false;
    model.subscribe(() => {
      notified = true;
    });

    model.update({
      a: "c",
      b: "b",
    });

    // no notifications until commit!
    expect(notified).toBe(false);

    await new Promise((resolve) => setTimeout(resolve));

    // we can see results of our own tx before commit
    expect(model.data.a).toBe("c");
  });

  // cannot see changes post commit -- we haven't awaited the tx so it isn't done.
  expect(model.data.a).toBe("b");
  expect(notified).toBe(false);

  await handle;

  // can see changes post commit / tx complete
  expect(model.data.a).toBe("c");
  expect(notified).toBe(true);
});

test("notifies keyed observers", () => {
  const model = new TestModel({
    a: "b",
    b: "c",
  });

  let notified = false;
  model.subscribeTo(["a"], () => {
    notified = true;
  });

  expect(notified).toBe(false);

  // not the key we're listening to
  model.update({
    b: "d",
  });
  expect(notified).toBe(false);

  // same value will not trigger a change
  model.update({
    a: "b",
  });
  expect(notified).toBe(false);

  model.update({
    a: "d",
  });
  expect(notified).toBe(true);
});

test("de-dupes notifications", () => {
  const model = new TestModel({
    a: "b",
    b: "c",
  });

  let notifCount = 0;
  const sub = () => {
    ++notifCount;
  };
  model.subscribeTo(["a"], sub);
  model.subscribe(sub);

  model.update({
    a: "x",
  });

  expect(notifCount).toBe(1);
});

test("tx failure", () => {
  const model = new TestModel({
    a: "b",
    b: "c",
  });
  let notified = false;

  model.subscribe(() => {
    notified = true;
  });

  try {
    tx(() => {
      model.update({
        a: "x",
      });
      throw new Error();
    });
  } catch (e) {}

  // no notifications or changes if tx fails
  expect(notified).toBe(false);
  expect(model.data.a).toBe("b");
});

test("transaction isolation", async () => {
  const model = new TestModel({
    a: "b",
    b: "c",
  });

  // the two transactions modify the same data but cannot see one another's modifications.
  // the transactions are isolated.
  // TODO: do we need to roll back a transaction and re-run it if the data it used was changed out from under it?
  // probably... what approach does sqlite take?
  // another option is a tx queue where all transactions are serialized but this isn't great. Would prevent interleaving
  // and parallelism when there is much io to do between operations.
  await Promise.all([
    tx(async () => {
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
      model.update({ a: "x" });
      expect(model.data.a).toBe("x");
      expect(model.data.b).toBe("c");
    }),
    tx(async () => {
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
      model.update({ b: "y" });
      expect(model.data.a).toBe("b");
      expect(model.data.b).toBe("y");
    }),
  ]);
});

test("unsubscribing", () => {
  const model = new TestModel({
    a: "b",
    b: "c",
  });
  let notified = false;

  const dispose1 = model.subscribe(() => {
    notified = true;
  });
  const dispose2 = model.subscribeTo(["a"], () => {
    notified = true;
  });

  model.update({ a: "x" });

  expect(notified).toBe(true);
  notified = false;

  dispose1();
  dispose2();

  model.update({ a: "z" });

  expect(notified).toBe(false);
});
