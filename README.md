# acid-memory

Object orientation is so busted because there is no support for ACI~~d~~ (atomicity, consistency, isolation) against in-memory data structures.

Think of it like this. Global, shared and long lived state are seen as the most evil things in programming. An endless source of bugs
and complexity.

But what is a database? Very much a shared, long lived and global set of state. Yet our databases are often a pleasure to work with and not
a source of bugs in our application.

Why is this?

Because:

1. Our data is normalized in our DBs (update one thing one time in one place)
2. Our DBs provide ACID guarantees

acid-memory brings ACID (sans d) guarantees to in-memory data structures. Durability (d) can be tacked on via extensions to acid-memory.

# Example

```typescript
acid.tx(() => {
  objectOne.update(...);
  objectTwo.update(...);
  ...
  otherStuff.update(...);
});
```

All changes within `tx` are isolated and not able to be observed outside the transaction until the transaction has been committed.

If anything within `tx` fails, all changes are rolled back.

This guarantees that we can update many inter-dependent objects without ever exposing partial states to the application.

# Inspiration

This comes from the core `aphrodite` project where transactional memory was implemented via `changesets`. While `changesets` work pretty well they have some problems.

1. You have to collect all your changesets as you make changes to different records and then remember to commit them all.
2. Programmers are more used to wrapping operations in a transaction than dealing with a new concept of a changeset.
3. You can't view the modified state of a record within a transaction. You have to look at the changeset of that record to understand what it will look like. This creates two sets of read APIs: reading in normal circumstances, reading while mutating.
4. Triggers don't run until final commit of all changesets. I.e., you can't read any values computed by triggers when using changesets. Ideally triggers would run as things are modified within a transaction.

`acid-memory` fixes all the drawbacks of changesets by updating the `Model` class to version its underlying data. A data version is retained as long as a transaction is running that was started at that version. Reads within a transaction only read data the is compatible with the version at the time the transaction started.
