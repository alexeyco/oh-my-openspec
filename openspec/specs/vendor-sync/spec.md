# vendor-sync

## Purpose

The plugin bundles OpenSpec's OpenCode workflow skills verbatim so that
installing `@alexeyco/opencode-openspec` from npm is enough — a user never
runs `openspec init` to get the upstream skills. `scripts/sync-vendor.mjs`
drives the CLI pinned as the `@fission-ai/openspec` devDependency
(`scripts/sync-vendor.mjs:38-45`) inside a throwaway sandbox, renders every
known workflow for the `opencode` tool, and copies the result byte-identically
into `vendor/openspec/` as `manifest.json` plus `skills/<id>/SKILL.md`
(`scripts/sync-vendor.mjs:74-118,181-189`). A `--check` mode proves freshness
without writing (`scripts/sync-vendor.mjs:36,166-179`), and a daily GitHub
workflow upgrades the pin, re-vendors, mirrors the vendored version into the
plugin `version`, and opens a sync PR (`.github/workflows/vendor-sync.yml:3-64`).
The tree is generated — never hand-edited (`.prettierignore:3-4`) — and the
plugin refuses to load when it disagrees with its manifest
(`opencode/index.ts:79-88`).

## Requirements

### Requirement: Generation runs the pinned CLI in a throwaway sandbox

The sync script SHALL resolve the `openspec` CLI from
`node_modules/@fission-ai/openspec` via its `bin` field and generate skills by
running it in a fresh `mkdtemp` sandbox with a fake `HOME` and
`OPENSPEC_TELEMETRY=0`, after configuring `profile=custom`, the explicit
12-workflow list, and `delivery=skills` (`scripts/sync-vendor.mjs:38-45,49-62,74-86`).

#### Scenario: Sandbox generation

- **WHEN** `node scripts/sync-vendor.mjs` runs with the pinned CLI installed
- **THEN** the script executes `config set profile custom`, `config set
workflows <12 ids>`, `config set delivery skills`, and `init --tools opencode
--no-animation <tmpdir>` against a throwaway home and project
  (`scripts/sync-vendor.mjs:80-86`)

#### Scenario: init rather than update

- **WHEN** a maintainer asks why the script calls `openspec init`
- **THEN** the header comment records that `update` refreshes files only for
  tools already recorded in project config, while `init` is the command that
  creates the tool files for a freshly configured tool set
  (`scripts/sync-vendor.mjs:14-16`)

### Requirement: The vendor tree is a byte-identical copy plus a manifest

Generated skill files SHALL be copied into `vendor/openspec/skills/<id>/SKILL.md`
with no transformation, and `vendor/openspec/manifest.json` SHALL record
`package`, `version`, `generatedBy`, and the sorted skill ids
(`scripts/sync-vendor.mjs:104-107,113-118,181-189`).

#### Scenario: Write mode replaces the tree

- **WHEN** sync runs without `--check`
- **THEN** `vendor/openspec/skills/` is deleted and rewritten from the generated
  buffers, and `manifest.json` is written with `generatedBy` equal to the CLI
  package version (`scripts/sync-vendor.mjs:181-189`)

#### Scenario: Post-write self-guard

- **WHEN** the directory ids on disk do not equal the manifest's sorted skill
  list immediately after writing
- **THEN** the script reports "manifest and vendor/ tree diverged" and exits 2
  (`scripts/sync-vendor.mjs:196-206`)

### Requirement: Check mode detects drift without writing

`node scripts/sync-vendor.mjs --check` SHALL regenerate in the sandbox, compare
against the committed tree and manifest, write nothing, and exit 1 listing each
difference as a `+` (new upstream), `-` (removed upstream), or `~` (changed)
line followed by "Fix: make sync, then commit vendor/"
(`scripts/sync-vendor.mjs:36,138-173`).

#### Scenario: Clean tree passes

- **WHEN** every committed SKILL.md is byte-equal to the generated file and the
  on-disk manifest matches the expected one
- **THEN** the script prints "vendor/ in sync with <pkg>@<version> (<n> skills)"
  and exits 0 (`scripts/sync-vendor.mjs:160-178`)

#### Scenario: Drift fails with a fix hint

- **WHEN** any skill differs, is missing, is extra, or the manifest disagrees
- **THEN** the script writes one `+`/`-`/`~` line per difference to stderr and
  exits 1 without modifying `vendor/` (`scripts/sync-vendor.mjs:138-173`)

### Requirement: Generation failures abort with exit 2

When the CLI cannot be resolved, the script SHALL print a diagnostic and exit 2
before any sandbox is created (`scripts/sync-vendor.mjs:41-44`). When `init`
fails or no skills directory is produced — both after the `mkdtemp` work
directory exists (`scripts/sync-vendor.mjs:74`) — it SHALL additionally remove
that directory before exiting 2 (`scripts/sync-vendor.mjs:87-100`).

#### Scenario: CLI init failure

- **WHEN** any of the sandboxed `config`/`init` commands throws
- **THEN** the script logs the CLI stdout/stderr, calls `rmSync` on the work
  directory, and exits 2 (`scripts/sync-vendor.mjs:87-93`)

### Requirement: The mirror invariant keeps pin, vendor, and plugin version together

`package.json` `version` SHALL equal `vendor/openspec/manifest.json`
`generatedBy`; `scripts/check.mjs` fails the repo when they differ
(`scripts/check.mjs:181-194`). The daily `vendor-sync` workflow SHALL install
`@fission-ai/openspec@latest`, re-vendor, and open a PR on branch
`chore/vendor-openspec-skills` whenever the tree drifts OR the mirror is off,
setting the plugin version with `npm version --no-git-tag-version
--allow-same-version` (`.github/workflows/vendor-sync.yml:3-8,24-64`).
Dependabot SHALL exclude `@fission-ai/openspec` so the pin moves only through
that PR (`.github/dependabot.yml:7-10`), and `vendor/` SHALL stay out of
prettier (`.prettierignore:3-4`).

#### Scenario: Daily sync PR

- **WHEN** the scheduled run (cron `17 6 * * *` or manual dispatch) detects
  vendor drift or a version mismatch
- **THEN** it mirrors the manifest's `generatedBy` into `package.json` and opens
  a "Release vX.Y.Z — vendored OpenSpec skills" PR against `master`
  (`.github/workflows/vendor-sync.yml:28-64`)

#### Scenario: Mismatched mirror fails local checks

- **WHEN** `node scripts/check.mjs` runs while `package.json` version differs
  from `manifest.generatedBy`
- **THEN** it reports the mirror failure and exits 1 (`scripts/check.mjs:184-194,233-237`)
