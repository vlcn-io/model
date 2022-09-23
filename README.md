`Vulcan.sh` is an exploration of how to simplify [aphrodite.sh](https://aphrodite.sh)

Hephaestus is too hard to say and spell [hence the name Vulcan](https://en.wikipedia.org/wiki/Hephaestus#:~:text=Hephaestus%27s%20Roman%20counterpart%20is%20Vulcan).

`aphrodite.sh` apis are cumbersome in a few areas. The main culprits being a reliance on the concept of "changesets" (fixed here via [transactional memory](https://github.com/aphrodite-sh/vulcan/tree/main/ts/packages/value/README.md)), requiring a "context" parameter to be passed to all function calls (potentially fixed via [context-provider](https://github.com/aphrodite-sh/vulcan/tree/main/ts/packages/context-provider) or more likely just a config object), and encouraging "named" mutations (removed from next build of aphrodite).

Other culprits are:

- the query APIs being 100% async even for in-memory data stores
- asking the developer to remember to await their writes if they want to do an immediate read-after-write
- ddl? maybe? This is probably a necessary complexity and unlocks future simplicity

The current most interesting part of vulcan is here: https://github.com/aphrodite-sh/vulcan/tree/main/ts/packages/value/README.md
