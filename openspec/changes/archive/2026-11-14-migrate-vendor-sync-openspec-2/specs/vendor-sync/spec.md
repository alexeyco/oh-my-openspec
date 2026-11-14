# Vendor sync — delta for migrate-vendor-sync-openspec-2

## MODIFIED Requirements

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
- **THEN** `vendor/openspec/skills/` is deleted and rewritten from the
  generated buffers, and `manifest.json` is written with `generatedBy` equal
  to the CLI package version (`scripts/sync-vendor.mjs`)

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
