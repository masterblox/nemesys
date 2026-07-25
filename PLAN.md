# Nemesys — Community Update Radar

**One-liner:** Public update intelligence for agent skills across the multiverse.

Nemesys is a community product for fleet operators who want to discover public
agent skills, understand what changed, evaluate risk and compatibility, and
decide whether to install, watch, or skip.

## Product loop

1. Nemesys discovers public skills, repositories, creators, releases, and
   emerging community signals.
2. Operators inspect source attribution, revisions, diffs, permissions, audits,
   and buzz.
3. **Ask Dev** compares a skill with a small, browser-local set of fleet
   capabilities.
4. Nemesys returns an explainable **Fits**, **Review**, or **Blocked** verdict.
5. Operators install, watch, skip, or create a privacy-safe share card.

## Public data model

- **Skill:** a confirmed, installable public agent capability.
- **Update:** a content-hash or release change to a public skill.
- **Signal:** an X post, article, or repository discovery that is not yet a
  verified skill.
- **Creator / Repository:** attributed public source profiles.
- **Audit:** public security evidence from upstream audit providers.

Local packages, private repositories, client data, and fleet profiles never
enter the public catalog.

## MVP

- Next.js/TypeScript public website hosted on Openship.
- PostgreSQL catalog containing only public metadata and sanitized share cards.
- Skills.sh and public GitHub aggregation, refreshed hourly.
- Searchable update feed, skill details, readable diffs, creator/repository
  profiles, audits, signals, and install commands.
- Anonymous Ask Dev dialog with runtime/model/tool/policy chips.
- Three assessments per device/day; capability selections remain in the
  browser and are not persisted server-side.
- Carlos-only X bookmark sync into a private curator inbox. Every item requires
  explicit approval before it becomes a public signal.

## Privacy and safety

- Never accept secrets, prompts, memories, client data, or repository contents
  in Ask Dev.
- Hosted assessment receives only selected capability names and public skill
  metadata for one request.
- Failed audits and explicit incompatibilities cannot be overridden by AI.
- X tokens are encrypted at rest and use read-only bookmark scopes.
- Share cards exclude fleet selections and contain only public reasoning.

## Deferred

- Private package registries and client tenants.
- Full fleet scanners/importers.
- Hermes/Conductor deployment automation.
- Community X connections and creator claims.
- Nemesys-native publishing.

The CLI remains secondary tooling. Public discovery uses Skills.sh identifiers
(`owner/repo@skill`); local search is an explicit development-only mode.
