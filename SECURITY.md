# Security Policy

## Reporting a vulnerability

Please use the repository's private **Security → Report a vulnerability** form. Do not open a public issue containing credentials, personal data, exploitable URLs, or reproduction steps for an unpatched vulnerability.

## Secrets

The repository must never contain:

- `.dev.vars` or `.env` values
- Google OAuth credentials
- Cloudflare API tokens
- `ADMIN_SYNC_TOKEN` values
- D1 exports containing user accounts, sessions, watchlists, or transaction records

Cloudflare secrets must be configured through Wrangler or the Cloudflare dashboard.
