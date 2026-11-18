# Tasks — migrate-vendor-sync-openspec-2-1

## 1. Migrate the sync sequence, retire the frontmatter stamp gates, bump pin and engines

- [x] 1.1 Edit `scripts/sync-vendor.mjs` (three layout-neutral edits, proven
      prettier-stable in design.md decision 3): (a) rewrite the header
      comment (lines 8-20) **within its existing 13-line budget** so it
      describes the 2.1 sequence (`config set profile custom` + explicit
      12-workflow list + `init --tools opencode --no-animation --scope
project`), records that CLI 2.1 defaults `init` to the global scope
      (`$HOME/.agents/skills`) and creates no project directory — hence the
      mandatory flag — that first generation clones the skill sources from
      GitHub (git and network are prerequisites), that the output is copied
      byte-identically, that the manifest records the CLI version, and keeps
      the init-vs-update rationale naming `.agents/skills/` as the render
      location the script reads; (b) merge the two-line `ALL_WORKFLOWS`
      comment (lines 51-52) into one line, e.g. `// Explicit workflow list
(core + extended) so all 12 skills render.`; (c) replace the init call
      (line 89) with exactly two lines: `const initCmd = ["init", "--tools",
"opencode", "--no-animation"];` and `runCli([...initCmd, "--scope",
"project", proj], env);` — a one-line call would be exploded to 11
      lines by prettier and shift every spec citation. Then grep for stale
      references in the same task: `grep -n "2\.0\b" scripts/sync-vendor.mjs`
      → only historical mentions inside the rewritten comment (no "CLI 2.0
      shared render location this script reads" claim), and verify the layout
      anchors: `awk 'END{print NR}' scripts/sync-vendor.mjs` → `209`;
      `sed -n '98p' scripts/sync-vendor.mjs` → `const generatedRoot =
join(proj, ".agents", "skills");`; `sed -n '40p' scripts/sync-vendor.mjs`
      → the `const CHECK` line. Scenarios: "Sandbox generation", "Shared
      skills location", "init rather than update".
- [x] 1.2 Edit `scripts/check.mjs`: replace the per-skill stamp comparison
      (lines 173-176, `if (fm.metadata?.generatedBy !== manifest.generatedBy)
fail(...)`) with a 4-line comment of your wording that states: CLI 2.1
      strips the per-release `generatedBy` stamp from skill frontmatter, so
      the version invariant lives in `manifest.json` alone (semver shape and
      mirror checks below; byte drift via `sync-vendor --check`). Reword the
      comment at line 178 in place (one line → one line): "Never hand-edited:
      content must be self-stamped upstream version" → "Never hand-edited:
      the manifest carries the upstream version stamp". Keep the `name == id`
      check (171-172), the semver check (179-180), and the mirror check
      (184-194) untouched. Verify the layout anchors: `awk 'END{print NR}'
scripts/check.mjs` → `238`; `grep -n "mirror: package.json version"
scripts/check.mjs` → line `190`; `grep -n '"check: ok"'
scripts/check.mjs || grep -n "check: ok" scripts/check.mjs` → line
      `238`; `grep -n "fm.metadata" scripts/check.mjs` → no hits.
      Scenarios: "All invariants hold", "Multiple failures aggregate",
      "Unstamped vendor tree passes the vendor-metadata group" (against the
      regenerated tree in group 2; against the still-committed 2.0 tree the
      group must stay silent too — the stamp comparison is simply gone).
- [x] 1.3 Remove the `vendoredGeneratedBy` symbol and every call/test site in
      this one task. First grep the consumers: `grep -rn
"vendoredGeneratedBy" core/ opencode/ codex/ scripts/ tests/` → the
      expected complete hit list is `core/markdown.ts` (definition, lines
      99-111, plus its comment at 99-100), `tests/markdown.test.ts` (import
      line 9, `describe("vendoredGeneratedBy")` block lines 104-117), and
      `tests/assets.test.ts` (import line 14, stamp assertion lines
      168-172) — the plugin runtime (`opencode/`, `codex/`) never used it.
      Then: (a) `core/markdown.ts` — delete the blank line 98, the comment
      (99-100), and the function (101-111); fix the header comment example
      (lines 2-3) from `` `metadata: { generatedBy: ... }` `` to
      `` `metadata: { author: ... }` `` (line-neutral — 2.1 frontmatter
      carries `metadata: { author, version }`); `validateSkillDoc`
      (85-97) stays untouched; (b) `tests/markdown.test.ts` — delete the
      import entry (line 9) and the whole `describe("vendoredGeneratedBy")`
      block (104-117); in the "ignores extra keys" test (line 93) swap the
      fixture `metadata: { generatedBy: "1.14.2" }` → `metadata: { author:
"openspec" }` to match real 2.1 frontmatter; (c) `tests/assets.test.ts`
      — delete the import entry (line 14), rename the test (line 159) to
      `"every vendored skill parses and name equals directory"`, and delete
      the `vendoredGeneratedBy` assertion (lines 168-172), keeping parse +
      `name == id`. Re-grep: `grep -rn "vendoredGeneratedBy" . --include="*.ts"
--include="*.mjs" | grep -v node_modules | grep -v vendor/ | grep -v
plugins/` → no hits. Expected result after group 1 alone (after 1.4):
      `npm run typecheck` clean; `npm test` green against the still-committed
      2.0 vendor tree (its stamp is now simply unchecked); `node
scripts/check.mjs` → `check: ok`. Known accepted side effect: line
      citations to `tests/assets.test.ts` in unmodified baseline requirements
      shift by −1/−6 (design.md decision 4) — do not touch other specs.
      Scenarios: "Vendored skill without a frontmatter stamp", "Skill missing
      description" (behavior unchanged — `tests/markdown.test.ts` still
      asserts the `validateSkillDoc` throws), "Unstamped vendor tree passes
      the vendor-metadata group".
- [x] 1.4 In `package.json` set `"@fission-ai/openspec": "^2.1.0"` (line 39)
      and `"engines": { "node": ">=22.20" }` (line 54), then run
      `npm install` (refreshes `package-lock.json`). Verify: `node -p
"require('./node_modules/@fission-ai/openspec/package.json').version"`
      → `2.1.0`; `node -p
"require('./node_modules/@fission-ai/openspec/package.json').engines.node"`
      → `>=22.20.0`; `node -p "require('./package.json').engines.node"` →
      `>=22.20`. Do NOT touch `version` (line 3) in this group — the mirror
      invariant (`scripts/check.mjs:184-194`) requires it to equal
      `manifest.generatedBy`, which is still `2.0.0` until group 2
      regenerates. Expected result after group 1 alone: `node
scripts/check.mjs` → `check: ok`; `npm run typecheck` clean; `npm test`
      green; `node scripts/sync-vendor.mjs --check` exits 1 listing 12
      `~ skills/openspec-*/SKILL.md (changed upstream)` lines (every file
      differs at least by the stripped frontmatter stamp; 9 of 12 also carry
      upstream rewording) plus `~ manifest.json (version or skill set
differs)` and `Fix: make sync, then commit vendor/` — group 2 resolves
      it. This run also proves the new sandbox sequence end-to-end (it
      regenerates with `--scope project` before comparing). Scenarios:
      "Sandbox generation", "Shared skills location", "engines floor covers
      the pinned CLI".

## 2. Regenerate vendor and bundle, restore the mirror

- [x] 2.1 Run `make sync` (requires git and network access to GitHub — the
      fresh sandbox clones `github.com/Fission-AI/OpenSpec` at `v2.1.0`).
      Expected stdout: `sync-vendor: wrote 12 skill(s) from
@fission-ai/openspec@2.1.0`. Verify: `vendor/openspec/manifest.json`
      shows `"version": "2.1.0"` and `"generatedBy": "2.1.0"` with the same
      12 sorted `openspec-*` ids as before (`git diff
vendor/openspec/manifest.json` touches only the two version lines);
      `ls -a vendor/openspec/skills/` lists exactly those 12 directories and
      no `.openspec-target`; `grep -rn "generatedBy" vendor/openspec/skills/`
      → no hits (2.1 strips the stamp); the end-of-script self-guard stays
      silent (no "manifest and vendor/ tree diverged"). Scenarios: "Sandbox
      generation", "Shared skills location", "Vendored skill without a
      frontmatter stamp", "Unstamped vendor tree passes the vendor-metadata
      group".
- [x] 2.2 Run `make codex` to regenerate `plugins/**` from the new vendor
      tree. Verify `git status --porcelain plugins/ vendor/` shows
      modifications confined to those two generated trees (the bundle
      body byte-compare against `vendor/openspec/skills/` is enforced in 4.1
      via `tests/codex-bundle.test.ts`).
- [x] 2.3 In `package.json` set `"version": "2.1.0"` (line 3), then —
      mandatory, the 2.0 migration needed fixup commit ca6366d for skipping
      it — run `npm install --package-lock-only` to sync the lockfile's root
      version fields. Verify all three: `node -p
"[require('./package.json').version,
require('./package-lock.json').version,
require('./package-lock.json').packages[''].version].join(' ')"` →
      `2.1.0 2.1.0 2.1.0`; and the mirror: `node -e "const
v=require('./package.json').version,g=JSON.parse(require('fs').readFileSync('vendor/openspec/manifest.json','utf8')).generatedBy;console.log(v===g?'mirror
ok':'MISMATCH '+v+' '+g)"` → `mirror ok`. Also verify the npm metadata
      keys are untouched by the bump: `node -p
"[require('./package.json').homepage,
require('./package.json').bugs,
require('./package.json').author.name].join(' ')"` →
      `https://github.com/alexeyco/oh-my-openspec
https://github.com/alexeyco/oh-my-openspec/issues Alexeyco`. Expected
      result after group 2 alone: `node scripts/check.mjs` → `check: ok`;
      `node scripts/sync-vendor.mjs --check` → `sync-vendor: vendor/ in sync
with @fission-ai/openspec@2.1.0 (12 skills)`, exit 0; `npm test` green
      including the bundle byte-compare. Scenarios: "Migration change moves
      the mirror version" (this task is the bump it permits), "Metadata
      renders on npm" (keys preserved for the tag-driven publish),
      "check.mjs invariants unaffected", "Mismatched mirror fails local
      checks" (positive path — after the bump the check passes).

## 3. Docs, README, CONTRIBUTING, and the baseline Purpose

- [x] 3.1 Update `CONTRIBUTING.md`: (a) line 12 — "Tests require Node ≥
      22.18" → "Tests require Node ≥ 22.20"; (b) "Vendored OpenSpec skills"
      section (lines 40-56) — add one bullet: sandbox generation requires
      git and network access to GitHub, because CLI ≥ 2.1 clones the skill
      sources (`git clone --depth 1 --branch v<version>`) in the fresh
      sandbox on every `make sync` and `--check` run; (c) Publishing
      version-mirror paragraph (lines 111-121) — generalize the exception to
      the rule stated in this change's `specs/release-publishing/spec.md`
      delta: the machine-owned version moves only in the daily `vendor-sync`
      workflow PR **or** in a migration change that moves the vendored CLI's
      layout in a way that breaks vendoring — major or minor alike (first
      applied by the OpenSpec 2.0 migration, applied again by this 2.1
      migration). Keep the surrounding rules intact: `scripts/check.mjs`
      fails any PR where `version != manifest.generatedBy`, no CHANGELOG,
      merged PRs and npm history are the record, and the hotfix-window
      guidance ("Consequence of strict mirroring" paragraph, currently lines
      135-140; it shifts with the edits) stays as written. Verify: `grep -n
"22\.18" CONTRIBUTING.md` → no hits; `grep -n "major layout"
CONTRIBUTING.md` → no hits. Scenarios: "Migration change moves the
      mirror version", "Hotfix window with no upstream release" (WHEN/THEN
      preserved verbatim in the delta; this task keeps the CONTRIBUTING
      paragraph it cites), "Install section matches engines" (CONTRIBUTING
      half of the consistency), "engines floor covers the pinned CLI".
- [x] 3.2 Update `README.md` line 163: `[Node.js ≥ 22.18](https://nodejs.org)`
      → `[Node.js ≥ 22.20](https://nodejs.org)`. Verify: `grep -nE
"20\.19|22\.18" README.md` → no output; `grep -n "22\.20" README.md` →
      exactly one hit at line 163. Scenarios: "Install section matches
      engines", "No stale 20.19 remains", "No stale 22.18 remains".
- [x] 3.3 Update `docs/vendor-sync.md` for the 2.1 reality: (a) intro
      paragraph (lines 3-8) — the bundles are the exact files `openspec init
--tools opencode --scope project` writes into `<proj>/.agents/skills/`
      under CLI 2.1 (2.1 defaults to the global scope; the sync script pins
      the project scope); (b) manifest example (lines 20-21) — `"version"`
      and `"generatedBy"` → `"2.1.0"`; (c) "How each file stays provable"
      (lines 26-33) — rewrite: CLI 2.1 strips the per-release
      `generatedBy` stamp from generated frontmatter, so the version
      invariant lives in `manifest.json` alone (structure, plain semver,
      directories == `manifest.skills`, mirror version) alongside the
      byte-identical comparison — delete the "every vendored `SKILL.md`
      carries an upstream `metadata.generatedBy` stamp, and the pipeline
      compares stamps" claim; (d) add the git+network prerequisite: every
      `make sync` / `--check` run regenerates in a fresh sandbox, and CLI ≥
      2.1 clones the skill sources from GitHub there — CI runners provide git
      and network; local runs now require both; (e) "Versioning: a strict
      mirror" (lines 53-63) — generalize the exception exactly as in 3.1
      (layout move that breaks vendoring, major or minor; first applied by
      the 2.0 migration, again by this 2.1 migration), and make the mirror
      example version-agnostic ("a plugin `X.Y.Z` bundles exactly the skills
      generated by CLI `X.Y.Z`") so the next bump does not stale it — the
      literal `2.0.0` at lines 55-56 must not survive; (f) "When upstream
      changes" (line 76) — "CI guarantees the stamp, manifest, and bytes stay
      coherent" → "CI guarantees the manifest and the bytes stay coherent".
      Verify: `grep -n "compares stamps\|generatedBy stamp"
docs/vendor-sync.md` → no hits; `grep -n "2\.0\.0"
docs/vendor-sync.md` → no hits (the backtick example at lines 55-56 is
      now version-agnostic and the JSON manifest example is `2.1.0`);
      `grep -n "scope project"
docs/vendor-sync.md` → at least one hit. Scenarios: "Sandbox
      generation" and "Shared skills location" (the intro documents what they
      assert), "Migration change moves the mirror version", "Vendored skill
      without a frontmatter stamp" (the provability section carries the
      manifest-only rule in prose).
- [x] 3.4 Update `docs/codex.md` "Node floor" section (lines 126-131): the
      first sentence "Node ≥ 22.18 — the same floor `package.json` `engines`
      declares." is false after the engines bump — decouple the two floors,
      e.g. "Node ≥ 22.18 — the floor Node's type stripping requires for the
      bundled MCP server (`package.json` `engines` declares the repo's own,
      higher floor: ≥ 22.20, set by the pinned OpenSpec CLI)." Keep the rest
      of the section as written. Do NOT touch `docs/codex.md:18`,
      `codex/setup-skill.md:42`, `codex/install-agents.mjs`, or
      `tests/codex-install.test.ts` — the installer's 22.18 type-stripping
      floor is an independent runtime gate and out of scope (design.md
      decision 6). Verify: `grep -n "same floor" docs/codex.md` → no hits;
      `grep -c "22\.18" codex/install-agents.mjs` → unchanged count (4).
      Scenarios: "engines floor covers the pinned CLI" (the two floors stay
      distinct and both documented), "Install section matches engines".
- [x] 3.5 Hand-edit the baseline spec
      `openspec/specs/release-publishing/spec.md` — the same sanctioned
      exception to the delta mechanism as the 2.0 migration's task 2.5, run
      after 3.1. Why it cannot ride the delta: OpenSpec deltas merge
      `### Requirement:` blocks only; `openspec sync` and `openspec archive`
      leave an established main-spec `## Purpose` untouched
      (`vendor/openspec/skills/openspec-sync-specs/SKILL.md` — "The main spec
      already has one and it is authoritative - leave it alone";
      `vendor/openspec/skills/openspec-archive-change/SKILL.md` — "Preserve
      existing `## Purpose` sections completely untouched for established
      main specs"). Without this edit the post-archive Purpose would keep
      saying "a migration change that moves the vendored CLI's major layout"
      (lines 16-21) while the MODIFIED requirement permits major-or-minor.
      Scope: touch only the `## Purpose` paragraph — the requirement blocks
      belong to the delta/archive mechanism. Do: rewrite the exception clause
      in the Purpose to the generalized rule (the machine-owned mirror
      version moves only in the daily `vendor-sync` workflow PR or in a
      migration change that moves the vendored CLI's layout in a way that
      breaks vendoring, major or minor alike — then the bump lands in that
      change's branch), keeping the "merged plugin code ships inside the next
      mirror bump" consequence and the name-based citation
      (`CONTRIBUTING.md`, Publishing — version-mirror paragraph), which needs
      no line refresh because it cites a paragraph name. Verify: `grep -n
"major layout" openspec/specs/release-publishing/spec.md` → hits only
      inside the "The release record is tags and npm, not a CHANGELOG"
      requirement block (the delta replaces that block at archive), none in
      the Purpose. Scenarios: "Migration change moves the mirror version"
      (the Purpose must not contradict it), "Hotfix window with no upstream
      release" (the strict-mirror consequence the Purpose keeps describing
      is unchanged).

## 4. Verify

- [x] 4.1 Run `make check` (scripts/check.mjs, sync-vendor --check,
      typecheck, npm test). Expected output lines: `check: ok` and
      `sync-vendor: vendor/ in sync with @fission-ai/openspec@2.1.0 (12
skills)`; `npm test` green including the codex bundle byte-compare
      (`tests/codex-bundle.test.ts`) and the renamed assets test "every
      vendored skill parses and name equals directory". Scenarios: "All
      invariants hold", "Unstamped vendor tree passes the vendor-metadata
      group", "check.mjs invariants unaffected", "Vendored skill without a
      frontmatter stamp", "Migration change moves the mirror version" (the
      mirror invariant passes at 2.1.0), "Metadata renders on npm" (publish
      gates re-verified only at tag time — the pack preview in 4.3 is the
      local evidence).
- [x] 4.2 Run `node scripts/sync-vendor.mjs --check` a second time →
      identical in-sync line, exit 0 (idempotent no-op; regeneration is
      sandbox-only and writes nothing — determinism of the 2.1 output was
      proven by `diff -r` of two sandbox runs, design.md Context). This is
      the local analogue of the daily workflow's green no-op after merge.
      Scenarios: "Sandbox generation", "Shared skills location".
- [x] 4.3 Run `npm pack --dry-run`. Expected: tarball name
      `oh-my-openspec-2.1.0.tgz`; packed top-level entries unchanged
      (`agents`, `core`, `docs`, `opencode`, `skills`, `vendor`, `index.ts`,
      `README.md`, `LICENSE` — `plugins/` is not packed); under
      `vendor/openspec/` exactly `manifest.json` plus 12
      `skills/openspec-*/SKILL.md`; no `.openspec-target` in the listing.
      Scenarios: "Metadata renders on npm" (the dry-run lists the package
      metadata the publish workflow ships), "engines floor covers the pinned
      CLI" (`npm pack` reports no EBADENGINE for the package itself).
- [x] 4.4 Record the output of `git status --porcelain vendor plugins` BEFORE
      running `make fmt` (it is non-empty by design: 2.1/2.2 left the
      regenerated trees uncommitted and the playback contract forbids
      committing). Run `make fmt`, then re-run `git status --porcelain vendor
plugins` and require byte-identical output — fmt adds no new
      modification in either tree (`.prettierignore` excludes `vendor/` and
      `plugins/`, so both stay byte-identical to their generators). Any
      prettier reformat of hand-edited files (`scripts/sync-vendor.mjs`,
      `scripts/check.mjs`, `core/markdown.ts`, `tests/markdown.test.ts`,
      `tests/assets.test.ts`, `CONTRIBUTING.md`, `README.md`,
      `docs/vendor-sync.md`, `docs/codex.md`, this change's artifacts) is
      kept — the layout anchors of 1.1/1.2 were chosen prettier-stable, so
      re-verify them after fmt: `awk 'END{print NR}' scripts/sync-vendor.mjs`
      → `209`, `awk 'END{print NR}' scripts/check.mjs` → `238`. Finish with
      one final `make check` → green. Scenarios: "All invariants hold",
      "Sandbox generation" (final `--check` inside `make check`).
