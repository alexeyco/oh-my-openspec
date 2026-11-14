# Vendor sync

## Purpose

The plugin bundles OpenSpec's OpenCode workflow skills verbatim so that
installing `oh-my-openspec` from npm is enough — a user never
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
`OPENSPEC_TELEMETRY=0`, after configuring `profile=custom` and the explicit
12-workflow list (`scripts/sync-vendor.mjs`). It SHALL NOT run `config set
delivery skills` — the command is retired in CLI 2.0 (it exits 0 with a
"delivery no longer changes anything" notice and global config no longer
persists a delivery key). It SHALL collect generated skills from the CLI 2.0
shared render location `<proj>/.agents/skills/<id>/SKILL.md`, with no fallback
to the 1.x location `<proj>/.opencode/skills`.

#### Scenario: Sandbox generation

- **WHEN** `node scripts/sync-vendor.mjs` runs with the pinned CLI 2.0
  installed
- **THEN** the script executes `config set profile custom`, `config set
  workflows <12 ids>`, and `init --tools opencode --no-animation <tmpdir>`
  against a throwaway home and project, and executes no `config set delivery`
  command

#### Scenario: Shared skills location

- **WHEN** the sandboxed `init` succeeds under CLI 2.0
- **THEN** the script reads generated skills from `<proj>/.agents/skills/`,
  and exits 2 with "sync-vendor: CLI produced no skills directory" when that
  directory is absent — the 1.x path `<proj>/.opencode/skills` is never
  consulted

#### Scenario: init rather than update

- **WHEN** a maintainer asks why the script calls `openspec init`
- **THEN** the header comment records that `update` refreshes files only for
  tools already recorded in project config, while `init` is the command that
  creates the tool files for a freshly configured tool set, and names
  `.agents/skills/` as the CLI 2.0 render location the script reads

### Requirement: The vendor tree is a byte-identical copy plus a manifest

Generated skill files SHALL be copied into `vendor/openspec/skills/<id>/SKILL.md`
with no transformation, and `vendor/openspec/manifest.json` SHALL record
`package`, `version`, `generatedBy`, and the sorted skill ids
(`scripts/sync-vendor.mjs`). Collection SHALL consider only entries of the
generated skills directory that are directories containing a `SKILL.md`;
non-skill entries — including the CLI 2.0 marker file
`.agents/skills/.openspec-target` (content `opencode` plus a newline) — SHALL
NOT be vendored and SHALL NOT appear in the manifest.

#### Scenario: Write mode replaces the tree

- **WHEN** sync runs without `--check`
- **THEN** `vendor/openspec/skills/` is deleted and rewritten from the generated
  buffers, and `manifest.json` is written with `generatedBy` equal to the CLI
  package version (`scripts/sync-vendor.mjs`)

#### Scenario: Non-skill entries are skipped

- **WHEN** the generated `.agents/skills/` directory contains the
  `.openspec-target` marker file alongside the 12 `openspec-*` skill
  directories
- **THEN** the marker is excluded from `vendor/openspec/` and from the
  manifest's skill list, and sync writes exactly the 12 skill directories

#### Scenario: Post-write self-guard

- **WHEN** the directory ids on disk do not equal the manifest's sorted skill
  list immediately after writing
- **THEN** the script reports "manifest and vendor/ tree diverged" and exits 2
  (`scripts/sync-vendor.mjs`)

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

The package version SHALL match the vendored manifest. vendor-sync SHALL install the latest CLI and open a PR when the vendor tree or mirror version drifts; Dependabot SHALL leave this dependency to that workflow and vendor files remain excluded from formatting.

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
