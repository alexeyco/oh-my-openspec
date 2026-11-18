# Tasks — migrate-vendor-sync-openspec-2

## 1. Migrate the sync script and CLI pin

- [x] 1.1 Edit `scripts/sync-vendor.mjs`: (a) delete the sandbox step
      `runCli(["config", "set", "delivery", "skills"], env);` (line 85);
      (b) change `const generatedRoot = join(proj, ".opencode", "skills");`
      (line 95) to `join(proj, ".agents", "skills")`; (c) rewrite the header
      comment (lines 8-16 area) so it describes the 2.0 sequence
      (profile=custom + explicit 12-workflow list + `init --tools opencode`),
      names `.agents/skills/` as the render location the script reads, and
      keeps the init-vs-update rationale (`update` still exists in 2.0:
      `openspec update --help → Update OpenSpec instruction files`). Then
      grep for stale references in the same task:
      `grep -rn "delivery" scripts/` → no hits; `grep -n ".opencode"
scripts/sync-vendor.mjs` → no hits. Scenarios: "Sandbox generation",
      "Shared skills location", "init rather than update".
- [x] 1.2 In `package.json` set `"@fission-ai/openspec": "^2.0.0"` (line 39)
      and run `npm install` (refreshes `package-lock.json`). Verify:
      `node -p "require('./node_modules/@fission-ai/openspec/package.json').version"`
      → `2.0.0`, and the playback constraint "Node engine compatible":
      `node -p "require('./node_modules/@fission-ai/openspec/package.json').engines.node"`
      → `>=22.12.0`, satisfied by the repo's own `engines.node` `>=22.18`
      (`package.json:53-55`). Expected result after group 1 alone: `node
scripts/check.mjs` → `check: ok` (vendor and mirror still coherent at
      1.17.0), but `node scripts/sync-vendor.mjs --check` exits 1 with 12
      `~ skills/openspec-*/SKILL.md (changed upstream)` lines, `~
manifest.json (version or skill set differs)`, and `Fix: make sync,
then commit vendor/` — the committed tree is still 1.17.0 bytes; group
      2 resolves it. Scenarios: "Drift fails with a fix hint".

## 2. Regenerate vendor and bundle, restore the mirror, update docs and baseline spec

- [x] 2.1 Run `make sync`. Expected stdout:
      `sync-vendor: wrote 12 skill(s) from @fission-ai/openspec@2.0.0`.
      Verify `vendor/openspec/manifest.json` shows `"version": "2.0.0"` and
      `"generatedBy": "2.0.0"` with the same 12 sorted `openspec-*` ids, and
      `ls -a vendor/openspec/skills/` lists exactly those 12 directories —
      no `.openspec-target` entry. The write run also passes the end-of-script
      consistency guard without printing "manifest and vendor/ tree
      diverged". Scenarios: "Write mode replaces the tree", "Non-skill
      entries are skipped", "Post-write self-guard".
- [x] 2.2 Run `make codex` to regenerate `plugins/**` from the new vendor
      tree. Verify `git status --porcelain` shows modifications confined to
      `plugins/` for this step (the bundle byte-compare against
      `vendor/openspec/skills/` is enforced in 3.1 via
      `tests/codex-bundle.test.ts:388`).
- [x] 2.3 In `package.json` set `"version": "2.0.0"` (line 3), restoring
      `version == manifest.generatedBy` as required by
      `scripts/check.mjs:184-194`. Verify: `node -e
"const v=require('./package.json').version,g=JSON.parse(require('fs').readFileSync('vendor/openspec/manifest.json','utf8')).generatedBy;console.log(v===g?'mirror ok':'MISMATCH '+v+' '+g)"`
      → `mirror ok`. Scenarios: "Mismatched mirror fails local checks"
      (positive path — after the bump the check passes), "Migration change
      moves the mirror version" (release-publishing delta — this task is the
      bump it permits).
- [x] 2.4 Update `CONTRIBUTING.md:111-117` (Publishing, version-mirror
      paragraph) to the rule stated in this change's
      `specs/release-publishing/spec.md` delta (the SHALL wording belongs to
      the spec, not to contributor prose) — one rule change applied
      consistently everywhere the rule is stated (CONTRIBUTING here,
      `docs/vendor-sync.md` in 2.6, the baseline spec's requirements via the
      delta at archive and its `## Purpose` via the 2.5 hand-edit):
      the plugin `version` moves only in the daily `vendor-sync` workflow PR
      **or** in a migration change that moves the vendored CLI's major layout
      (documented exception; this change is its first application). Keep the
      surrounding rules intact: `scripts/check.mjs` fails any PR where
      `version != manifest.generatedBy`, no CHANGELOG file, merged PRs and
      npm history are the record, and the hotfix-window guidance below
      (currently `CONTRIBUTING.md:131-136`; it shifts down by the lines this
      edit adds) stays as written. Scenarios: "Migration change moves the
      mirror version" (release-publishing delta), "Hotfix window with no
      upstream release" (WHEN/THEN preserved verbatim; its citation re-formed
      to a paragraph name because this edit shifts the lines), "Daily sync
      PR" (workflow behavior itself is unchanged).
- [x] 2.5 Hand-edit the baseline spec
      `openspec/specs/release-publishing/spec.md` — an explicit, sanctioned
      exception to the delta mechanism, run after 2.4. Why it cannot ride the
      delta: OpenSpec deltas merge `### Requirement:` blocks only;
      `openspec sync` and `openspec archive` leave an established main-spec
      `## Purpose` untouched
      (`vendor/openspec/skills/openspec-sync-specs/SKILL.md:159-161` — "The
      main spec already has one and it is authoritative - leave it alone";
      `vendor/openspec/skills/openspec-archive-change/SKILL.md:156` —
      "Preserve existing `## Purpose` sections completely untouched for
      established main specs"). Without this edit the post-archive Purpose
      ("there is no CHANGELOG and no manual version bumps on feature
      branches", baseline lines 16-19) would keep forbidding what the
      MODIFIED requirement permits, and its citation `CONTRIBUTING.md:109-136`
      (line 19) goes stale once 2.4 inserts lines above it. The hand-edit is
      legitimate under the repo hierarchy: specs must stay coherent with the
      normative requirements they carry. Scope: touch only the `## Purpose`
      paragraph — the requirement blocks belong to the delta/archive
      mechanism. Do: (a) rewrite the Purpose sentence (lines 16-19) to state
      the same rule as the delta and the amended CONTRIBUTING (2.4) — because
      the plugin version mirrors the vendored OpenSpec version, there is no
      CHANGELOG, and the machine-owned mirror version moves only in the daily
      `vendor-sync` workflow PR or in a migration change that moves the
      vendored CLI's major layout (then the bump lands in that change's
      branch); keep the "merged plugin code ships inside the next mirror
      bump" consequence; (b) replace the stale `CONTRIBUTING.md:109-136`
      citation — re-read `CONTRIBUTING.md` after 2.4 and cite the actual
      post-edit Publishing-section range (or the paragraph name). Verify:
      `grep -n "109-136" openspec/specs/release-publishing/spec.md` → no
      hits, and the rewritten Purpose names the migration exception in the
      same terms as the delta. Scenarios: "Migration change moves the mirror
      version" (the Purpose must not contradict it), "Hotfix window with no
      upstream release" (the strict-mirror consequence the Purpose keeps
      describing is unchanged).
- [x] 2.6 Update `docs/vendor-sync.md` for the 2.0 layout: (a) intro
      paragraph — the bundles are the exact files `openspec init --tools
opencode` writes into `<proj>/.agents/skills/` under CLI 2.0 (shared
      location; no delivery setting); (b) "What is vendored" — example
      manifest `version`/`generatedBy` → `2.0.0`; (c) "Versioning: a strict
      mirror" — add the same migration exception as `CONTRIBUTING.md` (2.4)
      so the documents agree. Verify: `grep -n "1.14.2\|delivery"
docs/vendor-sync.md` → no hits. Expected result after group 2 alone:
      `make check` green (confirmed in 3.1). Scenarios: "Sandbox generation"
      and "Shared skills location" (the intro paragraph documents what they
      assert), "Migration change moves the mirror version"
      (release-publishing delta — the versioning section carries the same
      exception).

## 3. Verify

- [x] 3.1 Run `make check` (scripts/check.mjs, sync-vendor --check,
      typecheck, npm test). Expected output lines: `check: ok`
      (`scripts/check.mjs:238`) and
      `sync-vendor: vendor/ in sync with @fission-ai/openspec@2.0.0 (12 skills)`;
      `npm test` green including the codex bundle byte-compare
      (`tests/codex-bundle.test.ts:388`). Scenario: "Clean tree passes".
- [x] 3.2 Run `node scripts/sync-vendor.mjs --check` a second time →
      identical in-sync line, exit 0 (idempotent no-op; regeneration is
      sandbox-only and writes nothing). Scenario: "Clean tree passes".
- [x] 3.3 Run `npm pack --dry-run`. Expected: tarball name
      `oh-my-openspec-2.0.0.tgz`; packed top-level entries unchanged
      (`agents`, `core`, `docs`, `opencode`, `skills`, `vendor`, `index.ts`,
      `README.md`, `LICENSE` — `plugins/` is not packed); under
      `vendor/openspec/` exactly `manifest.json` plus 12
      `skills/openspec-*/SKILL.md`; no `.openspec-target` in the listing.
- [x] 3.4 Record the output of `git status --porcelain vendor plugins` BEFORE
      running `make fmt` (it is non-empty by design: 2.1/2.2 left the
      regenerated trees uncommitted and the playback contract forbids
      committing). Run `make fmt`, then re-run `git status --porcelain vendor
plugins` and require byte-identical output — fmt adds no new
      modification in either tree (`.prettierignore:4,6` excludes `vendor/`
      and `plugins/`, so both stay byte-identical to their generators). Any
      prettier reformat of hand-edited files (`scripts/sync-vendor.mjs`,
      `CONTRIBUTING.md`, `docs/vendor-sync.md`, this change's artifacts) is
      kept; finish with one final `make check` → green.
