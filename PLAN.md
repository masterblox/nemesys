# Nemesys — Agent Update Registry

**Domain:** nemesys.dev (pending purchase by Carlos)
**GitHub:** masterblox/nemesys
**Aesthetic:** Mr. Nimbus bioluminescent sea-creatures + interdimensional cable chaos

---

## What It Is

Nemesys is an **agent update registry** where fleet operators find, assess, package, and deploy agent updates. Like NPM for agents — but smarter.

**The real flow (Carlos's workflow):**

1. You see something cool — tweet, GitHub repo, tool, product launch
2. You throw it at DEV or Jericho: "suitable for the fleet?"
3. DEV/Jericho analyses it: what does it do? Is it compatible? Does it conflict? What does it need?
4. If yes → Nemesys packages it as an agent update with full metadata
5. It appears in the fleet's feed — subscribe, pull, deploy
6. **Powered by Goliath** — the browser agent grabs the source, Nemesys understands and packages it

**"Skills that understand skills."** Nemesys isn't a file dump. It knows what a skill does, who it's for, what it needs (API keys, models, tools), and whether it's compatible with your fleet.

**The one-liner:** "Agent updates from across the multiverse — grabbed by Goliath, assessed by Jericho, delivered by Nemesys."

---

## Why the Name

**Nemesys** = tech-fied Nemesis:
- Greek goddess of retribution/balance — keeping your agents in check, aligned, and balanced
- Ends in 'ys' like a platform name, not a myth reference
- 5 letters, memorable, clean

---

## Aesthetic — Mr. Nimbus + Interdimensional Cable

Not just dark + portal green. **Colorful. Trippy. Bioluminescent.**

| Token | Color | Usage |
|---|---|---|
| Nimbus Blue | `#00d4ff` | Primary accent — like bioluminescent sea creatures |
| Portal Purple | `#b966e7` | Secondary / hover |
| Coral Pink | `#ff6b8a` | Warnings, new updates |
| Anemone Green | `#00ff88` | Success / active |
| Deep Void | `#0a0b1a` | Background — underwater dark |
| Mr. Nimbus Gold | `#ffd700` | Premium / featured |
| Jerry's Blue | `#5d9cec` | Info / links |

**Visual language:**
- **Bioluminescent glow** on interactive elements — pulsing, organic light
- **Interdimensional cable ticker** at top: scrolling updates from across the multiverse
- **Portal swirl loaders** instead of spinners
- **Glitch effect** on version bumps and "new update" badges
- **Mr. Meeseeks** loading state for installs ("Existence is pain, installing...")
- **Circular portrait frames** for agent/publisher avatars (floating head style)
- **Sea creature motifs** — organic curves, tentacle-like scrollbars, coral reef grid backgrounds
- **CRT scanline** overlay on card hover
- **Error states:** playful but functional. "Jerry, you broke it." + bioluminescent retry button
- **"Powered by Goliath"** badge on every package that was discovered via web grab

**Tone:**
- Playful but functional — the skin is seasoning, not the meal
- System messages in-character but data stays clean and legible
- Navigation labels are normal (Feed, Registry, My Agents, Settings) — the chaos is in the chrome

**Reference frames:**
- Mr. Nimbus episodes (S5E4, S6E1) — bioluminescent sea world aesthetic
- Interdimensional Customs screen for load/transition screens
- Citadel of Ricks UI for navigation density
- Season 1-3 overall (cleaner, less busy than later seasons)

---

## The Discovery Loop (Primary Flow)

```
                      ┌──────────────────────┐
                      │  You see something     │
                      │  cool (tweet, repo,    │
                      │  product, tool...)     │
                      └──────────┬───────────┘
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │  Throw at DEV/Jericho  │
                      │  "Suitable for fleet?" │
                      └──────────┬───────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
           ┌────────────────┐      ┌──────────────────┐
           │  YES → package  │      │  NO → discard     │
           │  via Nemesys    │      │  (maybe note it)  │
           └───────┬────────┘      └──────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Goliath grabs source │
        │  Jericho assesses fit │
        │  Nemesys packages it  │
        └───────┬──────────────┘
                │
                ▼
        ┌──────────────────────┐
        │  Appears in fleet    │
        │  feed → pull → deploy│
        └──────────────────────┘
```

### The Three Layers

| Layer | What | Who |
|---|---|---|
| **Grab** | Goliath browses the web, grabs repos/docs/tweets, extracts the source material | Goliath (browser agent) |
| **Assess** | Jericho analyses: what does it do? Compatible? Conflicts? Risk level? Fleet fit? | Jericho (intelligence layer) |
| **Package** | Nemesys wraps it in a manifest with all metadata, publishes to the registry | Nemesys (registry) |

---

## The Manifest Schema (The Core)

```yaml
# nemesys.yml — Package Manifest

name: gdpr-breach-sentinel
version: 1.2.0
publisher: masterblox
display_name: GDPR Breach Sentinel
description: 72-hour data breach notification compliance flow

category: legal
tags: [gdpr, compliance, eu-law, breach-notification]
jurisdiction: EU
language: en

runtime: hermes
runtime_min_version: "0.18"
format: skill-md

requires:
  models: [any]
  tools: [terminal, web_search]
  skills: [juridico-onboarding>=1.0.0]
  api_keys:
    - name: ANTHROPIC_API_KEY
      required: false
  system: [python3, pdflatex]

permissions:
  filesystem: read
  network: true
  subprocess: false
  secrets_access: false
  external_apis: false

risk_level: low
breaking_changes: false

source:
  type: adapted
  discovered_via: tweet
  origin: lawve.ai
  origin_url: https://lawve.ai/agents/gdpr-breach-sentinel
  original_license: AGPL-3.0
  grabber: goliath          # "Powered by Goliath" flex

assessment:                  # ← Jericho-generated intelligence
  suitable_for: [legal-firms, enterprise, compliance-teams]
  conflicts_with: []
  fleet_fit: strong
  model_cost: low
  tested_on: masterblox
  last_tested: 2026-07-25
  notes: "Pure EU regulation, safe deploy."
```

**Why it's different from package.json:**

| NPM | Nemesys |
|---|---|
| Lists deps | Lists deps **+ models + API keys + tools** |
| No permissions | **Permissions matrix** (fs, network, secrets, APIs) |
| No risk | **Risk level + breaking changes** |
| No provenance | **Where discovered + how grabbed** (+ "Powered by Goliath") |
| No intelligence | **Jericho suitability assessment baked in** |
| No runtime target | **Runtime + format + min version** |

The `assessment` block is the "suitable for fleet?" answer, baked into every package. You never need to ask again — it's right there.

---

## Registry Structure

```
nemesys.dev/
  └─ @<publisher>/
       └─ <package>/
            ├─ v1.0.0/
            ├─ v1.1.0/
            └─ v2.0.0/
                 ├─ nemesys.yml       # manifest
                 ├─ SKILL.md          # the actual skill
                 ├─ config.yaml       # optional config
                 └─ CHANGELOG.md      # what changed
```

### Entities

| Entity | Description |
|---|---|
| **Publisher** | Who published (e.g. `@masterblox`, `@juridico-labs`, `@community`) |
| **Package** | A named agent component |
| **Version** | Semver with required changelog |
| **Feed** | Subscription — notified when packages you follow update |
| **Collection** | Curated bundle ("Fleet Essentials", "Portuguese Legal OS") |

### CLI Actions

| Command | Does |
|---|---|
| `nemesys publish` | Push a new version |
| `nemesys pull` | Download latest |
| `nemesys feed` | What's new in your subscriptions |
| `nemesys diff` | Compare versions |
| `nemesys search` | Find packages |
| `nemesys subscribe` | Follow a package or publisher |
| `nemesys deploy` | Pull + apply to fleet |
| `nemesys assess` | Run Jericho assessment on a source URL |

---

## Community Play

- **Free for everyone** → maximum adoption, community traction
- **Later: charge for enterprise** — private packages, hosted feeds, SLAs, SSO
- **No account needed to browse** — open registry by default
- **The moat isn't hosting — it's intelligence.** Anyone can store files. Nemesys understands them.

---

## Security

Nemesys packages from community sources run in **credential-firewalled sandboxes** (using the Hermes egress proxy). The manifest's `permissions` block is enforced — if it says `network: false`, the sandbox physically can't reach the network. Real API keys never enter the sandbox.

This is what makes Nemesys safe for community packages. Without it, it's just a GitHub repo with YAML.

---

## Implementation

### Phase 1 — Schema + CLI MVP
- `nemesys.yml` manifest schema (reference spec — done)
- CLI tool (Go or Node): `nemesys publish`, `nemesys pull`, `nemesys search`
- GitHub-as-backend: packages = repos/tags
- Static feed page on GitHub Pages

### Phase 2 — Web Interface
- nemesys.dev landing page with Mr. Nimbus bioluminescent skin
- Feed view, package detail pages, version history, diff viewer
- Goliath grabber badge on discovered packages
- Jericho assessment display

### Phase 3 — Goliath + Jericho Integration
- Goliath "grab" flow: paste URL → Goliath browses → extracts → generates manifest draft
- Jericho "assess" flow: analyzes source → fills `assessment` block → fit score → conflicts check
- Telegram bot: "New update available in your feed" notifications
- `hermes skill pull @masterblox/gdpr-breach-sentinel` plugin

### Phase 4 — Ecosystem
- Webhook triggers on publish (auto-deploy to fleet)
- CI/CD: auto-publish on git tag
- Package signatures / verification
- Enterprise: private packages, client tenants, audit logs, SSO

---

## What's Next

1. ✅ Name decided: **Nemesys**
2. ✅ Repo created: **masterblox/nemesys**
3. ✅ Manifest schema drafted
4. 🔲 Carlos buys nemesys.dev on Squarespace
5. 🔲 Phase 1: CLI prototype + manifest validator
6. 🔲 Phase 2: landing page with Mr. Nimbus skin
7. 🔲 Phase 3: Goliath grab + Jericho assess pipeline
8. 🔲 Phase 4: Hermes integration + community launch

---

*"Existence is pain, Jerry. Update your agents."*
