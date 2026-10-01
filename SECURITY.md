# Security

NetPro stores personal contacts. Use a trusted single-owner installation, current Node/dependencies, OS disk encryption, private file permissions, and HTTPS for remote access. See [privacy](docs/privacy.md) and [architecture](docs/architecture.md).

Do not include personal data, API keys, session cookies or backups in public issues. Report vulnerabilities privately through the repository's GitHub private vulnerability reporting if enabled; otherwise contact the repository maintainer privately before publishing details. The repository owner must enable private reporting after publication. No monitored email address is claimed by this template.

Version 1.x receives fixes as maintainers are available; no response-time SLA. This initial release has not undergone an independent security audit. Restore and remote-hosting configurations should be tested on synthetic data before use.

If a secret reaches Git history, stop pushes, revoke/rotate it, remove it from all history before publication, and invalidate affected sessions. `.gitignore` and staged scanning reduce accidents but do not replace manual review.
