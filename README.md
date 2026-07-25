# Nemesys Community Update Radar

Nemesys indexes public agent skills and source repositories, detects content
changes, shows readable diffs and audits, and provides a privacy-minimized
compatibility check.

## Local development

```bash
npm install
npm run dev
```

Without environment variables, the public site runs with representative public
demo data. Curator features remain disabled and do not expose fake inbox data.

## Database

Create a PostgreSQL database and apply:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

The database stores public catalog metadata, update history, curator inbox
state, encrypted X tokens, rate counters, and sanitized share cards. It does
not store fleet capability selections or raw assessment prompts.

## Openship production environment

Configure the following masked environment variables in the Openship project:

- `DATABASE_URL`
- `VERCEL_OIDC_TOKEN` for the authenticated Skills.sh API
- `GITHUB_TOKEN` for public repository metadata
- `CRON_SECRET`
- `OPENAI_API_KEY` and `ASSESSMENT_MODEL`
- `ASSESSMENT_SIGNING_SECRET`
- `CURATOR_ALLOWED_X_IDS` containing Carlos's numeric X user ID
- `CURATOR_SESSION_SECRET`
- `TOKEN_ENCRYPTION_KEY` as a base64-encoded 32-byte value
- `X_CLIENT_ID`, `X_CLIENT_SECRET`, and the exact production callback URL

Generate secrets with:

```bash
openssl rand -base64 32
```

Apply an X Developer Console spending limit before enabling bookmark sync.
Nemesys also enforces `X_DAILY_READ_LIMIT` and records an estimated read cost.

## Scheduled jobs

Create hourly Openship jobs that call:

- `/api/cron/catalog` hourly to refresh public skills, repositories, hashes,
  revisions, diffs, and audits.
- `/api/cron/bookmarks` hourly to refresh the allowlisted curator inbox.

Both routes require `Authorization: Bearer $CRON_SECRET` and fail closed when
the secret is absent.

## Validation

```bash
npm run lint
npm test
npm run build
cd cli && npm test
```

## Privacy guarantees

- Public catalog entries must resolve to public Skills.sh and GitHub sources.
- Ask Dev accepts named capability chips only.
- Fleet selections remain browser-local and are sent transiently for one check.
- Share cards are reconstructed from public skill evidence and never contain
  fleet selections.
- X bookmarks stay private until Carlos explicitly approves an item.
