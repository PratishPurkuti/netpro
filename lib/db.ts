import knex from "knex";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
const file = resolve(
  /* turbopackIgnore: true */ process.env.DATABASE_PATH ||
    "./data/netpro.sqlite",
);
mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
const globalDb = globalThis as unknown as {
  netproDb?: ReturnType<typeof knex>;
  netproReady?: Promise<void>;
};
export const db = (globalDb.netproDb ??= knex({
  client: "better-sqlite3",
  connection: { filename: file },
  useNullAsDefault: true,
  pool: {
    min: 1,
    max: 1,
    afterCreate(
      connection: { pragma: (sql: string) => void },
      done: (error: null, connection: unknown) => void,
    ) {
      connection.pragma("journal_mode = WAL");
      connection.pragma("busy_timeout = 5000");
      done(null, connection);
    },
  },
}));
export async function ready() {
  await (globalDb.netproReady ??= db.migrate
    .latest({ directory: resolve("migrations"), loadExtensions: [".cjs"] })
    .then(() => undefined));
}
export async function contacts() {
  await ready();
  return (await db("contacts").select()).map((r) => JSON.parse(r.record));
}
export async function owner() {
  await ready();
  return db("owner").where({ id: 1 }).first();
}
export async function settings() {
  await ready();
  const r = await db("settings").where({ id: 1 }).first();
  return r
    ? JSON.parse(r.record)
    : {
        provider: "openai",
        model: "",
        endpoint: "https://api.openai.com/v1",
        revision: 0,
        consent: false,
      };
}
