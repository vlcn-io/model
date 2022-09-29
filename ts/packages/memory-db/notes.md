- let people install listeners on the memory db so they can mark off what data is dirty and thus persist deltas.
  - deleted or created/updated
- memory db needs a tx primitive...
  - we don't want to save the write of the thing to memory if the tx failed
    ^-- this is only the case if you're exposing a relational API over the mem db.
    not a problem if doc API.

So MVP should be doc db and memory db doesn't actually exist except as a way to track events for persist plugins.
