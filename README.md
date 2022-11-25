# QueryScript

## Disclaimer

This is right now nothing more than a quick experiment, not even a proof of concept.

## Idea

SQL is an important tool for modern web development, but it's lacking many features we expect from a modern language.

QueryScript is a TypeScript library to write SQL giving you features like static type checking, code composition, modules, packages, etc...

QueryScript uses two layers of type checking for sql. All your QueryScript code will be checked by the TypeScript compiler. In a second step QueryScript will compile your code to sql, while running a more complete set of checks.

## Design

QueryScript represents SQL code as functions that transform one Database into another. Each individual SQL statement, like createTable, dropTable, select, etc... is represented as such a function. The relation between the input type and return type of these functions is used to keep track of changes to the database schema.

The builtin functions can then be composed to form sql migrations, which can be composed to create larger migrations and so far and so forth.

Each migration can be compiled by providing a base schema (empty in the simplest case) against which the type checker will evaluate each statement. Almost as a byproduct SQL code will be generated.

To make working with this monadic construct easier all built-in statements are also provided as methods

## Example Usage

### Using free functions

```ts
export const migration = sql(
  createTable("posts", column("id", String)),
  createTable("users", column("id", String)),
  createTable(
    "accounts",
    column("userId", (db) => db.users.id)
  )
);
```

### Using methods

```ts
export const migration = sql(
  (db) =>
    db
      .createTable("posts", (tbl) =>
        tbl
          .column("id", String)
          .column("title", String)
          .column("create_at", Date)
      )
      .createTable("users", (tbl) => tbl.column("id", String)),
  // Create a new binding for db that has access to db.users
  (db) =>
    db
      .createTable("accounts", (tbl) => {
        // Alternative approach to get updated typings
        const tbl1 = tbl.column("id", String).column("userId", db.users.id);
        // tbl1 has members .id and .userId while tbl didn't change
        return tbl1.unique(tbl1.id).unique(tbl1.userId);
      })
      .dropTable("posts")
);
```

### Compilation

```ts
const output = compile(migration);
console.log(output.$sql);
```
