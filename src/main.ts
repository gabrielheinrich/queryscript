type StringLiteral<T> = T extends string
  ? string extends T
    ? never
    : T
  : never;

function makeObject<K, T>(key: StringLiteral<K>, table: T) {
  return { [key]: table } as { [P in StringLiteral<K>]: T };
}

type BaseSchema = {};

type WithEntry<S extends BaseSchema, K, V> = S & { [P in StringLiteral<K>]: V };

type Db<S extends BaseSchema> = S & {
  $sql: string;
  createTable: <N, C extends BaseColumns>(
    name: StringLiteral<N>,
    table: (t: Table<{}, N>, db: Db<S>) => Table<C, N>
  ) => Db<WithEntry<S, N, Table<C, N>>>;
  dropTable: <N>(name: StringLiteral<N>) => Db<Omit<S, StringLiteral<N>>>;
};

type BaseColumns = {};

type Column<N> = {
  $name: StringLiteral<N>;
  $sqltype: "column";
  desc: any;
};

type Table<C extends BaseColumns, TableName> = C & {
  $name: StringLiteral<TableName>;
  $sqltype: "table";
  $body: string[];
  column: <N>(
    name: StringLiteral<N>,
    desc: any
  ) => Table<WithEntry<C, N, Column<N>>, TableName>;
  unique: <N>(column: Column<N>) => Table<C, TableName>;
};

function sql<A extends BaseSchema, B extends BaseSchema>(
  ab: (a: Db<A>) => Db<B>
): (a: Db<A>) => Db<B>;
function sql<A extends BaseSchema, B extends BaseSchema, C extends BaseSchema>(
  ab: (a: Db<A>) => Db<B>,
  bc: (b: Db<B>) => Db<C>
): (a: Db<A>) => Db<C>;
function sql<
  A extends BaseSchema,
  B extends BaseSchema,
  C extends BaseSchema,
  D extends BaseSchema
>(
  ab: (a: Db<A>) => Db<B>,
  bc: (b: Db<B>) => Db<C>,
  cd: (c: Db<C>) => Db<D>
): (a: Db<A>) => Db<D>;
function sql(...statements: any[]): any {
  return (result: any) => {
    for (const statement of statements) {
      result = statement(result);
    }
    return result;
  };
}

export { sql };

const createDatabase = <S extends BaseSchema>(
  schema: S,
  $sql: string
): Db<S> => {
  function createTable<N, C extends BaseColumns>(
    name: StringLiteral<N>,
    table: (table: Table<{}, N>, db: Db<S>) => Table<C, N>
  ): Db<WithEntry<S, N, Table<C, N>>> {
    const defineTable = <C extends BaseColumns>(
      columns: C,
      $body: string[]
    ): Table<C, N> => {
      function column<ColumnName>(
        name: StringLiteral<ColumnName>,
        desc: any
      ): Table<WithEntry<C, ColumnName, Column<ColumnName>>, N> {
        return defineTable(
          {
            ...columns,
            ...makeObject(name, { desc, $name: name, $sqltype: "column" }),
          },
          [...$body, `${name} string`]
        );
      }

      function unique<ColumnName>(column: Column<ColumnName>): Table<C, N> {
        return defineTable(columns, [...$body, `unique ${column.$name}`]);
      }

      return {
        ...columns,
        $name: name,
        $body,
        $sqltype: "table",
        column,
        unique,
      };
    };
    const tbl = table(defineTable({}, []), createDatabase(schema, $sql));
    return createDatabase(
      {
        ...schema,
        ...makeObject(name, tbl),
      },
      $sql + `create table ${name} (\n\t${tbl.$body.join(",\n\t")}\n);\n`
    );
  }

  function dropTable<N>(name: StringLiteral<N>): Db<Omit<S, StringLiteral<N>>> {
    const { [name]: _, ...newSchema } = schema;
    return createDatabase(newSchema, $sql + `drop table ${name};`);
  }

  return {
    ...schema,
    $sql,
    createTable,
    dropTable,
  };
};

export function createTable<N, C extends BaseColumns, S extends BaseSchema>(
  name: StringLiteral<N>,
  table: (t: Table<{}, N>, db: Db<S>) => Table<C, N>
) {
  return (db: Db<S>) => db.createTable(name, table);
}

export function column<ColumnName>(name: StringLiteral<ColumnName>, desc: any) {
  return <C extends BaseColumns, TableName, S extends BaseSchema>(
    table: Table<C, TableName>,
    db: Db<S>
  ) => {
    return table.column(name, desc);
  };
}

export const compile = <S2 extends BaseSchema>(
  migration: (s: Db<{}>) => Db<S2>
) => {
  return migration(createDatabase({}, ""));
};
