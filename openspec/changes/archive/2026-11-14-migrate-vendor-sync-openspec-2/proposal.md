# Migrate vendor-sync to OpenSpec CLI 2.0

## Why now

The scheduled `vendor-sync` workflow has been red since 2026-11-13 with exit 2
`sync-vendor: CLI produced no skills directory`. The workflow installs
`@fission-ai/openspec@latest`, upstream released 2.0.0, and 2.0 renders
OpenCode skills into the shared `.agents/skills/` location while
`scripts/sync-vendor.mjs` still reads `<proj>/.opencode/skills`
(`scripts/sync-vendor.mjs:95-100`). Until the script migrates, every daily run
fails and no upstream skill refresh can ship.

## What changes

- `scripts/sync-vendor.mjs` — read generated skills from
  `<proj>/.agents/skills/`, drop the retired `config set delivery skills`
  step from the sandbox sequence (`scripts/sync-vendor.mjs:85`), and update
  the header comment (`scripts/sync-vendor.mjs:14-16`). No fallback to
  `.opencode/skills` — only the 2.0 path.
- `package.json` — devDependency pin `^1.17.0` → `^2.0.0`
  (`package.json:39`); `npm install` refreshes `package-lock.json`.
- `vendor/openspec/**` — regenerated with `make sync`; manifest `version` and
  `generatedBy` become `2.0.0`; the same 12 `openspec-*` skill ids, bodies
  carry upstream's mechanical 2.0 edits (slash-alias → skill-id wording,
  frontmatter stamp). The `.openspec-target` marker file is not vendored.
- `plugins/**` — regenerated with `make codex`;
  `tests/codex-bundle.test.ts:388` byte-compares bundle bodies against
  vendor, so regeneration must land in the same change.
- `package.json:3` — version `1.17.0` → `2.0.0`, restoring the mirror
  invariant checked by `scripts/check.mjs:184-194`.
- `CONTRIBUTING.md:111-117` — the "version is machine-owned, only the daily
  vendor-sync workflow moves it" rule gains a documented exception: a
  migration change that moves the CLI major layout may move the version in
  its own branch. The same exception lands as a `release-publishing` spec
  delta so the merged baseline spec and the amended rule agree.
- `openspec/specs/release-publishing/spec.md` — `## Purpose` hand-edited
  (task 2.5): deltas merge requirements only and sync/archive never rewrite
  an established main-spec Purpose, so the sentence forbidding "manual
  version bumps on feature branches" (lines 16-19) and its stale
  `CONTRIBUTING.md:109-136` citation are aligned with the exception
  directly.
- `docs/vendor-sync.md` — describe the 2.0 shared `.agents/skills/` layout,
  the sandbox sequence without the delivery step, and the same mirror
  exception.
- `.github/workflows/vendor-sync.yml` — unchanged: it installs `@latest`, and
  its sync/codex/mirror/PR steps remain valid after the script migrates.

## Capabilities

- `vendor-sync` — MODIFIED: sandbox generation without the retired delivery
  step and against the shared `.agents/skills` location (no 1.x fallback);
  vendor collection explicitly skips non-skill entries such as the
  `.openspec-target` marker.
- `release-publishing` — MODIFIED: "The release record is tags and npm, not a
  CHANGELOG" — the machine-owned mirror version moves in the daily
  `vendor-sync` workflow **or** in a migration change that moves the vendored
  CLI's major layout; the no-CHANGELOG rule stays as written, and the
  hotfix-window scenario is preserved with verbatim WHEN/THEN — its baseline
  `CONTRIBUTING.md:131-136` citation re-formed to a paragraph name because
  task 2.4 shifts those lines.
- Runtime specs (`skill-registration`, `codex-host-integration`,
  `public-positioning`) receive no deltas: the 12 skill ids are unchanged,
  the codex-host byte-identity rule stays as written (only the source bytes
  are regenerated), and "all 12 upstream workflow skills" remains true.

## Impact

Tooling, docs, specs, and generated content only — no plugin runtime code
(`core/`, `opencode/`, `agents/`, flow logic) changes, and vendored skill
bodies stay byte-identical to upstream. The migration must land atomically:
merging the script fix without the regenerated tree would leave `make check`
(`sync-vendor --check`) red on every PR. Specs: this change carries a
`release-publishing` delta (MODIFIED "The release record is tags and npm, not
a CHANGELOG"), which archive merges into the baseline requirements. The
baseline `## Purpose` is outside the delta mechanism — sync and archive leave
it untouched — so task 2.5 hand-edits
`openspec/specs/release-publishing/spec.md` directly: its "no CHANGELOG and
no manual version bumps on feature branches" sentence (lines 16-19) is
aligned with the migration exception, and its stale `CONTRIBUTING.md:109-136`
citation is refreshed after 2.4 shifts the lines. With both edits, the
post-archive spec — Purpose and requirements alike — states the same rule as
the amended `CONTRIBUTING.md` and `docs/vendor-sync.md`.

ASSUMPTION: `^2.0.0` resolves to exactly 2.0.0 through implementation — `npm view @fission-ai/openspec dist-tags → "latest": "2.0.0"`; if upstream publishes a newer 2.x before task group 2 runs, regenerate and mirror the installed version and read the expected `@2.0.0` output lines as `@<installed version>`.

REJECTED-RISK: none.
