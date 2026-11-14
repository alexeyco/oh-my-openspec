# Design — migrate-vendor-sync-openspec-2

## Context

OpenSpec CLI 2.0.0 changed where `init --tools opencode` renders skills:
from the per-tool `.opencode/skills/` to the shared `.agents/skills/`, and
retired the `delivery` config key. `scripts/sync-vendor.mjs` reads the 1.x
path and fails with exit 2, which reddens the daily `vendor-sync` workflow
(it installs `@latest`).

Behavior was confirmed with one read-only run in a throwaway temp sandbox
(`npm install @fission-ai/openspec@2.0.0`, fake `HOME`, telemetry off):

- `openspec config set delivery skills → Set delivery = "skills"` /
  `Note: delivery no longer changes anything; OpenSpec 2.0 installs skills only.`
  (exit 0), and the resulting `~/.config/openspec/config.json` contains only
  `featureFlags`, `profile`, `workflows` — no delivery key.
- `openspec init --tools opencode --no-animation <proj>` → 12 `openspec-*`
  directories under `<proj>/.agents/skills/`, each with `SKILL.md`; plus a
  regular file `<proj>/.agents/skills/.openspec-target` (9 bytes, `opencode`
  - newline); `<proj>/.opencode/` is not created at all.
- `head <proj>/.agents/skills/openspec-propose/SKILL.md → generatedBy: "2.0.0"`.
- `openspec update --help → Update OpenSpec instruction files` — `update`
  still exists in 2.0, so the header comment's init-vs-update rationale
  stands and only needs the location sentence refreshed.
- `diff <(ls .agents/skills | grep openspec- | sort) <(ls vendor/openspec/skills | sort) → SAME`
  — the 12 ids match the committed vendor set exactly.
- `npm view @fission-ai/openspec@2.0.0 engines.node → >=22.12.0` — the repo's
  `engines.node` `>=22.18` (`package.json:53-55`) satisfies it, so the pinned
  CLI runs on the repo's Node floor (task 1.2 re-verifies locally after
  `npm install`).

## Decisions

1. **Remove the delivery step, do not keep it as a no-op.** `config set
delivery skills` (`scripts/sync-vendor.mjs:85`) exits 0 in 2.0 but prints
   a retirement notice and persists nothing. Keeping it would emit a
   misleading notice on every sync and enshrine a dead key; the sandbox
   sequence becomes profile + workflows + init. The delta spec's "Sandbox
   generation" scenario is updated to match.
2. **Marker file is not vendored, with no code change.** The collection loop
   (`scripts/sync-vendor.mjs:103-108`) already admits only entries where
   `entry.isDirectory() && existsSync(<entry>/SKILL.md)`, so the regular
   file `.openspec-target` is naturally skipped. The user decided against
   vendoring it; the delta spec records the skip as explicit normative
   behavior ("Non-skill entries are skipped") instead of an incidental
   implementation detail.
3. **No dual-path fallback.** Per the confirmed constraint, the script
   checks only `.agents/skills`. A pre-2.0 CLI would fail with the existing
   exit-2 "CLI produced no skills directory" path — acceptable because the
   devDependency pin moves to `^2.0.0` in the same change, so the resolved
   CLI always renders the shared location.
4. **Mirror invariant exception instead of a forbidden manual bump.**
   `CONTRIBUTING.md:111-117` says the plugin `version` is machine-owned and
   "only the daily vendor-sync workflow moves it", but
   `scripts/check.mjs:184-194` fails the migration branch unless
   `version == manifest.generatedBy == 2.0.0`. Resolution (user decision):
   amend the rule — the version moves by the daily workflow **or** by a
   migration change that moves the CLI major layout. The exception is stated
   once and applied everywhere the rule appears: `CONTRIBUTING.md`,
   `docs/vendor-sync.md`'s "Versioning: a strict mirror" section, and this
   change's `specs/release-publishing/spec.md` delta (MODIFIED "The release
   record is tags and npm, not a CHANGELOG"), so after archive the baseline
   spec and the amended documents do not contradict. The workflow keeps its
   normal exclusive-mover role for all non-migration changes. The stale code
   comment `scripts/check.mjs:181-183` ("Machine-owned — only the
   vendor-sync workflow moves it") consciously stays untouched here — the
   invariant `check.mjs` enforces is unchanged, and rewording a comment in
   that file is a separate code edit outside this change's scope. Deltas
   merge requirements only: `openspec sync` and `openspec archive` leave an
   established main-spec `## Purpose` untouched
   (`vendor/openspec/skills/openspec-sync-specs/SKILL.md:159-161`,
   `vendor/openspec/skills/openspec-archive-change/SKILL.md:156`), so the
   baseline `openspec/specs/release-publishing/spec.md` Purpose (lines 16-19,
   "no CHANGELOG and no manual version bumps on feature branches", citing
   `CONTRIBUTING.md:109-136`) is hand-edited by task 2.5 to the same rule —
   an explicit exception to "specs change via deltas", legitimate because the
   repo hierarchy requires specs to stay coherent with the requirements they
   carry.
5. **Atomic change.** Script fix + pin + regenerated `vendor/openspec/**` +
   regenerated `plugins/**` + version bump + doc/rule updates land together.
   Any split leaves `make check` red in between (CI runs
   `sync-vendor --check` against the lockfile-pinned CLI and the codex
   bundle byte-compare against vendor).

## Files touched

- `scripts/sync-vendor.mjs` — header comment (lines 8-16 area), sandbox
  sequence (drop line 85), `generatedRoot` (line 95 → `join(proj, ".agents",
"skills")`). No other logic changes.
- `package.json` — `version` (line 3) → `2.0.0`; devDependency (line 39) →
  `"@fission-ai/openspec": "^2.0.0"`.
- `package-lock.json` — via `npm install`.
- `vendor/openspec/**` — via `make sync` (generated; never hand-edited).
- `plugins/**` — via `make codex` (generated; never hand-edited).
- `CONTRIBUTING.md` — Publishing/version-mirror paragraph (lines 111-117).
- `openspec/specs/release-publishing/spec.md` — `## Purpose` sentence (lines
  16-19) hand-edited by task 2.5 (the delta mechanism does not cover
  Purpose); requirement blocks untouched — they merge from this change's
  `specs/release-publishing/spec.md` delta at archive.
- `docs/vendor-sync.md` — intro ("exact files `openspec init --tools
opencode` writes"), "What is vendored" (profile/workflows without
  delivery; example manifest versions → `2.0.0`), "Versioning: a strict
  mirror" (exception).
- `.github/workflows/vendor-sync.yml` — **not touched** (verified by
  reading: it installs `@latest`, then runs sync/codex/mirror/PR steps that
  are layout-agnostic).
- `scripts/check.mjs`, `core/`, `opencode/`, `agents/`, `skills/`,
  `codex/`, `tests/` — **not touched**.

## Trade-offs

- Dropping the delivery call means the script no longer runs against a
  hypothetical 1.x CLI; accepted — the pin moves in the same change and the
  exit-2 diagnostic still names the missing directory.
- The CONTRIBUTING exception weakens "machine-owned" slightly; bounded by
  naming the exact case (CLI major-layout migration) and keeping
  `scripts/check.mjs` as the enforcement of the invariant itself.
