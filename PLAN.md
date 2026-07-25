# Nemesys — Agent Update Registry

**Domain:** nemesys.dev (pending purchase by Carlos)
**GitHub:** masterblox/nemesys
**Aesthetic:** Rick & Morty / interdimensional cable / portal-green HUD

---

## What It Is

Nemesys is an **agent update registry and feed** — the place where fleet operators find, publish, and track updates for their agents. Like NPM for agents. Like a package registry for AI personalities, skills, profiles, and configurations.

**The core loop:**
1. Someone publishes an agent update (skill bump, profile patch, config change)
2. Every fleet operator who subscribes to that source sees it in their feed
3. They review, pull, and deploy — or skip

**The one-liner:** "Updates for your agents across the multiverse."

---

## Why Nemesys

| Problem | Solution |
|---|---|
| Agent skills live scattered across repos, DMs, and local files | Central registry — one source of truth for every skill version |
| No changelog or diff view for agent updates | Version history with diffs, author credit, semver |
| No notification when a skill you depend on updates | Subscriptions / feed per agent or publisher |
| Fleet operator has to git-pull every repo manually | Pull from Nemesys: `nemesys pull juridoico-gdpr-breach --update` |

**Who it serves:**
- **Fleet operators** (us) — subscribe to agent updates across our own fleet
- **Agent publishers** (future) — third parties publish agent skills to the registry
- **Client tenants** — each client gets their own scoped feed

---

## Aesthetic — Rick & Morty / Interdimensional Cable

**Palette:**

| Token | Color | Usage |
|---|---|---|
| Portal Green | `#97ce4c` | Primary accent, CTAs, active states |
| Portal Purple | `#b966e7` | Secondary accent, hover states |
| Dark Void | `#0a0a0a` | Background |
| Jerry's Blue | `#5d9cec` | Info / links |
| Smith Family | `#e3a343` | Warnings / attention |
| White (dim) | `#d1d5db` | Body text |

**Visual language:**
- Portal swirl loaders instead of spinners
- Glitch effect on version bumps and "new update" badges
- Mr. Meeseeks loading state for installs ("Existence is pain, installing...")
- Interdimensional cable ticker at top: scrolling latest updates from across the multiverse
- Circular portrait frames for agent avatars (floating head style)
- Grid background: dimension-hopping portal grid pattern
- Cards have slight CRT scanline overlay on hover
- Error states: "Jerry, you broke it." + portal-green retry button

**Tone:**
- Playful but functional — the skin is seasoning, not the meal
- System messages in-character but data stays clean and legible
- Navigation labels are normal (Feed, Registry, My Agents, Settings) — the R&M is in the chrome, not the UX

**Reference frames:**
- Season 1-3 aesthetic (cleaner, less busy) over later seasons
- "Interdimensional Customs" screen aesthetic for load screens
- Citadel of Ricks UI patterns for navigation

---

## Concept — Agent Update Registry

### Registry Structure

```
nemesys.dev/
  └─ @<publisher>/
       └─ <package>/
            ├─ v1.0.0/
            ├─ v1.1.0/
            └─ v2.0.0/
                 ├─ SKILL.md
                 ├─ config.yaml
                 ├─ profile.yaml
                 └─ changelog.md
```

### Entities

| Entity | Description |
|---|---|
| **Publisher** | Who published the package (e.g. `@masterblox`, `@juridico-labs`, `@community`) |
| **Package** | A named agent component (e.g. `gdpr-breach-sentinel`, `fleet-routing-enforce`, `juridico-onboarding`) |
| **Version** | Semver with required changelog entry |
| **Feed** | A subscription — get notified when packages you follow update |
| **Collection** | A curated bundle (e.g. "Fleet Essentials", "Portuguese Legal OS") |

### Actions

| Action | Description |
|---|---|
| `nemesys publish` | Push a new version of a package |
| `nemesys pull` | Pull latest version of a package |
| `nemesys feed` | Show what's new in your subscriptions |
| `nemesys diff` | Show changes between versions |
| `nemesys search` | Find packages |
| `nemesys subscribe` | Follow a package or publisher |
| `nemesys deploy` | Pull + apply to your fleet |

---

## Why the Name

**Nemesys** = tech-fied Nemesis:
- Greek goddess of retribution/balance — keeping your agents in check, aligned, and balanced
- Ends in 'ys' like a platform name, not a myth reference
- 5 letters, memorable, clean
- Fits the R&M multiverse theme — balance across infinite agent dimensions

---

## Implementation

### Phase 1 — Registry MVP (Core Concept)

- GitHub as the registry backend (packages = repos/tags)
- `nemesys.yml` manifest schema
- CLI tool in Go or Node: `nemesys search`, `nemesys publish`, `nemesys pull`
- Static feed page at nemesys.dev (or GitHub Pages)

### Phase 2 — Web Interface

- Nemesys.dev landing page with the R&M skin
- Feed view: what's new across subscribed packages
- Package detail pages with version history and changelogs
- Search and discovery

### Phase 3 — Integration

- Conductor bridge integration — deploy from Nemesys into Conductor workspace
- Hermes plugin — `hermes skill pull @masterblox/gdpr-breach-sentinel`
- Notifications — Telegram bot broadcasts new updates in your feed
- Webhook triggers on publish

### Phase 4 — Ecosystem

- CI/CD: auto-publish on git tag
- Package signatures / verification
- Private packages (client tenants)
- Rating system / usage stats

---

## What's Next

1. ✅ Name decided: **Nemesys**
2. 🔲 Carlos buys nemesys.dev on Squarespace
3. 🔲 Repo created (`masterblox/nemesys`) — **you are here**
4. 🔲 Phase 1: manifest schema + CLI prototype
5. 🔲 Phase 2: landing page with R&M skin
6. 🔲 Phase 3: Hermes integration

---

*"Existence is pain, Jerry. Update your agents."*
