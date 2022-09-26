# Transaction Options

Nested:

- Commit just moves values to parent

Async sibling transactions:

- Serialize them?
- Warn?
- Fatal?
- Alternate APIs:
- serialTx
- retryableTx
- split sync tx into async and sync apis

# Aphrodite Options

- Normal ORM -- a write is a write, a read a read
  - Would need to serialize sibling transactions
- lazy
  - still serialize siblings?
  - at end, we have a list of things to commit
- lazyUnsafe
  - no serializing of siblings?

# Bugs?

- Dexie PSD doesn't seem to leave current zone correctly
  - needed to `.then.then` rather than just `.then` on the final result
- Does it stay in zone after many async ops?
