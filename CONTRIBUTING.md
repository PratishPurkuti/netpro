# Contributing

Use Node 24, run `npm ci`, and develop with `npm run dev`. Use only synthetic data in fixtures, screenshots, bug reports and tests. Never commit `.env` files, data directories, backups, keys or logs.

Run tests, lint, typecheck and production build before opening a pull request. AI tests must mock network responses and never require a paid API key. Changes affecting sessions, consent, endpoint validation, imports or evidence validation need meaningful regression tests. Preserve the single-owner model and ordinary offline search.

Database changes require a numbered forward migration and recovery notes; do not modify deployed migration history. Public behavior and operational guides must reflect the implementation. Inspect `git diff --cached`, run `npm run secrets`, and review screenshots before pushing.
