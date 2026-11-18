# Migrate vendor-sync to OpenSpec CLI 2.1

## Why now

The scheduled `vendor-sync` run 44119711577 (2026-11-17) is red: the
"Re-vendor OpenSpec skills" step printed
`sync-vendor: CLI produced no skills directory` and
`##[error]Process completed with exit code 2.` (observed via
`gh run view 44119711577 --log-failed`). The workflow installs
`@fission-ai/openspec@latest`, upstream released 2.1.0, and 2.1 changed
`init` to default to the **global** scope: skills render into
`$HOME/.agents/skills` and `<proj>/.agents` is never created, so
`scripts/sync-vendor.mjs:98-103` exits 2. Two more 2.1 breakages land on the
same run: the CLI now strips the per-release `generatedBy` stamp from skill
frontmatter (`dist/core/shared/skill-generation.js:29-30`
`stripVolatileFrontmatter`), which three repo gates compare against the
manifest (`scripts/check.mjs:173-176`, `tests/assets.test.ts:168-172`, and
the `skill-registration` requirement "SKILL.md frontmatter validation"); and
2.1.0's own `engines.node` is `>=22.20.0` while this repo declares `>=22.18`
(`package.json:53-55`). Until the migration lands, every daily run fails and
no upstream skill refresh can ship.

## What changes

- `scripts/sync-vendor.mjs` — pass `--scope project` to `init` (mandatory
  under 2.1; 2.0 does not know the flag and exits 1 "unknown option", so a
  stale pin fails loudly), rewrite the header comment (2.1 sequence, global
  default rationale, git+network clone prerequisite). Layout-neutral edits:
  the file stays 209 lines and `const generatedRoot` stays at line 98
  (proven against prettier in a scratch copy), so the spec citations to this
  file keep pointing at the same code. No fallback to the global or 1.x
  locations — only the 2.1 project-scoped path.
- `scripts/check.mjs` — remove the per-skill frontmatter stamp comparison
  (lines 173-176), replaced in place by a 4-line explanatory comment; the
  file stays 238 lines, so every `check.mjs:NNN` citation in the baseline
  specs (184-194, 233-238, 210-215, 39-54, 228) stays valid. The version
  invariant is now manifest-only: manifest structure, plain-semver
  `generatedBy` (179-180), dirs == `manifest.skills` (160-162), and the
  mirror check (184-194) all remain; `name == id` frontmatter check (171-172)
  remains.
- `core/markdown.ts` — remove the `vendoredGeneratedBy` export (99-111): its
  only consumers were the two stamp checks being removed; header comment
  example updated to the 2.1 frontmatter (`metadata: { author: ... }`).
- `tests/markdown.test.ts`, `tests/assets.test.ts` — drop the function's
  unit-test block, the import entries, and the stamp assertion; the vendored
  test keeps parse + `name == directory id`.
- `package.json` — devDependency pin `^2.0.0` → `^2.1.0` (line 39);
  `engines.node` `>=22.18` → `>=22.20` (line 54); `version` `2.0.0` →
  `2.1.0` (line 3) **after** regeneration, followed by
  `npm install --package-lock-only` so the lockfile's root version fields
  match — the 2.0 migration needed a fixup commit for skipping exactly this
  (ca6366d "Bumped package-lock version to 2.0.0 (#38)").
- `vendor/openspec/**` — regenerated with `make sync`; manifest `version` and
  `generatedBy` become `2.1.0`; the same 12 `openspec-*` skill ids
  (sandbox-vs-vendor id diff verified SAME), 9 of 12 bodies carry upstream's
  mechanical 2.1 rewording, no frontmatter carries `generatedBy` anymore.
  Sandbox generation needs git + network: a fresh sandbox clones the skill
  sources from GitHub (`git clone --depth 1 --branch v2.1.0`).
- `plugins/**` — regenerated with `make codex`; the bundle body
  byte-comparison against `vendor/openspec/skills/`
  (`tests/codex-bundle.test.ts`) must land in the same change.
- `CONTRIBUTING.md` — Node floor 22.20 (line 12); Publishing exception
  generalized from "moves the vendored CLI's **major** layout" to a
  layout move that breaks vendoring, **major or minor** (lines 111-121);
  git+network prerequisite noted in the vendored-skills section.
- `README.md:163` — "Node.js ≥ 22.18" → "Node.js ≥ 22.20".
- `docs/vendor-sync.md` — 2.1 layout with `--scope project`, manifest
  example → `2.1.0`, "How each file stays provable" rewritten to the
  manifest-only version invariant (no stamp comparison), git+network
  prerequisite, generalized mirror exception, stamp wording purged.
- `docs/codex.md` — the "Node floor" section no longer claims the codex
  installer floor (22.18, the type-stripping minimum — unchanged, it is an
  independent runtime gate) equals the package `engines` floor (now 22.20).
- `openspec/specs/release-publishing/spec.md` — `## Purpose` hand-edited
  (task 3.5), the same sanctioned exception as the 2.0 migration: deltas
  merge requirements only, and sync/archive never rewrite an established
  main-spec Purpose, so the generalized exception wording is aligned
  directly; requirement blocks merge from this change's delta at archive.
- `.github/workflows/vendor-sync.yml` — **unchanged** (out of scope per the
  confirmed contract): it installs `@latest`, ubuntu-latest provides git and
  network, and its sync/codex/mirror/PR steps are layout-agnostic. After
  this change lands, the daily run regenerates identical bytes (determinism
  proven by `diff -r` of two sandbox runs) and is a green no-op.

## Capabilities

- `vendor-sync` — MODIFIED: "Generation runs the pinned CLI in a throwaway
  sandbox" — the sequence gains `--scope project`, the "Sandbox generation"
  scenario includes the flag, the render-location and exit-2 wording is
  corrected without changing semantics, and the git+network prerequisite is
  recorded. The other requirements are untouched: byte-identical copying is
  unchanged, and the manifest — already the recorded version carrier —
  becomes the _sole_ one under 2.1.
- `release-publishing` — MODIFIED ×4: "The release record is tags and npm,
  not a CHANGELOG" (exception generalized to major-or-minor layout moves
  that break vendoring; the scenario's pinned `1.17.0 → 2.0.0` numbers
  become historical examples so the next migration passes without a
  rewrite); "check.mjs enforces six invariant groups" (the vendor-metadata
  group is manifest-only — no frontmatter stamp comparison — with a scenario
  for unstamped trees); "package.json declares homepage, bugs, and author"
  (`engines.node` SHALL be `>=22.20`); "README Node requirement matches
  engines" (≥ 22.20; keeps the 20.19 scenario and adds a 22.18 stale-floor
  scenario).
- `skill-registration` — MODIFIED: "SKILL.md frontmatter validation" loses
  the `metadata.generatedBy` clause (unsatisfiable under 2.1) and gains a
  scenario for unstamped vendored frontmatter; `name == id` and
  name/description validation remain; the 12-skill count is unchanged, so
  the discovery and integrity-gate requirements need no delta.
- `codex-host-integration` — **no delta**: the bundle byte-identity rule
  stays as written (only the source bytes are regenerated), the spec states
  no Node floor and cites no `generatedBy` behavior (verified by grep).
- `public-positioning` — **no delta**: "All 12 upstream workflow skills"
  remains true (same 12 ids under 2.1), and its `scripts/check.mjs:210-215`
  group-5 citations stay valid because the check.mjs edit is
  layout-neutral.

## Impact

Tooling, tests, docs, specs, and generated content only. The single
runtime-adjacent removal is `core/markdown.ts`'s `vendoredGeneratedBy`,
dictated by the stamp invariant moving to the manifest — sanctioned
explicitly by the confirmed contract. The migration must land atomically:
the stamp gates fail under 2.1 bytes, `--check` fails under 2.0 bytes, and
the mirror fails under a version-only bump. Tag `v2.1.0` is pushed by the
user after merge; this change touches no workflow and publishes nothing.
Accepted citation drift: the `tests/assets.test.ts` edits shift its later
lines by −1/−6, leaving the citations in requirements this change does not
modify (`role-registration` 34-40, `orchestration-flows` 62-107,
`skill-registration` 52-60/114-118) a few lines off; the baseline already
carries looser drift (`role-registration` cites 34-40 for a test at 38-44;
`skill-registration:74` cites 120-135 for a check at 159-174), and chasing
±1-line citations would MODIFY four requirements in three capabilities
purely for line numbers — see design decision 4.

ASSUMPTION: `^2.1.0` resolves to exactly 2.1.0 through implementation — `npm view @fission-ai/openspec dist-tags → { next: '0.3.0', beta: '1.6.0-beta.1', latest: '2.1.0' }` (run 2026-11-17); if upstream publishes a newer 2.x before task group 2 runs, regenerate and mirror the installed version and read the expected `@2.1.0` output lines as `@<installed version>`.

REJECTED-RISK: none.
