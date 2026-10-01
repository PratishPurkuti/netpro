# NetPro 1.0.0 — September 30, 2026

Initial single-owner self-hosted release: structured contacts, local network search, full profiles, persisted conversations, optional consent-based AI selection, encrypted credentials, private backup/restore and responsive dark UI.

## Verified locally

- 25 automated checks passed using isolated SQLite databases, synthetic fixtures and a local mock provider. Coverage includes protected endpoints, origin protection, concurrent setup, login/session behavior, contact CRUD/validation, duplicates, direct/tentative retrieval, contextual follow-ups, consent/revocation and destination changes, invalid model output, injected notes, provider errors/redirects, stale/deleted contacts, and import/export.
- Production build, ESLint and TypeScript checks passed.
- Headless Chromium desktop (1440 × 1050) and mobile (390 × 844) journeys passed: first-run setup, search, profiles, editing, export/download, import preview/replacement, mobile create/delete, logout/login. No browser page errors; checked horizontal overflow. Screenshots contain only synthetic contacts.
- Dependency installation reported zero known vulnerabilities. Staged secret/private-path scan and diff review are required for publication.

This Windows desktop sandbox blocks `os.userInfo()` for Node. Verification used a temporary preload outside the repository to supply an OS username for the test runner. It is not shipped or required on ordinary Node installations. SQLite uses bundled platform binaries; no local compiler is needed for the tested platform.

## Material limits

- No paid/live provider call has been verified; model integration was tested against mocked Chat Completions responses.
- Docker configuration and persistent volumes are provided, but Docker is not installed in this environment, so container build/run is unverified.
- PostgreSQL/Vercel hosting is a documented future migration, not implemented or deployed.
- Retrieval is conservative lexical matching with small synonym support. Complex paraphrases and ambiguous follow-ups may require clearer queries; evidence is always shown. Free-text redaction is best effort.
- Private JSON imports have a 2 MB API cap (1.9 MB browser upload cap); large chat histories may need contacts-only backup.
- No independent security audit has been performed. Use HTTPS and a trusted single-owner environment for intentional remote access.

See the architecture, privacy, installation and backup guides for operational details.
