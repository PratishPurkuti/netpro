# Local installation

Install Node.js 24 LTS and Git. Download or clone this repository, open a terminal in its directory, and run:

```sh
npm ci
cp .env.example .env.local
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

On Windows PowerShell use `Copy-Item .env.example .env.local` instead of `cp`. Paste the generated 64-character value into `NETPRO_ENCRYPTION_KEY` in `.env.local`. Keep that file private. Next.js reads it automatically. Never reuse the example placeholder. AI credential storage will fail safely if the key is missing or invalid; ordinary contacts and search still work.

```sh
npm run build
npm start
```

Open **http://localhost:3000** (use this exact hostname to match `APP_ORIGIN`). Create a username, a password of at least 12 characters, and your owner profile. Setup is disabled once the owner exists. Configure optional AI later in Settings. Migrations run automatically before the first database access. For development, run `npm run dev`.

CLI scripts use environment variables from your shell, not Next's automatic dotenv loading. Use Node's explicit environment loading for a manual migration:

```sh
node --env-file=.env.local --import tsx scripts/migrate.ts
```

The default database is `data/netpro.sqlite`. Do not sync the running SQLite database using cloud file synchronization software. Use a single running instance per SQLite file.

## Synthetic demo

After creating an account in a dedicated demonstration installation:

```sh
npm run demo
npm run demo -- --reset --confirm-demo-only
```

Both commands seed six explicitly synthetic contacts. Reset removes only their six reserved IDs before re-adding them. If any other contacts exist, seeding refuses to mix data unless you explicitly pass `--allow-mixed`. Custom `DATABASE_PATH` must be supplied to the CLI through the shell or `node --env-file=.env.local --import tsx scripts/demo.ts`. Never use the synthetic seed against personal data unintentionally.

## Account recovery

Stop the application. Make a private database backup. Create a temporary text file containing only a new password (12–128 characters), restrict it to your OS account, and run:

```sh
node --env-file=.env.local --import tsx scripts/recover.ts /absolute/path/to/private-password-file
```

The script changes only the password, reports the existing username, revokes every session, and clears login lockouts. Securely remove the temporary file afterward, then restart. It requires local filesystem access; there is no unauthenticated web recovery endpoint. Protect disk access because someone who controls your database or encryption key can control your installation.

## Secure remote access

Default Node and Compose ports bind to localhost. To expose the app intentionally, put it behind a maintained HTTPS reverse proxy or private VPN. Set `APP_ORIGIN` to the exact HTTPS URL and `COOKIE_SECURE=true`, preserve the public Origin header, and bind the app only to the proxy's private interface. Replace the start command's hostname only for this deliberate configuration. Add proxy-level request limits and rate limiting. Never expose development mode. Keep Node and dependencies updated, secure volume permissions, and use firewall rules. There is no public registration or multi-user isolation.

## Developer checks

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run secrets
```

Secret scanning checks staged files; stage intended public files first. Tests require no external model calls. `npm run test:browser` requires Chromium installed with `npx playwright install chromium`; it starts a production server on port 3100 and uses an isolated synthetic database. Run `npm run build` first. Screenshots are regenerated from synthetic data only.
