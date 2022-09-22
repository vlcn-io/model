A concept to explore in the future: Post-Facto Relational.

The user creates their data as normal types within their programming language.

The user also defines "roots" that should never be deleted. E.g., a user type.

We augment instances types with a uuid on create.

For each new type (class) we create a relation (table) that has weak refs to all instances of that type.

Whenever an instance is updated or created, we crawl it for pointers to other model instances. We then index and model these appropriately as foreign key or junction relationships.

Persistence persists the relations and replaces pointers with uuid refs.

Re-hydration pulls from relations and follows pointers if/when needed.

I.e., We create a relational model by normalizing the denormalized representation. We can then give the user query APIs to interface with their data in a relational manner when needed.
