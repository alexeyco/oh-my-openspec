# Design — migrate-vendor-sync-openspec-2-1

## Context

The daily `vendor-sync` run 44119711577 (2026-11-17) failed at the
"Re-vendor OpenSpec skills" step with:

```
sync-vendor: CLI produced no skills directory
##[error]Process completed with exit code 2.
```

(quoted from `gh run view 44119711577 --log-failed`, 2026-11-17T19:42:17Z).
The workflow had installed `@fission-ai/openspec@latest` = 2.1.0, whose
`init` defaults to the **global** scope: skills render into
`$HOME/.agents/skills`, `<proj>/.agents` is never created, and
`scripts/sync-vendor.mjs:98-103` exits 2.

Behavior was confirmed with read-only runs in the throwaway sandbox bundle
(`/private/var/folders/sg/_cjsf0ps1nq8m0h1lw7635v40000gn/T/opencode/osp210`,
CLI 2.1.0 installed under `node/`):

- `openspec init --help →  --scope <scope>  Where the skills go: global
(this machine, for every project) or project`; an invalid value fails with
  `Error: Invalid --scope "nope". Use global or project.` (`badscope.txt`).
- Default (global) run: skills land in the fake `$HOME/.agents/skills`; the
  project directory gets no `.agents` at all → the current script exits 2.
- `--scope project` run: 12 `openspec-*` skill directories in
  `<proj>/.agents/skills/` (sandboxes `r1`, `r2`); `diff -r
r1/proj/.agents/skills r2/proj/.agents/skills → identical` (determinism);
  `diff <(ls r1/... | sort) <(ls vendor/openspec/skills | sort) → IDS-SAME`
  (same 12 ids as committed). No prompts; `--force` / `--no-copilot-cloud`
  not needed.
- Marker file unchanged: `.openspec-target` is the same 9 bytes
  (`opencode\n`, verified by `od -c`) and sits inside
  `<proj>/.agents/skills/`, already skipped by the collection loop
  (`scripts/sync-vendor.mjs:106-111`).
- Frontmatter: generated 2.1 `SKILL.md` carries `metadata: { author:
openspec, version: "1.0" }` — **no `generatedBy`**. Upstream drops it
  deliberately: `dist/core/shared/skill-generation.js:24` "Drops the
  per-release `generatedBy` frontmatter line", implemented by
  `stripVolatileFrontmatter` (lines 29-30, `content.replace(/^
{2}generatedBy: .*\n/m, '')`). Committed 2.0 vendor files still carry the
  stamp (`vendor/openspec/skills/openspec-propose/SKILL.md` line 9), so
  every gate comparing frontmatter against `manifest.generatedBy`
  (`scripts/check.mjs:173-176`, `tests/assets.test.ts:168-172`) becomes
  unsatisfiable after regeneration, and the baseline `skill-registration`
  requirement "SKILL.md frontmatter validation" becomes false.
- Engines: `npm view @fission-ai/openspec@2.1.0 engines.node → >=22.20.0`;
  the installed sandbox copy agrees (`2.1.0 engines:>=22.20.0`). The repo
  declares `>=22.18` (`package.json:53-55`); all four workflows use
  `node-version: 22`, which resolves to the newest 22.x (≥ 22.20).
- git + network: first generation in a fresh sandbox runs `git clone
--depth 1 --branch v<ver>` against github.com/Fission-AI/OpenSpec
  (playback experiments: without git → exit 1 "Git is needed to install the
  OpenSpec skills..."; without network → exit 1 "Failed to clone"; repeat on
  an initialized project → exit 0 with no clone). The sync sandbox is a
  fresh `mkdtemp` every run, so **every** `make sync` and `make check`
  (`--check` regenerates) now needs git and network. ubuntu-latest provides
  both; local runs gain the prerequisite.
- 2.0.0 does not know `--scope` (exit 1, unknown option) — a pre-2.1 pin
  fails loudly rather than silently rendering to the wrong place.
- `npm view @fission-ai/openspec dist-tags → { next: '0.3.0', beta:
'1.6.0-beta.1', latest: '2.1.0' }` (2026-11-17).

ASSUMPTION: `^2.1.0` resolves to exactly 2.1.0 through implementation — `npm view @fission-ai/openspec dist-tags → latest: '2.1.0'` (2026-11-17); if upstream publishes a newer 2.x before task group 2 runs, regenerate and mirror the installed version and read the expected `@2.1.0` output lines as `@<installed version>`.

## Decisions

1. **`--scope project` flag, not the `OPENSPEC_SKILLS_SCOPE=project` env
   var.** (User decision, confirmed playback.) The flag is visible in the
   process args and documented in `init --help`; it sits in the command
   sequence it modifies. The env var would hide a mandatory behavior in the
   environment block next to `HOME`/`OPENSPEC_TELEMETRY`, where it reads as
   optional tuning. The flag exists only in 2.1: a 2.0 CLI exits 1 (unknown
   option) — a loud failure consistent with the no-fallback constraint. The
   sequence stays profile + workflows + init; the render location
   `<proj>/.agents/skills/` and the exit-2 semantics are unchanged, so the
   delta corrects wording without changing behavior.
2. **Manifest-only version invariant; no stamp re-injection.** Re-stamping
   `generatedBy` into generated frontmatter would break the byte-identical
   copy rule (vendor-sync requirement "The vendor tree is a byte-identical
   copy plus a manifest") and fight upstream's deliberate volatility strip.
   The manifest already records `version`/`generatedBy`; under 2.1 it
   becomes the sole carrier. Provenance stays fully gated: manifest
   structure + plain-semver `generatedBy` (`scripts/check.mjs:179-180`),
   dirs == `manifest.skills` (160-162), mirror `version ==
manifest.generatedBy` (184-194), byte drift via `sync-vendor --check`,
   bundle byte-compare via `tests/codex-bundle.test.ts`. What is removed is
   exactly the two frontmatter-stamp comparisons (`scripts/check.mjs:173-176`,
   `tests/assets.test.ts:168-172`) and, as dead code, the
   `vendoredGeneratedBy` helper (`core/markdown.ts:99-111`) whose only
   consumers those two were (verified by grep across `core/`, `opencode/`,
   `codex/`, `tests/`, `scripts/`: no other call sites; the plugin runtime
   never used it).
3. **Layout-neutral edits wherever baseline specs cite precise lines.**
   `scripts/check.mjs`: replace lines 173-176 with a 4-line explanatory
   comment and reword the comment at line 178 in place — the file stays 238
   lines and the anchors `mirror: package.json version` at 190 and
   `check: ok` at 238 are preserved (proven in a scratch copy through
   `prettier@3`), keeping every `check.mjs:NNN` citation in
   `release-publishing`, `vendor-sync`, and `public-positioning` valid
   without MODIFYing requirements this change has no other reason to touch.
   `scripts/sync-vendor.mjs`: a naive one-line flag addition makes the init
   call 95 chars, which prettier explodes to 11 lines (probed: file grows
   209 → 220, `generatedRoot` moves 98 → 109). The chosen shape instead
   merges the two-line `ALL_WORKFLOWS` comment into one and splits the init
   call into a prettier-stable two-line form
   (`const initCmd = ["init", "--tools", "opencode", "--no-animation"];` +
   `runCli([...initCmd, "--scope", "project", proj], env);`) — net zero:
   total stays 209, `generatedRoot` stays at 98, the catch/exit blocks keep
   their line numbers (probed through `prettier@3`). Only lines 52-88 shift
   by −1, inside citation ranges (`74-118`) that were already approximate
   (`74` cites `mkdtemp` at 78). The header comment (lines 8-20) is
   rewritten within its existing 13-line budget.
4. **Accept ±1/−6 citation drift in `tests/assets.test.ts`; do not MODIFY
   out-of-scope requirements to chase it.** Removing the import line and the
   5-line stamp assertion shifts later lines. Fixing the affected citations
   in `role-registration` (34-40), `orchestration-flows` (62-107), and
   `skill-registration` (52-60, 114-118) would mean MODIFYing four
   requirements in three capabilities purely for line numbers — beyond the
   confirmed delta list. The baseline already carries looser drift of the
   same class (`role-registration:40` cites `assets.test.ts:34-40` for a
   test at 38-44; `skill-registration:74` cites 120-135 for the stamp check
   at 159-174). The requirement this change _does_ modify ("SKILL.md
   frontmatter validation") cites the post-edit reality by suite name, and
   the modified requirements' `check.mjs`/`markdown.ts` citations are exact
   by decision 3.
5. **Generalize the mirror exception to "major or minor".** (User decision.)
   The 2.0 wording — "a migration change that moves the vendored CLI's
   major layout" — would exclude this 2.0.0 → 2.1.0 migration, which breaks
   vendoring just as hard (scope default moved; stamp stripped). The
   exception becomes: a migration change that moves the vendored CLI's
   layout **in a way that breaks vendoring — major or minor alike**. It is
   stated once and applied everywhere the rule appears: `CONTRIBUTING.md`
   Publishing, `docs/vendor-sync.md` "Versioning: a strict mirror", the
   `release-publishing` delta, and the baseline `## Purpose` (hand-edit,
   task 3.5 — deltas merge requirements only, and `openspec sync`/`archive`
   leave an established Purpose untouched, the same sanctioned mechanism as
   the 2.0 migration's task 2.5). The scenario's pinned `1.17.0 → 2.0.0`
   numbers become historical examples (both migrations named), so the next
   layout-breaking migration satisfies the scenario without a spec rewrite.
6. **engines `>=22.20`; the codex installer floor stays 22.18.** Upstream's
   own floor is `>=22.20.0`; keeping `>=22.18` would let `npm ci` succeed on
   a Node the pinned CLI does not support (EBADENGINE noise, possible
   runtime failure in `make sync`). `README.md:163`, `CONTRIBUTING.md:12`,
   and both `release-publishing` requirements follow ("package.json declares
   homepage, bugs, and author" — engines clause; "README Node requirement
   matches engines"). The codex installer's `meetsNodeFloor` v22.18 gate
   (`codex/install-agents.mjs:29,63,188-190`,
   `tests/codex-install.test.ts:266-273`, `codex/setup-skill.md:42`,
   `docs/codex.md:18`) is a different floor — the Node type-stripping
   minimum for the bundled MCP server, a user-facing runtime gate, not the
   engines mirror. Bumping it is codex runtime change outside the confirmed
   scope and would lock out Node 22.18/22.19 codex users for no reason.
   Only `docs/codex.md:126`'s "the same floor `package.json` `engines`
   declares" becomes false and is decoupled (docs-only edit, task 3.4).
7. **git + network prerequisite accepted and documented.** (User decision.)
   Every sync/`--check` regenerates in a fresh `mkdtemp` sandbox, so under
   2.1 every run clones the OpenSpec GitHub repo. CI is unaffected
   (ubuntu-latest has both). Local `make sync` / `make check` gain the
   prerequisite; it is documented in `docs/vendor-sync.md` (primary) and one
   bullet in `CONTRIBUTING.md`'s vendored-skills section. No offline cache —
   explicitly out of scope.
8. **Atomic change.** Script + gate removals + pin + engines + regenerated
   `vendor/openspec/**` + regenerated `plugins/**` + mirror bump + lockfile
   sync + docs land together. Any split leaves `make check` red in between:
   the stamp gates fail under 2.1 bytes, `--check` fails under 2.0 bytes,
   the mirror fails under a version-only bump, and the bundle byte-compare
   fails if `plugins/` lags `vendor/`. Precedent: the 2.0 migration
   (`openspec/changes/archive/2026-11-14-migrate-vendor-sync-openspec-2/`,
   merged as 4f18bb0) landed the same atomic set.
9. **Bump order + lockfile sync (regression guard).** `version` moves only
   after `make sync` has written manifest `2.1.0`, and
   `npm install --package-lock-only` runs immediately after the bump, with a
   three-way verification (`package.json.version`,
   `package-lock.json.version`, `package-lock.json.packages[""].version` all
   `2.1.0`). The 2.0 migration skipped the lock sync and needed fixup
   commit ca6366d; `npm ci` (CI's first step) fails on the mismatch.

## Files touched

- `scripts/sync-vendor.mjs` — header comment (lines 8-20, rewritten within
  its 13-line budget: 2.1 sequence with `--scope project`, global-default
  rationale, git+network clone prerequisite, kept init-vs-update rationale);
  `ALL_WORKFLOWS` comment (51-52 → one line); init call (89 → two lines,
  `initCmd` + spread). Probed prettier-stable: total 209, `generatedRoot`
  at 98.
- `scripts/check.mjs` — lines 173-176 → 4-line comment; line 178 comment
  reworded. Total stays 238; anchors 190 (`mirror:`) and 238 (`check: ok`)
  verified in a scratch copy.
- `core/markdown.ts` — header comment example (lines 2-3,
  `generatedBy` → `author`, line-neutral); remove `vendoredGeneratedBy`
  (98-111 incl. its comment and preceding blank line). Lines ≤ 97
  untouched, so `role-registration`'s citations (24-46, 48-83, 60-62, 72-76,
  85-97) stay exact.
- `tests/markdown.test.ts` — remove the import entry (line 9), swap the
  extra-keys fixture `metadata: { generatedBy: "1.14.2" }` →
  `metadata: { author: "openspec" }` (line 93, matches real 2.1
  frontmatter), remove `describe("vendoredGeneratedBy")` (104-117).
- `tests/assets.test.ts` — remove the import entry (line 14); rename the
  test (line 159) to "every vendored skill parses and name equals
  directory"; remove the stamp assertion (168-172). Later-line citations
  drift per decision 4.
- `package.json` — line 39 pin → `"^2.1.0"` and line 54 engines →
  `">=22.20"` (task 1.6, then `npm install`); line 3 version → `2.1.0`
  (task 2.3, then `npm install --package-lock-only`).
- `package-lock.json` — via `npm install` (1.6) and
  `npm install --package-lock-only` (2.3).
- `vendor/openspec/**` — via `make sync` (generated; never hand-edited).
- `plugins/**` — via `make codex` (generated; never hand-edited).
- `CONTRIBUTING.md` — line 12 floor → 22.20; vendored-skills section
  (40-56) git+network bullet; Publishing (111-121) generalized exception.
- `README.md` — line 163 floor → 22.20.
- `docs/vendor-sync.md` — intro (2.1 + `--scope project`), manifest example
  (20-21 → `2.1.0`), "How each file stays provable" (28-33 → manifest-only
  wording), git+network prerequisite, "Versioning: a strict mirror" (55-63
  → generalized exception), "When upstream changes" (76 → drop "stamp").
- `docs/codex.md` — "Node floor" section (126-131): decouple the 22.18
  type-stripping floor from the engines floor.
- `openspec/specs/release-publishing/spec.md` — `## Purpose` only (16-21),
  hand-edited by task 3.5; requirement blocks merge from this change's
  delta at archive.
- **Not touched** (verified by reading/grep): `.github/workflows/**`
  (vendor-sync.yml is layout-agnostic and runs on ubuntu-latest with
  git+network), `codex/install-agents.mjs`, `codex/setup-skill.md`,
  `tests/codex-install.test.ts`, `core/vendor.ts` (manifest validation
  unchanged — `generatedBy` stays a required manifest key),
  `core/prompts.ts` (grep-verified: no `generatedBy`/floor references),
  `opencode/index.ts` (never used `vendoredGeneratedBy`), `agents/**`,
  `skills/**`, `Makefile`, `docs/agents.md` (no 22.18/generatedBy
  references).

## Trade-offs

- Losing the per-file stamp removes a per-skill provenance echo; the
  manifest + byte-identity + mirror + drift gates still make any hand-edit
  or stale tree fail `make check`, so detection is unchanged in practice.
- git + network become hard prerequisites for local `make sync`/`make check`
  (each run clones ~depth-1 from GitHub); accepted per the confirmed
  contract in exchange for zero-fallback simplicity, offline cache
  explicitly out of scope.
- `engines >=22.20` excludes Node 22.18/22.19 from a clean local `npm ci`
  (EBADENGINE); CI is unaffected (`node-version: 22` → newest 22.x), and the
  floor now states the truth about the pinned CLI.
- The `initCmd` two-line split exists purely to stay prettier-stable and
  line-neutral; it is slightly less direct than a one-line call — accepted
  to keep the spec's dense line citations honest.
