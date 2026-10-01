# Backup and restore

Settings → Export downloads a version-1 JSON file containing contacts and owner profile. Choose the second export button to include conversations. It excludes login credentials, password hashes, session tokens, settings, API keys and the encryption key. **The file contains personal data: store it privately outside Git.** Import accepts at most 1.9 MB through the browser and 2 MB at the API; contacts-only exports are recommended for large chat histories.

Select a JSON backup in Settings. The server validates the entire schema and unique IDs before presenting contact/chat counts and profile name. No writes happen during preview. Replace requires typing `REPLACE`, deletes existing contacts and chats, then restores the provided profile and contacts (plus chats if included). Before replacement, a recoverable private export is saved in `backups/before-import-*.json`. Database replacement is transactional. Login credentials and AI settings are preserved. Importing a contacts-only backup clears existing chats as disclosed by the confirmation. Recovery backups are excluded from Git and Docker build context.

To recover a replacement, import the saved recovery JSON using the same flow. Check the preview first. Imports are versioned; unknown versions, unexpected top-level keys and duplicate IDs fail. Import does not restore AI credential settings; configure them independently.

## Full SQLite backup (recommended before upgrades)

1. Stop NetPro completely (`Ctrl+C` or `docker compose stop`). Ensure no second process has this SQLite file open.
2. Copy the **entire data directory**, including any `-wal` and `-shm` files, into a private timestamped directory outside the project. Stopping writers is essential for a consistent filesystem copy. Alternatively use SQLite's online backup tooling; do not copy a changing DB file alone.
3. Back up `.env.local` / `.env` or the encryption key into a separate secure password manager. Keep it separate from the database. Encrypted API keys cannot be decrypted without the original encryption key.
4. For restore, stop the app; preserve the current data directory separately; replace the data directory with the complete backed-up directory; restore its matching encryption key and permissions; start NetPro and verify contacts.

Do not combine a restored SQLite DB with leftover WAL/SHM files from a different snapshot. A full DB copy includes passwords, sessions and encrypted provider credentials, unlike JSON exports; keep it especially private. Invalidate existing sessions using the local recovery command if necessary.

## Docker volume copy

After `docker compose stop`, identify volume names with `docker volume ls` (Compose usually prefixes the project name). Use a trusted temporary container to copy each complete volume into a mounted private backup folder. Example for a volume named `netpro_netpro-data` from a POSIX shell:

```sh
mkdir -p /private/netpro-backup
docker run --rm -v netpro_netpro-data:/from:ro -v /private/netpro-backup:/to alpine sh -c 'cd /from && tar czf /to/data.tar.gz .'
```

Repeat for the backup volume. On Windows, use an absolute Docker-compatible host path in place of `/private/netpro-backup`. Restore into a stopped volume using `tar xzf` after preserving the existing contents elsewhere. Retain UID ownership for the non-root `node` user (UID 1000). Restart only after restoring the matching key. Never delete volumes during routine upgrades.
