# Privacy and trust

All contact management and ordinary search run on your installation. No external enrichment, web search, telemetry, scraping, relationship scores, automatic outreach or public registration. Contact links are opened manually by the owner. Optional model requests happen only with stored explicit consent for the current provider and endpoint. No API key is returned to the browser or included in exports.

Contact fields, notes and chat text are untrusted data. They cannot invoke tools or run code; React escapes them. Models may interpret text differently, so the response format cannot include generated claims: only IDs and field references. Rendered methods and evidence always come from your database.

Personal data is stored unencrypted in SQLite and JSON backups; **only API credentials are encrypted**. Use OS disk encryption, private permissions, a strong owner password, private backups, and a secure separate encryption-key backup. An attacker with local filesystem write access can reset the account. This app is for a single trusted owner, not hostile tenant isolation. Browser caches of API data are disabled, but secure your OS account and browser.

Do not paste API keys or sensitive methods into notes/profile/chat. Known contact values and common emails/phones/URLs are redacted, but free-text redaction is not a complete privacy filter. Consent disclosure lists all categories that might be sent. Consent revocation prevents pending requests from dispatching or using returned AI results; it cannot unsend data already received by a provider.

`ALLOW_PRIVATE_AI=true` permits intentional private-network or HTTP model endpoints, such as a trusted Ollama/OpenAI-compatible server. This widens SSRF and credential-destination exposure. Enable only on a trusted local installation, review the exact endpoint, protect that server, and avoid cleartext traffic across untrusted networks. Requests never follow redirects, including with this option.
