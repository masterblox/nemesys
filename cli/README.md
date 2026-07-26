# Atlantys CLI

The Phase 1 CLI uses Git tags and GitHub repositories as the registry. Public
skill discovery comes from the open [Skills.sh](https://skills.sh/) ecosystem
through its official `npx skills find` command. The repository's local
`packages/` tree is private development inventory and is never mixed into
public search results.

## Install

```sh
cd cli
npm install
npm link
```

Then run `atlantys --help`.

Public search delegates to the official Skills CLI with telemetry disabled.
Publishing delegates authentication to Git, creates an annotated `v<version>`
tag, and pushes that tag to `origin`. A failed push rolls the local tag back.

## Commands

```sh
atlantys search gdpr
atlantys search gdpr --local # explicitly inspect private development packages
atlantys validate packages/@publisher/package/v1.0.0
atlantys publish packages/@publisher/package/v1.0.0
atlantys pull @publisher/package
atlantys subscribe @publisher/package
atlantys feed
atlantys diff @publisher/package 1.0.0 1.1.0
atlantys deploy @publisher/package --target ./agents
atlantys assess packages/@publisher/package/v1.0.0
```

Set `ATLANTYS_HOME` to relocate subscription state in automation. Set
`ATLANTYS_GITHUB_BASE_URL` to point pull operations at a GitHub-compatible host.
