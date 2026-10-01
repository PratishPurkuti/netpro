import { ready, db } from "../lib/db";
await ready();
console.log("Migrations complete.");
await db.destroy();
