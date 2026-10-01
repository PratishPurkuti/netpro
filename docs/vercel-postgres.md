# Future Vercel / durable PostgreSQL migration

The initial release is a long-running single-owner Node server with SQLite. **Do not deploy this version directly to Vercel.** Its local filesystem is not durable writable storage across serverless instances. No Vercel deployment was performed.

Migration plan:

1. Provision durable hosted PostgreSQL with TLS and connection pooling appropriate for Vercel. Keep one owner per independently deployed installation/database.
2. Add the `pg` driver. Refactor `lib/db.ts` to select a Knex PostgreSQL client via `DATABASE_URL`; remove SQLite pragmas and local directory creation. Create/test equivalent PostgreSQL migrations. Existing string records can remain text initially or become JSONB through an explicit migration.
3. Revisit single-owner creation: maintain the fixed ID unique constraint, use PostgreSQL transactional insert-conflict handling, and verify concurrent setup/login/import in integration tests. Preserve server-side session tokens and persisted rate limits across instances.
4. Export contacts/profile/chats from SQLite using private versioned JSON. Run PostgreSQL migrations and first-run setup in the new installation; import the JSON. Do not copy SQLite files into a function bundle. Credentials are intentionally excluded and must be configured separately.
5. Replace local `backups/` writes with a private durable object store or a PostgreSQL backup table. Pre-replacement backup must complete before transactional replacement. Add durable backup lifecycle controls and use the host's database snapshots/PITR.
6. Store `DATABASE_URL`, `NETPRO_ENCRYPTION_KEY`, `APP_ORIGIN` and `COOKIE_SECURE=true` in Vercel environment secret settings. Keep encryption keys separate from database snapshots. Never use `NEXT_PUBLIC_` for secrets. Enable only the intended environment/provider destinations and consent separately after migration.
7. Review provider networking and serverless request-duration limits, distributed login limits, exact Origin checks, connection pooling and reverse proxy configuration. Pin allowed outbound endpoints or preserve DNS validation/pinning. Set `ALLOW_PRIVATE_AI=false`.
8. Run all tests plus PostgreSQL integration, backup failure/concurrency and production HTTPS browser tests before switching traffic. Keep the original stopped SQLite installation and private backup for rollback.

This is a migration guide, not implemented dual-database compatibility. Persistence is isolated, but transaction, driver, migration and recovery semantics require explicit testing before changing backend.
