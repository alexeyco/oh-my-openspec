# Vendor sync — delta for migrate-vendor-sync-openspec-2-1

## MODIFIED Requirements

### Requirement: Generation runs the pinned CLI in a throwaway sandbox

The sync script SHALL resolve the `openspec` CLI from
`node_modules/@fission-ai/openspec` via its `bin` field and generate skills by
running it in a fresh `mkdtemp` sandbox with a fake `HOME` and
`OPENSPEC_TELEMETRY=0`, after configuring `profile=custom` and the explicit
12-workflow list (`scripts/sync-vendor.mjs`). It SHALL pass `--scope project`
to `init`: CLI 2.1 defaults `init` to the global scope, rendering skills into
the sandbox's `$HOME/.agents/skills` and creating no project directory at
all, so without the flag the script exits 2 with "sync-vendor: CLI produced
no skills directory". It SHALL collect generated skills from
`<proj>/.agents/skills/<id>/SKILL.md` — the shared render location since CLI
2.0 — with no fallback to the global location and none to the 1.x location
`<proj>/.opencode/skills`. It SHALL NOT run `config set delivery skills` —
the command is retired since CLI 2.0. Because CLI 2.1 clones the skill
sources from GitHub (`git clone --depth 1 --branch v<version>`) on first
generation in a fresh sandbox, git and network access SHALL be treated as
prerequisites of both sync and `--check`, documented in
`docs/vendor-sync.md`.

#### Scenario: Sandbox generation

- **WHEN** `node scripts/sync-vendor.mjs` runs with the pinned CLI 2.1
  installed
- **THEN** the script executes `config set profile custom`, `config set
workflows <12 ids>`, and `init --tools opencode --no-animation --scope
project <tmpdir>` against a throwaway home and project, and executes no
  `config set delivery` command

#### Scenario: Shared skills location

- **WHEN** the sandboxed `init` succeeds under CLI 2.1 with `--scope project`
- **THEN** the script reads generated skills from `<proj>/.agents/skills/`,
  and exits 2 with "sync-vendor: CLI produced no skills directory" when that
  directory is absent — neither the global `$HOME/.agents/skills` nor the
  1.x path `<proj>/.opencode/skills` is ever consulted

#### Scenario: init rather than update

- **WHEN** a maintainer asks why the script calls `openspec init`
- **THEN** the header comment records that `update` refreshes files only for
  tools already recorded in project config, while `init` is the command that
  creates the tool files for a freshly configured tool set, names
  `.agents/skills/` as the render location the script reads, and records
  that `--scope project` pins rendering into the sandbox project because
  CLI 2.1 defaults to the global scope
