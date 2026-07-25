# Public-Facing Leak Check

## Total verdict: NO-GO

The requested `site/` directory does not exist in the working tree. It is also absent from the tracked files in `HEAD` and `origin/main`. No site files were available to audit, so public-facing safety cannot be confirmed.

This is the requested missing-directory escape condition, not a leak finding. There is no applicable `file:line` coordinate or severity because no file exists at the requested path.

## Category results

### 1. Hardcoded secrets — FAIL

No issues.

Audit could not be completed because `site/` does not exist. No `.js`, `.html`, `.css`, or `.md` files were available to scan for API keys, tokens, passwords, or strings matching `[A-Z]+_KEY=`, `[A-Z]+_TOKEN=`, or `[A-Z]+_SECRET=`.

### 2. Internal URLs — FAIL

No issues.

Audit could not be completed because `site/` does not exist. No files were available to scan for localhost names, loopback or private-range IP addresses, or `.local` domains.

### 3. Mechanica infrastructure references — FAIL

No issues.

Audit could not be completed because `site/` does not exist. No code, comments, or text were available to scan for `hermes`, `conductor`, `gateway`, `masterblox`, `bridge`, `fleet`, or `vault`.

### 4. Carlos personal data — FAIL

No issues.

Audit could not be completed because `site/` does not exist. No files were available to scan for `cprada`, `carlos prada`, email addresses, phone numbers, or physical addresses.

### 5. Image sources — FAIL

No issues.

Audit could not be completed because `site/` does not exist. No `<img src>` or CSS `url()` references were available to validate against the allowed `rickandmortyapi.com/*`, relative-path, and `data:` URI sources.

### 6. Comment audit — FAIL

No issues.

Audit could not be completed because `site/` does not exist. No multi-line or code comments were available to inspect for internal architecture, deployment, or infrastructure details.

### 7. File inclusion — FAIL

No issues.

Audit could not be completed because `site/` does not exist. No files were available to check for `.env`, credentials, `.netrc`, or configuration files.

## Required action

Restore or provide the intended `site/` directory, then rerun the complete leak check before merging or publishing.
