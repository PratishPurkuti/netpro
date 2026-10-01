import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { db, ready } from "./db";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function checkPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(":");
  const expected = Buffer.from(hex, "hex");
  return (
    expected.length === 64 &&
    timingSafeEqual(expected, scryptSync(password, salt, 64))
  );
}
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function session() {
  const token = randomBytes(32).toString("hex");
  await db("sessions").where("expires", "<", Date.now()).delete();
  await db("sessions").insert({
    id: digest(token),
    expires: Date.now() + 7 * 86400000,
  });
  return token;
}
export async function authorized(token: string | undefined) {
  await ready();
  return (
    !!token &&
    !!(await db("sessions")
      .where({ id: digest(token) })
      .where("expires", ">", Date.now())
      .first())
  );
}
export async function limit(id: string, maximum = 8) {
  await ready();
  return db.transaction(async (trx) => {
    const now = Date.now();
    const row = await trx("attempts").where({ id }).first();
    if (row && row.until > now && row.count >= maximum)
      throw new Error("Too many attempts. Try again in 15 minutes.");
    await trx("attempts")
      .insert({
        id,
        count: row && row.until > now ? row.count + 1 : 1,
        until: row && row.until > now ? row.until : now + 900000,
      })
      .onConflict("id")
      .merge();
    await trx("attempts").where("until", "<", now).delete();
  });
}
function encryptionKey() {
  const key = process.env.NETPRO_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(key))
    throw new Error(
      "Set NETPRO_ENCRYPTION_KEY to 64 random hex characters before saving AI credentials.",
    );
  return Buffer.from(key, "hex");
}
export function encrypt(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body]
    .map((v) => v.toString("hex"))
    .join(":");
}
export function decrypt(secret: string) {
  const [iv, tag, body] = secret.split(":").map((v) => Buffer.from(v, "hex"));
  const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(body), cipher.final()]).toString("utf8");
}
