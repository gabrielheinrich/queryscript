import { sql, createTable, column, compile } from "./main";

describe("example", () => {
  test("first test", () => {
    const migration = sql(
      (db) =>
        db
          .createTable("posts", (tbl) => tbl.column("id", String))
          .createTable("users", (tbl) => tbl.column("id", String)),
      // Create a new binding for db that has access to db.users
      (db) =>
        db
          .createTable("accounts", (tbl) => {
            // Alternative approach to get updated typings
            const tbl1 = tbl.column("id", String).column("userId", db.users.id);
            // tbl1 has members .id and .userId while tbl is empty
            return tbl1.unique(tbl1.id).unique(tbl1.userId);
          })
          .dropTable("posts")
    );

    const migration2 = sql(
      createTable("posts", column("id", String)),
      createTable("users", column("id", String)),
      createTable("accounts", column("userId", column("id", String)))
    );

    const output = compile(sql(migration));
    console.log(output.$sql);
  });
});
