# Rename the plugin to oh-my-openspec

## Why now

The identity has already moved: the GitHub repo is `alexeyco/oh-my-openspec`
and the npm name `oh-my-openspec` is held by the user's own account as a
placeholder (`oh-my-openspec@0.0.1`, description "Name holder"). Every code
and doc surface still says `@alexeyco/opencode-openspec` with `/openspec.*`
commands and `openspec-*` flow skills and roles. One cohesive rebrand change
aligns package, plugin id, commands, flow skills, agent roles, docs, and the
baseline specs with the claimed name, so the first real publish ships as
`oh-my-openspec@1.14.3` on top of the placeholder (0.0.1 < 1.14.3, no
registry conflict).

## What changes

Renamed identifiers (old → new):

- npm package: `@alexeyco/opencode-openspec` → unscoped `oh-my-openspec`
  (package.json name, description, repository/homepage/bugs URLs, lockfile).
- Plugin id: `opencode-openspec` → `oh-my-openspec` (opencode/index.ts:54,
  pinned literal in scripts/check.mjs:224-225), and the startup error prefix
  in the message "opencode-openspec: vendor/openspec tree does not match its
  manifest — run `make sync`" → "oh-my-openspec: vendor/openspec tree does
  not match its manifest — run `make sync`" (opencode/index.ts:89).
- Five commands (dot format kept): `openspec.init|plan|apply|archive|retro`
  → `omos.init|omos.plan|omos.apply|omos.archive|omos.retro`, no aliases
  (opencode/index.ts:157-207).
- Four flow skills: `openspec-init|plan|apply|retro` →
  `omos-init|omos-plan|omos-apply|omos-retro` — directories `skills/<id>/`,
  SKILL.md frontmatter name and H1, `FLOW_SKILL_IDS` (opencode/index.ts:42-47),
  `Skill.ID.make` bindings, and the load lines in core/prompts.ts.
- Seven agent roles: `openspec-researcher|planner|critic|implementer|verifier|reviewer|retrospector`
  → `omos-*` — `ROLE_IDS` (core/roles.ts:8-16), `agents/*.md` filenames, and
  every cross-reference in flow-skill and role bodies, docs, and test
  fixtures, including the retrospector's scope glob
  `skills/openspec-*/SKILL.md` → `skills/omos-*/SKILL.md`
  (agents/omos-retrospector.md:10 after the rename). The check.mjs
  ROLE_IDS↔agents/ lockstep gate (scripts/check.mjs:86) stays satisfied by
  construction — it parses `ROLE_IDS` from source and compares against disk,
  holding no role literals of its own.
- docs/gallery/banner.svg wordmark: `OPENCODE-OPENSPEC` → `OH-MY-OPENSPEC`
  in all three wordmark layers — the two chromatic ghost `<text>` nodes
  (:63-64) and the tspan-split white face (:65), whose concatenated tspans
  must spell the new name; the subtitle `OPENSPEC-DRIVEN SUBAGENT WORKFLOW`
  (:69) stays.
- Docs and metadata: README (role links :106-112 included), Makefile help
  banner (:5), AGENTS.md title (:1), CONTRIBUTING.md (agent filename list
  :74-80 included), docs/agents.md (role tables and headings included),
  docs/using-both.md, docs/vendor-sync.md, and all GitHub URLs →
  `github.com/alexeyco/oh-my-openspec`.
- Tests' self-texts: check.mjs:224-225 plugin-id pin, assets.test.ts
  role/flow assertions, roles.test.ts and background.test.ts fixtures,
  the opencode/background.ts:1 comment,
  tests/comparison.test.ts:1527,1546 self fixture →
  `alexeyco/oh-my-openspec`, and the tmpdir prefixes `o-opos-*` → `o-omos-*`
  (tests/roles.test.ts:13, tests/vendor.test.ts:13,
  tests/openspec.test.ts:116-117, tests/comparison.test.ts:133).
- README collision paragraph (README.md:36) deleted — the rename removes the
  name collision it disambiguated (see the REMOVED requirement under
  public-positioning).

Decision (user override, this revise round): the role ids and `agents/*.md`
filenames DO rename to `omos-*`. This reverses the earlier grill answer that
had kept them as `openspec-*`; the final decision is rename. Flow-skill
bodies and role bodies therefore dispatch and cross-reference `omos-*`
roles everywhere.

Kept unchanged (constraints): the `openspec_validate` tool name; the 12
vendored `vendor/openspec/**` skills and their ids (including
`openspec-archive-change`/`openspec-bulk-archive-change` returned by
`archiveSkillId`, core/prompts.ts:111-112); the upstream `openspec` CLI and
`openspec init` invocations; the `openspec/` project directory;
`@fission-ai/openspec`; "OpenSpec" terminology; the keyword
`opencode-plugin`; the version mirror — `package.json.version` stays 1.14.3,
invariant check.mjs:188 (== manifest `generatedBy`); third-party names in
the README comparison table (AngDrew/opencode-openspec footnotes and rows
stay); `.github/workflows/comparison-freshness.yml` env entries (they name
the AngDrew package, not ours).

Out of scope: Codex host support (future change); the name `oh-my-spec`
(npm `oh-my-spec@1.0.0` belongs to a different owner — dropped);
`openspec/changes/archive/**` history; backward-compat aliases; any in-place
edit of `openspec/specs/**` baseline text.

Post-archive manual follow-up (house pattern —
openspec/changes/archive/2026-10-16-add-openspec-archive-command/tasks.md:73-77):
after this change archives, refresh by hand the stale `## Purpose`
paragraphs that hardcode renamed identifiers —
openspec/specs/slash-commands/spec.md:5-7 (command names → `/omos.*`),
openspec/specs/skill-registration/spec.md:6-7 (flow ids → `omos-*`),
openspec/specs/orchestration-flows/spec.md:5-6 (flow ids → `omos-*`),
openspec/specs/vendor-sync/spec.md:6 (`@alexeyco/opencode-openspec` →
`oh-my-openspec`). The delta merge never rewrites an established spec's
Purpose, and this change makes no in-place baseline edits. vendor-sync has
no renamed identifier in any requirement, hence no vendor-sync delta file.

## Impact on capabilities

Nine delta spec files under `specs/` holding 31 requirement blocks —
30 `## MODIFIED Requirements` with full block text plus 1 `## REMOVED
Requirements`: slash-commands (7 MODIFIED), skill-registration (2),
role-registration (2), orchestration-flows (6), subagent-execution-policy
(2), agent-role-contracts (7), public-positioning (1 MODIFIED + 1 REMOVED),
release-publishing (2), comparison-freshness (1). The behaviors are
unchanged — only the identifiers inside requirement text, scenario text,
and file citations move. public-positioning REMOVES "README disambiguates
the package-name collision" (Reason only, no Migration section): the renamed
package no longer collides with AngDrew's `opencode-openspec`, and the
README paragraph is deleted. spec-validation is not affected (tool name
kept).

ASSUMPTION: the plugin id is the literal "oh-my-openspec" (opencode/index.ts:54, pin scripts/check.mjs:224-225) — user's playback choice (untested — a pin value is intent, nothing local disproves it).
ASSUMPTION: the npm name `oh-my-openspec` is held by the user's own placeholder, so the first publish rides on top of it at 1.14.3 — `npm view oh-my-openspec version` → `version = '0.0.1'`.
ASSUMPTION: the README self-column display label `@alexeyco` and the line `All cells checked 2026-10-17 against the linked public sources.` stay; only the self-column link targets move to `https://www.npmjs.com/package/oh-my-openspec` (user's playback choice).
ASSUMPTION: the `o-opos-*` tmpdir prefixes are plugin self-text and become `o-omos-*` — `grep -rn "o-opos" tests/` → 5 `mkdtempSync` prefix lines only, no assertion reads the prefix value.
ASSUMPTION: no backward-compat aliases for `/openspec.*` commands or old flow-skill/role ids — clean cut in the single next release 1.14.3 under the new package (user answer during the grill).
ASSUMPTION: all GitHub URL references move to github.com/alexeyco/oh-my-openspec — the remote is already renamed, the old slug redirects, nothing keeps the old URL.
ASSUMPTION: the startup error-string prefix rename ("oh-my-openspec: vendor/openspec tree does not match its manifest — run `make sync`") is included in the plugin-id rename.
ASSUMPTION: retag v1.14.3 and `npm deprecate @alexeyco/opencode-openspec` are manual user steps documented in tasks.md §7; implementer subagents never run npm publish/deprecate or git write commands.
REJECTED-RISK: users of the old package learn the new name only from the npm-deprecate message; no migration section in README — user's explicit choice.
