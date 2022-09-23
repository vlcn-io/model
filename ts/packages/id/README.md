# vulcan.sh/id

`UUIDs` aren't great when it comes to using them as keys in a database. This has been covered in numerous blog posts. These two do a good job of explaining the problems:

- https://www.percona.com/blog/2019/11/22/uuids-are-popular-but-bad-for-performance-lets-discuss/
- https://thenewobjective.com/software-systems-engineering/sql-server-and-uuids

There's a new UUID format proposed to fix this issue:
https://datatracker.ietf.org/doc/html/draft-peabody-dispatch-new-uuid-format

While this package does not implement that format it implements a derivation of [uuid_short](https://mariadb.com/kb/en/uuid_short/) proposed at the bottom of [this article](https://www.percona.com/blog/2019/11/22/uuids-are-popular-but-bad-for-performance-lets-discuss/).

# What again?

tldr: this package generates 64bit integer ids which, between a bounded set of devices, will be unique.

Proof please?
