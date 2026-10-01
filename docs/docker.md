# Docker Compose

Install Docker Engine with Compose, then in the repository:

```sh
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set the generated key in `.env`; Compose uses this file for substitution. Then:

```sh
docker compose up --build -d
docker compose logs --tail=50 netpro
```

Open http://localhost:3000 and complete first-run setup. The host port binds only to 127.0.0.1. The app binds to all interfaces **inside the container**. `netpro-data` stores SQLite and `netpro-backups` stores recovery exports. Startup applies migrations. The image runs as the non-root Node account.

```sh
docker compose stop
docker compose start
docker compose down
```

`down` retains named volumes. **Do not use `down -v` unless intentionally destroying all personal data and backups.** Back up volumes before upgrading and retain the encryption key separately. See [backup.md](backup.md). The Docker configuration is provided; consult release verification notes for whether Docker was available during release testing.

For a local model running on the host, `localhost` inside Docker refers to the container. A deliberate `host.docker.internal` endpoint may work depending on your Docker platform. It requires `ALLOW_PRIVATE_AI=true` and explicit consent, and gives the owner-configured endpoint access to private network destinations. Keep it disabled otherwise.
