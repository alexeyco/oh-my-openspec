# codex-host-integration — delta for prepare-codex-plugin-catalog-readiness

## MODIFIED Requirements

### Requirement: Generated Codex plugin bundle and git-marketplace delivery

The repository SHALL ship a Codex plugin bundle at
`plugins/oh-my-openspec/` generated entirely by `node codex/render.ts`
from the single-source assets (`agents/*.md` via `core/roles.ts`,
`skills/*/SKILL.md`, `vendor/openspec/skills/`, `core/prompts.ts`,
`core/openspec.ts`, and the `codex/` sources), and the committed tree
SHALL match a fresh render byte-for-byte, gated by
`tests/codex-bundle.test.ts`. The repo root SHALL carry
`.agents/plugins/marketplace.json` declaring the plugin
`oh-my-openspec` with `source.path` `./plugins/oh-my-openspec`, a
`policy` block (`installation: AVAILABLE`, `authentication:
ON_INSTALL`), and a `category`, so that `codex plugin marketplace add
alexeyco/oh-my-openspec` followed by `codex plugin add
oh-my-openspec@oh-my-openspec` installs it. The bundle manifest
`.codex-plugin/plugin.json` SHALL use only spec-permitted root fields
(`name`, `version` mirroring `package.json`, `description`, `author`,
`homepage`, `repository`, `license`, `keywords`, `skills`, `mcpServers`,
and `interface`) and SHALL NOT declare `commands` or `agents` fields —
the Codex manifest has none — nor a `hooks` field, since no hooks ship.
Its `interface` object SHALL contain `displayName`, `shortDescription`,
and `composerIcon` pointing to `./assets/icon.svg`. The square SVG file
SHALL be generated at `assets/icon.svg`, have dimensions of at least
48 by 48, and be smaller than 50 KiB. The bundle SHALL contain exactly
six flow-family skills (`omos-init`, `omos-plan`, `omos-apply`,
`omos-retro`, `omos-archive`, `omos-setup`), the twelve vendored
upstream workflow skills under `skills/` copied verbatim from
`vendor/openspec/skills/` (subject to the documented frontmatter
normalization only if the Codex loader requires it), seven role TOMLs
under `assets/agents/`, `assets/mcp-server.mjs`,
`assets/openspec-core.ts` (a verbatim copy of `core/openspec.ts`),
`assets/install-agents.mjs`, `assets/icon.svg`, and `.mcp.json` —
thirty-one files, no `hooks.json`, no alias-mapping script. The file
count and icon requirement SHALL be reflected in `codex/render.ts`,
`tests/codex-bundle.test.ts`, and the Codex installation documentation.

#### Scenario: Bundle matches fresh render byte-for-byte

- **WHEN** `tests/codex-bundle.test.ts` renders the bundle into a
  temporary directory and compares it with the committed
  `plugins/oh-my-openspec/` tree
- **THEN** the file lists are equal both ways and every file is
  byte-identical, or the test fails naming the drifted files

#### Scenario: Marketplace install succeeds on Codex 0.164.0

- **WHEN** a user runs `codex plugin marketplace add
<local-checkout-path>` for the current checkout and then runs
  `codex plugin add oh-my-openspec@oh-my-openspec` on Codex CLI
  0.164.0
- **THEN** the plugin is listed as installed, its six flow-family
  skills are visible namespaced `oh-my-openspec:omos-*` alongside the
  twelve vendored `openspec-*` skills, the plugin cache tree holds
  exactly the 31 bundle files, and the manifest's icon path resolves
  inside that cache

#### Scenario: Vendored bundle copies track the vendor tree

- **WHEN** `tests/codex-bundle.test.ts` compares each bundled vendored
  skill against its source in `vendor/openspec/skills/`
- **THEN** the bodies (post-frontmatter bytes) match byte-for-byte —
  any frontmatter transform is asserted separately — so one vendor
  sync refreshes both hosts

#### Scenario: Catalog interface references the bundled icon

- **WHEN** the plugin manifest is read from a fresh bundle render
- **THEN** its `interface` contains `displayName`, `shortDescription`,
  and `composerIcon: "./assets/icon.svg"`, and the referenced square
  SVG exists in the bundle and is smaller than 50 KiB

## ADDED Requirements

### Requirement: Catalog security policy and scanner workflow

Root `SECURITY.md` SHALL direct vulnerability reports to GitHub Security
Advisories and discourage public disclosure before a fix. Each remote
`uses:` reference under `.github/workflows/` SHALL pin a full commit SHA
and retain a release comment. `.github/workflows/hol-plugin-scanner.yml`
SHALL run on pull requests and pushes to `master`, use the catalog's
reviewed scanner action, set `min_score: 80`, and upload SARIF with the
permissions required by the scanner.

#### Scenario: Security policy gives a private reporting route

- **WHEN** a user finds a security vulnerability in the repository
- **THEN** `SECURITY.md` directs them to GitHub Security Advisories for
  private reporting and tells them not to disclose the issue in a public
  issue before a fix is available

#### Scenario: Scanner checks pull requests and default-branch pushes

- **WHEN** a pull request targets `master` or a commit is pushed to
  `master`
- **THEN** the HOL Plugin Scanner workflow runs with `min_score: 80`,
  produces a SARIF report, and uploads it using the scanner action

#### Scenario: All workflow actions use immutable references

- **WHEN** a maintainer reads every `uses:` entry in
  `.github/workflows/*.yml`
- **THEN** each action reference is a full commit SHA with its release
  version retained in a comment, including checkout, setup-node,
  create-pull-request, and the HOL Plugin Scanner action
