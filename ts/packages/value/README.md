# vulcan.sh/value - Transactional Memory

Related projects:

- [Scala & ZIO STM](https://zio.dev/version-1.x/datatypes/stm/)
- [Effect-TS STM](https://github.com/Effect-TS/core/tree/main/packages/core/_src/stm)
- [Haskell STM](https://hackage.haskell.org/package/stm-2.5.0.0/docs/Control-Concurrent-STM.html)
- [Clojure STM](https://clojure.github.io/clojure/clojure.core-api.html#clojure.core/dosync)

Keeping a program's state consistent is a challenging task. Once you throw exceptions and error handling into the mix it gets even harder. If you add the ability to observe values & objects as they change... well it becomes nigh impossible.

As such, mutable state is rightly frowned upon and a trend towards functional programming and systems like `Redux` have gained steam. Their key insight is that you make all your changes in a _new_ copy of state and, once that is done, replace the _old_ copy of state.

This very much mimicks the features of a database transaction:

- the new copy of state is isolated from the rest of the app
- the new copy can be committed atomically (by setting a pointer to the new state tree)
- the changes to the new copy have no impact if exceptions happen, thus preventing inconsistent state

Trying to manage a giant tree of completely immutable state can be rather complicated, however. Especially when you need to update deeply nested state in that tree. It gets harder again when you need to compute what parts of the tree changed in order to notify interested parties.

[![https://github.com/aphrodite-sh/vulcan/raw/main/assets/redux-tweet.png](https://github.com/aphrodite-sh/vulcan/raw/main/assets/redux-tweet.png)](https://twitter.com/dan_abramov/status/1191487232038883332)

So lets take a lesson from relational databases. Relational databases provide a set of **global** and **mutable** state yet we have very few problems with the state managed by our databases in comparison to state in program memory. This is because the database provides better abstractions for handling mutations. Namely transactions, atomic commits of transactions, transaction isolation and rollback on failure.

This project brings that to `JavaScript` & `TypeScript`.

# Examples

## Basic transaction and rollback:

```javascript
import { value, tx } from "@vulcan.sh/value";

// creating or updating a value outside a transaction commits the value immediately.
// values can be anything. primitives, objects, arrays, etc.
const shared = value("initial value");

// within a transaction, all changes are isolated to the transaction
try {
  tx(() => {
    shared.val = "updated value";
    console.log("a transaction can see its own changes", shared.val); // will print: "updated value";

    // throw to simulate an error in the transaction
    throw new Error("oops!");
  });
} catch (e) {
  // will print: "initial value" since the transaction failed
  console.log(
    "exceptions thrown from a transaction prevent the changes of that transaction from being committed",
    shared.val
  );
}
```

[fiddle](https://jsfiddle.net/jw3zc7fs/10/)

## Async transactions and transaction isolation:

```javascript
import { value, tx } from "@vulcan.sh/value";

// creating or updating a value outside a transaction commits the value immediately.
const shared1 = value({ a: "initial-value" });
const shared2 = value({ b: "initial-value" });

console.log("Start at initial values");
console.log(shared1.val);
console.log(shared2.val);

const promise = tx(async () => {
  shared1.val = { a: "worker-arg" };
  const r = await callWorker(shared1.val);
  shared2.val = r;
});

// tx stareted but not complete because we did not await it.
// since it is not complete the main application cannot see its changes yet
console.log("transaction not complete -- still at initial values");
console.log(shared1.val);
console.log(shared2.val);

await promise;

// awaited and now committed. can see all modifications.
console.log("Awaited transaction to completion -- now at new values");
console.log(shared1.val);
console.log(shared2.val);

async function callWorker(v) {
  // simulate web worker call + delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  return { b: v.a + " + worker-result" };
}
```

[fiddle](https://jsfiddle.net/vec0h7zn/9/)

## Observable values:

```javascript
import { observableValue, tx } from "@vulcan.sh/value";

const [shared1] = observableValue(100);
const [shared2] = observableValue(200);

shared1.onTransactionComplete((v) => {
  console.log(v);
});
shared2.onTransactionComplete((v) => {
  console.log(v);
});

// setting outside a transaction immediately commits. Observers will be trigger by each of these statements.
console.log("outside tx -- commit and notify immediately on set");
shared1.val = 101;
shared2.val = 201;

// we can make all the adjustments and intermediate adjustments to shared1 and shared2 we want inside the tx.
// nobody will be notified until the tx completes -- allowing us to get all state into a consistent
// state before leaking that state to the outside world.
tx(() => {
  console.log("inside tx -- no notifications about intermediate state changes");
  shared1.val = 102;
  shared2.val = 202;

  shared1.val = shared2.val + shared1.val; // 102 + 202 = 304 = shared1
  shared2.val = shared1.val * 2; // 304 * 2 = 608 = shared2
  console.log("exiting tx -- will notify observers of the final state");
});

tx(() => {
  console.log(
    "this transaction will fail and thus not change state or notify anyone"
  );
  shared1.val = 888;
  shared2.val = 888;
  throw new Error();
});
```

[fiddle](https://jsfiddle.net/qncsafvh/14/)

## Persisted (to disk) values:

TBD -- being developed to support [aphrodite.sh](https://aphrodite.sh)

# ACID

This package is the core building block of transactional memory. All instances of "Value" are transaction aware an uphold ACI~~D~~ properties.

In that:

- **A** - all Values changed within a transaction are committed **A**tomically
- **C** - values are only updated if the system will be left in a **C**onsistent state state. Uncaught exceptions in a transaction roll back all changes as if they never happened.
- **I** - transactions are **I**solated, thus each transaction is alway operating on a consistent set of data.
- **D** - given this is in-memory, durability is currently a non-goal.

# Implementation

The closest analogy is a write ahead log ([WAL](https://www.sqlite.org/wal.html)).

When a value is modified by a transaction that modification is stored within the transaction object rather than in the value itself. The transaction object thus acting as a WAL. This allows for isolation (other transactions don't see the changes), a gathering of pending changes for atomicity, and consistency by allowing a transaction to fail without having altered application state.

When a transaction reads a value it first checks to see if the value exists in the current transaction's data store. If not, it reads from the value itself. This latter part has some special cases.

Another transaction could have been committed and thus updated the core value (committing always checkpoints the "wal" if you're keeping with that analogy). A transaction should not see changes that were committed while it was running. To prevent this from happening, a transaction records what "version" system memory was at when the transaction started. When reading from a value the transaction will only read values from a version less than or equal to the version of memory when the transaction started. Writing to a value will save the old version of the value into a history buffer if there are pending transactions in flight. If no pending transactions are in flight the history buffer(s) are dropped.

# Future Work

- Understand perf impact
- Instrument value history to ensure it stays in reasonable bounds.
- Multiple write transactions can currently concurrently alter the same value. Either:
  - Allow this but log when it happens
  - Disallow this through some TBD strategy
- Durability (on disk persistence of selected value types)
