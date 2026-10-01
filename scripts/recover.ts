import { readFile } from "node:fs/promises";
import { db, ready, owner } from "../lib/db";
import { hashPassword } from "../lib/auth";
import { credentials } from "../lib/schema";
await ready();
const file = process.argv[2];
if (!file)
  throw new Error("Usage: npm run recover -- /path/to/private-password-file");
const password = (await readFile(file, "utf8")).trim();
const o = await owner();
if (!o) throw new Error("No owner exists; use first-run setup.");
credentials.parse({ username: o.username, password });
await db.transaction(async (trx) => {
  await trx("owner")
    .where({ id: 1 })
    .update({ password: hashPassword(password) });
  await trx("sessions").delete();
  await trx("attempts").delete();
});
console.log("Password reset; all sessions revoked. Username: " + o.username);
await db.destroy();
