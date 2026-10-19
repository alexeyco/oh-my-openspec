# Design — rename-plugin-to-oh-my-openspec

## Approach

A single-pass mechanical rename with a hard boundary between plugin-owned
identifiers (renamed) and upstream/third-party identifiers (kept). No
behavior changes: every edit is a string, filename, or directory-name
substitution, so line counts — and therefore the `path:line` citations
inside baseline specs and delta blocks — stay valid untouched.

## The rename/keep boundary

| Renamed                                                                                                                                                                                                     | Kept                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| package `@alexeyco/opencode-openspec` → `oh-my-openspec`                                                                                                                                                    | `@fission-ai/openspec` devDependency                                                                                                                                                                                                                  |
| plugin id `opencode-openspec` → `oh-my-openspec`                                                                                                                                                            | tool name `openspec_validate`                                                                                                                                                                                                                         |
| commands `/openspec.<name>` (dot) → `/omos.<name>`                                                                                                                                                          | vendored `/openspec-<name>` commands (hyphen), `openspec` CLI, `openspec init`, `openspec archive`                                                                                                                                                    |
| flow skills `openspec-{init,plan,apply,retro}` → `omos-*` (dirs, ids, frontmatter)                                                                                                                          | vendored skill ids `openspec-*` under `vendor/openspec/`, including `openspec-archive-change` / `openspec-bulk-archive-change` (`archiveSkillId`, core/prompts.ts:111-112)                                                                            |
| roles `openspec-{researcher,planner,critic,implementer,verifier,reviewer,retrospector}` → `omos-*` — ids, `agents/*.md` filenames, every cross-reference (user override; reverses the earlier grill answer) | `openspec/` project directory, `SUBAGENT_CONTRACT` text, "OpenSpec" terminology                                                                                                                                                                       |
| retrospector scope glob `skills/openspec-*/SKILL.md` → `skills/omos-*/SKILL.md` (agents/omos-retrospector.md:10 after the rename)                                                                           | version mirror invariant (package.json.version stays 1.14.3, check.mjs:188)                                                                                                                                                                           |
| error prefix `opencode-openspec: …` → `oh-my-openspec: …` (opencode/index.ts:89)                                                                                                                            | third-party names: AngDrew/opencode-openspec (README footnotes and table rows), `registry.npmjs.org/opencode-openspec`, Octane0411/opencode-plugin-openspec (incl. its `openspec-plan` agent cell README.md:71), comparison-freshness.yml env entries |
| GitHub URLs → `github.com/alexeyco/oh-my-openspec`                                                                                                                                                          | banner subtitle `OPENSPEC-DRIVEN SUBAGENT WORKFLOW` (:69)                                                                                                                                                                                             |
| banner wordmark `OPENCODE-OPENSPEC` → `OH-MY-OPENSPEC` — all three layers: ghost nodes :63-64 and the tspan-split white face :65 (docs/gallery/banner.svg)                                                  | keyword `opencode-plugin`                                                                                                                                                                                                                             |
| tmpdir prefixes `o-opos-*` → `o-omos-*` (tests/roles:13, tests/vendor:13, tests/openspec:116-117, tests/comparison:133)                                                                                     | third-party fixtures in tests/comparison.test.ts (AngDrew/opencode-openspec, ABSENT_PACKAGES, SINGLE_COMMIT_REPO, opencode-plugin-openspec)                                                                                                           |

The decisive heuristic in prose files: `/openspec.x` (dot) is this plugin's
command and becomes `/omos.x`; among hyphenated `openspec-<name>` ids the
renamed set is closed and small — the four flow skills
`openspec-{init,plan,apply,retro}` and the seven roles
`openspec-{researcher,planner,critic,implementer,verifier,reviewer,retrospector}`
— and every other hyphenated `openspec-*` id is a vendored upstream skill
(`openspec-archive-change`, `openspec-bulk-archive-change`,
`openspec-propose`, `openspec-apply-change`, …) and stays.

## Decisions

1. **Renames are create-new + delete-old on the filesystem.** Implementers
   write `skills/omos-<id>/SKILL.md` and `agents/omos-<id>.md` with updated
   content, then delete the old paths with plain filesystem removes. No git
   commands — staging (and rename detection) belongs to the user. Old paths
   MUST be deleted: check.mjs groups 2-3 compare `ROLE_IDS`/`FLOW_SKILL_IDS`
   against disk exactly, both ways (the group-2 lockstep comparison at
   scripts/check.mjs:86 holds no role literals — it parses `ROLE_IDS` from
   core/roles.ts source — so it is satisfied by construction once group 1
   and group 3 land).

2. **Established-spec Purpose text is never edited in place; staleness is a
   recorded post-archive follow-up.** The delta merge provably never touches
   an established spec's Purpose: "The main spec already has one and it is
   authoritative - leave it alone (this is what `openspec archive` does; it
   warns and moves on)"
   (vendor/openspec/skills/openspec-sync-specs/SKILL.md:159-161;
   vendor/openspec/skills/openspec-archive-change/SKILL.md:156-157). Four
   baseline Purposes hardcode renamed identifiers —
   openspec/specs/slash-commands/spec.md:5-7,
   openspec/specs/skill-registration/spec.md:6-7,
   openspec/specs/orchestration-flows/spec.md:5-6,
   openspec/specs/vendor-sync/spec.md:6 — so this change records them as a
   post-archive manual touch-up note in proposal.md and tasks.md §6, the
   house pattern already used by the archived change
   2026-10-16-add-openspec-archive-command (its tasks.md:73-77 defers the
   same Purpose staleness to a post-archive manual follow-up). vendor-sync
   has no renamed identifier in any requirement, hence no vendor-sync delta
   file.

3. **Scenario headings stay verbatim; only scenario text renames.** The
   CLI validates a MODIFIED block against scenario-name identity —
   renaming a heading fails validation with "omits scenario(s) the
   current spec still has … archive refuses to drop them" (observed:
   `openspec validate rename-plugin-to-oh-my-openspec` → INVALID before
   this decision was applied). Headings that embed old command names
   (`/openspec.plan with an idea`) therefore stay as merge identity keys
   while their WHEN/THEN text uses the new `omos.*` names. Requirement
   headers stay verbatim for the same reason.

4. **README self-column display label `@alexeyco` stays; the collision
   requirement is REMOVED, not rewritten.** The public-positioning spec
   allows "author or short project name"; the author is unchanged. Only the
   link target moves to `https://www.npmjs.com/package/oh-my-openspec`, and
   the checked-date line `All cells checked 2026-10-17 …` stays. The rename
   ends the name collision with AngDrew's `opencode-openspec`, so "README
   disambiguates the package-name collision" goes to a REMOVED delta block
   with a Reason only — no Migration section, no replacement sentence
   (user's explicit choice) — and the README paragraph (README.md:36) is
   deleted. The AngDrew facts survive only in footnotes `[^13]`/`[^14]`,
   which the comparison-freshness presence checks (`Not published`,
   `registry.npmjs.org/opencode-openspec`, `single commit (2026-02-01`,
   `github.com/AngDrew/opencode-openspec`) require verbatim.

5. **package-lock.json is regenerated, not hand-edited:**
   `npm install --package-lock-only` after the package.json name change
   (updates lock :2,:8). No node_modules churn, no git writes.

6. **Clean cut, no aliases** (user decision): no compatibility shims for
   `/openspec.*` or old flow-skill/role ids. The old package gets
   `npm deprecate` (manual, §7 of tasks.md) instead.

7. **Release is a retag, not a version bump.** The version mirror forbids
   moving 1.14.3 → anything else locally (check.mjs:188 requires
   package.json.version == manifest `generatedBy`); tag `v1.14.3` already
   exists on the pre-rename commit, so the user deletes and re-creates it
   on the release commit after merge (manual, §7). publish.yml has no
   hardcoded package name — it reads package.json — so no workflow edit is
   needed. The first publish under the new name ships as
   `oh-my-openspec@1.14.3` on top of the user's placeholder 0.0.1; retag
   and `npm deprecate @alexeyco/opencode-openspec` are manual user steps,
   never run by implementers.

## Files to touch (exact, per group)

- **G1** opencode/index.ts; opencode/background.ts (comment :1);
  core/roles.ts; core/prompts.ts
- **G2** skills/omos-{init,plan,apply,retro}/SKILL.md (new; delete
  skills/openspec-{init,plan,apply,retro}/)
- **G3** agents/omos-{researcher,planner,critic,implementer,verifier,reviewer,retrospector}.md
  (new; delete the seven agents/openspec-*.md)
- **G4** scripts/check.mjs; tests/assets.test.ts; tests/prompts.test.ts;
  tests/background.test.ts; tests/roles.test.ts; tests/vendor.test.ts;
  tests/openspec.test.ts; tests/comparison.test.ts
- **G5** package.json; package-lock.json; README.md; Makefile; AGENTS.md;
  CONTRIBUTING.md; docs/agents.md; docs/using-both.md; docs/vendor-sync.md;
  docs/gallery/banner.svg
- **G6** no files — final verification and the post-archive Purpose
  follow-up note only

Not touched anywhere: openspec/specs/** baselines (no in-place Purpose
edits), vendor/**, .github/workflows/** (comparison-freshness env entries
name the third-party package; publish.yml reads package.json). G1-G5 touch
pairwise-disjoint file sets and are individually implementable;
`make check` goes green only once G1-G5 have all landed (see tasks.md
per-group expected states).

## Trade-offs

- **Intermediate red states accepted.** check.mjs cross-compares code
  constants against disk (groups 2-3) and pins the plugin-id literal
  (group 6); no group ordering makes every intermediate state green. Each
  group states its expected build result instead.
- **Baseline Purpose staleness window.** The four Purpose paragraphs named
  in decision 2 keep pre-rename identifiers until a post-archive manual
  touch-up (proposal.md follow-up note). Accepted: the delta mechanism
  provably ignores Purpose text, and in-place baseline edits are outside
  this change's write scope.
- **Retagging an existing version tag** rewrites release history for
  1.14.3; accepted by the user over waiting for upstream 1.14.4 (the npm
  package name changes, so the old tag's published artifact
  `@alexeyco/opencode-openspec@1.14.3` and the new
  `oh-my-openspec@1.14.3` are different packages — no republish conflict).
