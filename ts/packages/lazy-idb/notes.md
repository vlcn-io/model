One collection.
Keeps everying by key-value.
On start, load all into memory and re-wire references via ids.
Persist ops received from persistor are normalized but still need a custom to-json to drop refs to models.

on hydrate, must walk the entire object and children to re-write refs.
refs encoded as:

```ts
x: {
  __vulcan_ref: id;
}
```
