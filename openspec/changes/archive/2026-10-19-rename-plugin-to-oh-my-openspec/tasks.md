# Tasks — rename-plugin-to-oh-my-openspec

Ground rules for every group: this is a mechanical rename — no behavior
changes, no drive-by edits. File and directory renames are done by creating
the new path with updated content and deleting the old path from the
filesystem; no git commands (staging and rename detection are the user's).
The rename/keep boundary table in design.md is decisive: `/openspec.<name>`
(dot, plugin command) becomes `/omos.<name>`; the four flow-skill ids
`openspec-{init,plan,apply,retro}` and the seven role ids
`openspec-{researcher,planner,critic,implementer,verifier,reviewer,retrospector}`
become `omos-*`; every other hyphenated `openspec-<name>` id is a vendored
upstream skill and stays (`openspec-archive-change`,
`openspec-bulk-archive-change`, `openspec-propose`, `openspec-apply-change`,
…); `openspec_validate`, `archiveSkillId`'s vendored return values, the
`openspec` CLI, `openspec init`, `openspec/` paths, `@fission-ai/openspec`,
"OpenSpec" terminology, third-party names (AngDrew/opencode-openspec,
registry.npmjs.org/opencode-openspec, Octane0411's `openspec-plan` agent
cell), and the version mirror (package.json.version stays 1.14.3) all stay.
No group edits `openspec/specs/**`.

## 1. Core registration code and identifiers

Files: `opencode/index.ts`, `opencode/background.ts`, `core/roles.ts`,
`core/prompts.ts`

- [x] 1.1 `opencode/index.ts`: header comment :3-4 command list
      `/openspec.init … /openspec.retro` → `/omos.init … /omos.retro`;
      `FLOW_SKILL_IDS` :42-47 → `"omos-init"`, `"omos-plan"`, `"omos-apply"`,
      `"omos-retro"`; `Plugin.define` id :54 → `"oh-my-openspec"`; startup
      error :89 → ``"oh-my-openspec: vendor/openspec tree does not match its manifest — run `make sync`"``;
      command-block comments :143,145,147,149,152 (`/openspec.*` → `/omos.*`;
      :153 role name `openspec-retrospector` → `omos-retrospector`; KEEP the
      vendored `openspec-archive-change`/`openspec-bulk-archive-change` at
      :150-151); `editor.add` names :157,168,179,190,201 → `omos.init`,
      `omos.plan`, `omos.apply`, `omos.archive`, `omos.retro`; `Skill.ID.make`
      literals :163,174,185,207 → `omos-init`, `omos-plan`, `omos-apply`,
      `omos-retro`. Do NOT touch: the `ROLE_IDS` import :12 and the
      role-registration loop (constant-driven, no literals), the
      `archiveSkillId(...)` call :196, the `openspec_validate` tool name :221
      and its description, the `validateProject` import, the SUBAGENT_CONTRACT
      injection :123-131.
- [x] 1.2 `core/roles.ts:8-16`: `ROLE_IDS` → `"omos-researcher"`,
      `"omos-planner"`, `"omos-critic"`, `"omos-implementer"`,
      `"omos-verifier"`, `"omos-reviewer"`, `"omos-retrospector"` (same
      order).
- [x] 1.3 `opencode/background.ts:1`: comment "forces openspec-role
      subagents to" → "forces omos-role subagents to". No code change — the
      helper receives the role-id set from the caller.
- [x] 1.4 `core/prompts.ts`: comments :1-2,39,61,83,105,115,150 — every
      `/openspec.<name>` → `/omos.<name>`; load lines :47 → `Load the
omos-init skill and follow it exactly.`, :69 → `omos-plan`, :91 →
      `omos-apply`, :156 → `omos-retro` (the non-skillPath branch; the
      skillPath branch :153-155 is generic and stays). KEEP unchanged: the
      `archiveSkillId` return values :111-112, the gate line :144 `Validate
first with the openspec_validate tool; …`, all fallback strings,
      `SUBAGENT_CONTRACT` (including its `openspec/` paths :25), the five
      `*_COMMAND_DESCRIPTION` constants.
- Expected build result after group 1 alone: `npm run typecheck` green;
  `node scripts/check.mjs` red in groups 2 and 3 (`ROLE_IDS`/`FLOW_SKILL_IDS`
  name `omos-*` while disk still holds `openspec-*`) and group 6 (the
  pinned literal `id: "opencode-openspec"` no longer appears in index.ts);
  `npm test` red in tests/prompts.test.ts (builders emit `omos-*` load
  lines against the old patterns), tests/assets.test.ts only at
  "agents/ contains exactly the ROLE_IDS" (:34-40), and tests/roles.test.ts
  only at "the repo's agents/ directory matches ROLE_IDS exactly" (:67-70);
  background/vendor/openspec/comparison tests green. All green again only
  after groups 2-5 land.
- Covers scenarios — slash-commands: "Command catalog after setup",
  "/openspec.plan with an idea", "/openspec.archive with one change id",
  "/openspec.archive with two change ids", "/openspec.apply with no
  change id", "/openspec.archive with no change ids", "/openspec.init
  with focus text", "/openspec.archive with irregular spacing",
  "Argument text dropped", "Execute body is a single prompt call",
  "Gate line present with a single id", "Gate line present with empty and
  bulk arguments", "Incomplete tasks are not gated by the command";
  skill-registration: "Flow skill added to host catalog" (code side),
  "Hand-edited vendor tree blocks startup"; subagent-execution-policy:
  "Role session gets the contract", "Non-role session unaffected",
  "Explicit foreground request overridden", "Legacy task tool and field
  recognized" (hook and `forceBackgroundEvent` wiring; the fixture side is
  re-enforced in group 4).

## 2. Flow-skill assets

Files: `skills/omos-init/SKILL.md`, `skills/omos-plan/SKILL.md`,
`skills/omos-apply/SKILL.md`, `skills/omos-retro/SKILL.md` (new); delete
`skills/openspec-init/`, `skills/openspec-plan/`, `skills/openspec-apply/`,
`skills/openspec-retro/`

- [x] 2.1 For each of the four flow skills: create
      `skills/omos-<name>/SKILL.md` from the old file with — frontmatter
      `name: omos-<name>`; H1 `# omos-<name>`; description `/openspec.<x>` →
      `/omos.<x>`; body: every role id
      `openspec-{researcher,planner,critic,implementer,verifier,reviewer,retrospector}`
      → `omos-*` (all dispatch and cross-reference lines, including the
      retrospector dispatch, skills/omos-retro/SKILL.md:30), every plugin
      command `/openspec.{init,plan,apply,archive,retro}` → `/omos.*`
      (including the retro command list, skills/omos-retro/SKILL.md:17-18, and
      the retro pointer :38), and the generic pattern `/openspec.<name>` →
      `/omos.<name>` (skills/omos-plan/SKILL.md:134,
      skills/omos-apply/SKILL.md:134). KEEP: `openspec_validate` (all four
      bodies), the vendored `/openspec-<name>` command mentions
      (skills/omos-plan/SKILL.md:136, skills/omos-apply/SKILL.md:135-136), the
      `openspec` CLI and `openspec init`, and `openspec/` artifact paths. Then
      delete the four old directories.
- [x] 2.2 Audit: `grep -rnE "openspec-(init|plan|apply|retro|researcher|planner|critic|implementer|verifier|reviewer|retrospector)([^a-z-]|$)|/openspec\." skills/omos-*/SKILL.md`
      → zero hits (the trailing boundary `([^a-z-]|$)` keeps the vendored
      id style `openspec-apply-change` out of the pattern); `ls skills/` shows
      exactly the four `omos-*` directories.
- Expected build result after group 2 alone (on top of group 1):
  `node scripts/check.mjs` group 3 green (FLOW_SKILL_IDS == disk), groups
  2 and 6 still red until groups 3-4; `npm test` red in
  tests/prompts.test.ts and tests/assets.test.ts (its local `FLOW_SKILL_IDS`
  :27-30 and body-reference paths point at deleted directories) until
  group 4, and in tests/roles.test.ts :67-70 until group 3.
- Covers scenarios — orchestration-flows (all): "All artifact writing
  goes to subagents", "Flow bodies stay wired to the roles they
  dispatch", "Plan degrades to critic-only on declined install", "Init
  and apply refuse to degrade", "No writing before playback
  confirmation", "Playback recites established findings", "Ununderstood
  question is restated, not assumed", "Probe-resolvable unknown never
  reaches the playback", "Critic waits for the revision to report DONE",
  "Critique loop is bounded at three rounds", "Final revise never waives
  INVALID", "Confirmed report names the branch read-only", "Next-step
  offers name the plugin's slash commands", "Un-evidenced capability is
  dropped", "Extend mode protects existing baselines", "Invalid change
  blocks implementation", "Implementer payload carries the full wave
  table", "File conflict becomes a mini-wave", "Truncation is
  re-dispatched, not halted on", "Manual acceptance groups gate Review",
  "Deferrals reach the user before Review", "Mid-wave request cites an
  existing task", "Post-final-wave full check suite run precedes Review",
  "Reviewer sees every implementer choice", "Fix round runs the repo's
  markdown check before re-review", "Composited passes counted and
  relayed", "Done report next steps name plugin slash commands",
  "Branching question is answered with the convention", "Archiving stays
  with the user", "Single dispatch with verbatim relay", "Empty run stops
  the flow"; skill-registration: "Flow skill added to host catalog"
  (on-disk side).

## 3. Role assets

Files: `agents/omos-researcher.md`, `agents/omos-planner.md`,
`agents/omos-critic.md`, `agents/omos-implementer.md`,
`agents/omos-verifier.md`, `agents/omos-reviewer.md`,
`agents/omos-retrospector.md` (new); delete the seven
`agents/openspec-*.md`

- [x] 3.1 Create each `agents/omos-<role>.md` from its counterpart with
      every renamed identifier replaced: role ids `openspec-*` → `omos-*`
      (cross-references between roles), and the retrospector's scope glob
      ``- `skills/openspec-*/SKILL.md` — flow skills`` →
      ``- `skills/omos-*/SKILL.md` — flow skills``
      (agents/omos-retrospector.md:10). No role body carries a `/openspec.*`
      command or a flow-skill id outside that glob (verified by grep before
      the edit), so no other substitution applies. KEEP: the frontmatter shape
      (`description` + `mode: subagent`, no model pin), `openspec_validate`
      and `openspec validate` mentions, and `openspec/` artifact paths. Then
      delete the seven old files.
- [x] 3.2 Audit: `grep -rnE "openspec-(init|plan|apply|retro|researcher|planner|critic|implementer|verifier|reviewer|retrospector)([^a-z-]|$)|/openspec\.|skills/openspec-" agents/`
      → zero hits; `ls agents/` shows exactly the seven `omos-*.md`;
      `grep -rn 'skills/omos-\*/SKILL.md' agents/omos-retrospector.md` →
      exactly one hit.
- Expected build result after group 3 (on top of groups 1-2):
  `node scripts/check.mjs` groups 2 and 3 green (the :86 ROLE_IDS↔agents/
  lockstep comparison holds by construction — it parses `ROLE_IDS` from
  source and holds no literals), group 6 red until group 4;
  tests/roles.test.ts :67-70 and tests/assets.test.ts :34-40 green;
  assets flow-skill tests and prompts.test.ts still red until group 4.
- Covers scenarios — agent-role-contracts (all): "Write bounds stated
  per mode", "Modes are never mixed", "MODIFIED header must match the
  baseline verbatim", "Compile-coupled groups merge into one", "Pre-DONE
  self-check of tasks against deltas", "Planner report disclaims
  archive-readiness", "Researcher fact carries evidence", "Critic reports
  findings only", "Probe answers a locally resolvable unknown",
  "Conflicting interface sources are both quoted", "INVALID verdict
  cannot be CLEAN", "Gate failure fails the verification", "Group
  boundary on ticking", "File conflict stops the implementer",
  "Deferral is the only legal unticked task", "Wave-sharing implementers
  scope their checks", "Reading code is not verification", "Well-formed
  deferrals pass the tasks check", "Manual-group deferral is flagged as a
  defect", "Composited proof is labeled", "Composited passes count
  toward the status", "Reviewer withholds approval on blocking
  findings", "Unquoted retrospector observation is dropped", "A quote
  that needs interpretation drops its finding", "A hypothetical cost
  disqualifies a finding", "The tally line opens a non-empty report",
  "Clean run prints only the clean token", "Stale proposal count blocks
  the change"; role-registration: "Agents directory drift fails the test
  gate" (disk side).

## 4. Tests and check-script literals

Files: `scripts/check.mjs`, `tests/assets.test.ts`, `tests/prompts.test.ts`,
`tests/background.test.ts`, `tests/roles.test.ts`, `tests/vendor.test.ts`,
`tests/openspec.test.ts`, `tests/comparison.test.ts`

- [x] 4.1 `scripts/check.mjs:224-225`: pinned literal
      `id: "opencode-openspec"` → `id: "oh-my-openspec"` and the failure
      message → `opencode/index.ts: plugin id must be "oh-my-openspec"`.
- [x] 4.2 `tests/assets.test.ts`: local `FLOW_SKILL_IDS` :27-30 → the
      four `omos-*` ids; flow-skill body-reference test — skill directory
      arguments :64,76,88,101 → `"omos-init"`, `"omos-plan"`, `"omos-apply"`,
      `"omos-retro"`, role-reference lists :68-70,80-82,92-95 and the
      `openspec-retrospector` check :105 → `omos-*`, and the assertion
      messages :73,85,98,106 → `omos-*` on both tokens (:106 → "omos-retro
      must reference omos-retrospector"). KEEP: the vendored assertions
      (:114-118 manifest equality, :120-135 `generatedBy` stamps) and the
      collision guard :137-142 (constant-driven; verify it needs no literal
      change).
- [x] 4.3 `tests/prompts.test.ts`: match patterns :23 → `/omos-init/`,
      :35 → `/omos-plan/`, :53 → `/omos-apply/`, :157 → `/omos-retro/`;
      negative patterns :46 → `doesNotMatch(text, /Load the omos-plan/)`,
      :164 → `/Load the omos-retro/`. KEEP: every archive-test literal (the
      :63 gate line, `openspec-archive-change`/`openspec-bulk-archive-change`
      at :70,81,102,123,132), the skillPath-branch assertions :45,121,163,
      the `SUBAGENT_CONTRACT` assertions.
- [x] 4.4 `tests/background.test.ts`: `ROLES` set :7 and fixtures
      :13,17,26,35,47,54,56 → `omos-implementer` / `omos-verifier`.
- [x] 4.5 `tests/roles.test.ts`: tmpdir prefix :13 `o-opos-roles-` →
      `o-omos-roles-`; fixture filenames and expected ids
      :36,39,46,47,53,61 → `omos-verifier.md`, `omos-researcher.md`,
      `omos-critic.md`, `omos-planner.md` and the matching id assertions
      (sorted order `omos-researcher` before `omos-verifier` is unchanged).
- [x] 4.6 Tmpdir prefixes elsewhere (cosmetic self-text, no assertion
      depends on the value): `tests/vendor.test.ts:13` `o-opos-vendor-` →
      `o-omos-vendor-`; `tests/openspec.test.ts:116-117`
      `o-opos-bin-`/`o-opos-proj-` → `o-omos-bin-`/`o-omos-proj-`;
      `tests/comparison.test.ts:133` `o-opos-comparison-` →
      `o-omos-comparison-`.
- [x] 4.7 `tests/comparison.test.ts`: :1527 `GITHUB_REPOSITORY` fixture →
      `"alexeyco/oh-my-openspec"`; :1546 negative assertion →
      `!content.includes("alexeyco/oh-my-openspec")`. KEEP every
      third-party fixture: AngDrew/opencode-openspec,
      `registry.npmjs.org/opencode-openspec`, `ABSENT_PACKAGES`,
      `SINGLE_COMMIT_REPO`, opencode-plugin-openspec (:51,60-61,272,533,
      581-586,715,735,805,953,992,1215-1293,1392,1493-1494).
- Expected build result after group 4 (on top of groups 1-3):
  `npm test` green; `npm run typecheck` green; `node scripts/check.mjs`
  green in groups 1-4 and 6, red only in group 5 (README still links the
  deleted `skills/openspec-*/` and `agents/openspec-*.md` paths) until
  group 5 lands.
- Covers scenarios — role-registration: "Filenames become sorted role
  ids", "Body is preserved for later trimming", "Agents directory drift
  fails the test gate"; release-publishing: "All invariants hold",
  "Multiple failures aggregate" (check.mjs group 6 literal); mechanically
  re-enforces every slash-commands scenario via tests/prompts.test.ts,
  the subagent-execution-policy scenarios "Explicit foreground request
  overridden" and "Legacy task tool and field recognized" via
  tests/background.test.ts, and skill-registration: "Flow skill added to
  host catalog" via the tests/assets.test.ts assertions.

## 5. Docs, package metadata, banner

Files: `package.json`, `package-lock.json`, `README.md`, `Makefile`,
`AGENTS.md`, `CONTRIBUTING.md`, `docs/agents.md`, `docs/using-both.md`,
`docs/vendor-sync.md`, `docs/gallery/banner.svg`

- [x] 5.1 `package.json`: :2 `"name": "oh-my-openspec"` (unscoped); :4
      description — `/openspec.plan` → `/omos.plan`, `/openspec.apply` →
      `/omos.apply`, rest of the sentence unchanged; :45 `repository.url` →
      `git+https://github.com/alexeyco/oh-my-openspec.git`; :47 `homepage` →
      `https://github.com/alexeyco/oh-my-openspec`; :48 `bugs` →
      `https://github.com/alexeyco/oh-my-openspec/issues`. KEEP: `version`
      1.14.3 (mirror invariant, check.mjs:188 == manifest `generatedBy`),
      keywords including `opencode-plugin`, `files`, `engines`, `author`. Then
      run `npm install --package-lock-only` so `package-lock.json:2,8` pick
      up the new name (no other lock changes; no git commands).
- [x] 5.2 `README.md`: :1 title → `# oh-my-openspec`; :10 `/omos.plan`;
      :14 `omos-researcher ×2`; :25 `/omos.apply`; :31 `/omos.init`; :36
      DELETE the whole collision-disambiguation paragraph ("Despite the
      shared name, …") with no replacement sentence — this executes the
      REMOVED public-positioning requirement (Reason only, no Migration);
      :39,68 self-column header links →
      `https://www.npmjs.com/package/oh-my-openspec` (display text
      `@alexeyco` stays); :70,76 self-cell npm links → the same URL; :74
      ``5 `/openspec.*` commands`` → ``5 `/omos.*` commands``; :75
      `/openspec.retro` → `/omos.retro`; :82 `/openspec.apply` →
      `/omos.apply`; :89 `openspec-critic` → `omos-critic`; :98-102 command
      bullets → labels `/omos.*` with links →
      `skills/omos-{init,plan,apply,retro}/SKILL.md` (at :101 `/omos.archive`
      keeps its link to the vendored
      `vendor/openspec/skills/openspec-archive-change/SKILL.md`); :106-112
      role bullets → labels `omos-*` with links → `agents/omos-*.md`;
      :118-121 flow-skill bullets → labels `omos-*` with links →
      `skills/omos-*/SKILL.md`; :139 install snippet →
      `{ "plugins": ["oh-my-openspec"] }`. KEEP: the :63 checked-date line
      `All cells checked 2026-10-17 against the linked public sources.`, :122
      the vendored-skill line, all competitor names and links (:51-61
      footnotes, :68-78 competitor cells including the :71 Octane0411 cell
      ``Single `openspec-plan` agent:``, :167 alternatives bullet), and the
      `Not published` / `registry.npmjs.org/opencode-openspec` /
      `single commit (2026-02-01` / `github.com/AngDrew/opencode-openspec`
      substrings the comparison-freshness presence checks require.
- [x] 5.3 `Makefile:5`: help banner → `@printf "oh-my-openspec — make targets:\n"`.
- [x] 5.4 `AGENTS.md:1`: title → `# oh-my-openspec`.
- [x] 5.5 `CONTRIBUTING.md`: :8 example commit message → `Added
omos-plan skill`; :27 local-install example →
      `{ "plugins": ["/absolute/path/to/oh-my-openspec"] }`; :61 layout-tree
      root → `oh-my-openspec/`; :74-80 role filenames → `omos-*.md`; :82-85
      skill directory names → `omos-{init,plan,apply,retro}/SKILL.md`.
- [x] 5.6 `docs/agents.md`: :17-19 command names → `/omos.*`; :27-47
      table role ids → `omos-*`; :51,59,77,91,102,109,119 headings →
      `### omos-*`; :167-173 flow-skill links (labels and targets) →
      `../skills/omos-*/SKILL.md`. KEEP the upstream `openspec` CLI mentions.
      Grep the whole file afterwards:
      `grep -nE "openspec-(init|plan|apply|retro|researcher|planner|critic|implementer|verifier|reviewer|retrospector)([^a-z-]|$)|/openspec\." docs/agents.md`
      → zero hits.
- [x] 5.7 `docs/using-both.md:3`: the five plugin command names →
      `/omos.init`, `/omos.plan`, `/omos.apply`, `/omos.archive`,
      `/omos.retro`; KEEP the upstream skill ids (`openspec-propose`,
      `openspec-apply-change`, …) and `openspec init --tools opencode`.
      `docs/vendor-sync.md:50`: `@alexeyco/opencode-openspec` →
      `oh-my-openspec`; KEEP :5-6,:21 vendored ids.
- [x] 5.8 `docs/gallery/banner.svg` — all three wordmark layers: ghost
      `<text>` nodes :63-64 `OPENCODE-OPENSPEC` → `OH-MY-OPENSPEC`, and the
      white face :65 tspan run →
      `<tspan>OH</tspan><tspan fill="#94a3b8">-MY</tspan><tspan>-</tspan><tspan fill="#94a3b8">OPEN</tspan><tspan>SPEC</tspan>`
      (same five-tspan shape, #94a3b8 accents kept on tspans 2 and 4;
      concatenated the tspans spell `OH-MY-OPENSPEC`). KEEP the :69 subtitle
      `OPENSPEC-DRIVEN SUBAGENT WORKFLOW` and all geometry/fills. Banner audit
      (the tspan split defeats full-word grep):
      `grep -niE "opencode.?openspec" docs/gallery/banner.svg` → zero hits,
      and `node -e "const s=require('fs').readFileSync('docs/gallery/banner.svg','utf8');for(const m of s.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g))console.log(m[1].replace(/<[^>]*>/g,''))"`
      prints exactly four lines: `OH-MY-OPENSPEC` three times (ghosts + face —
      the file's only other `<text>` element is the subtitle), then
      `OPENSPEC-DRIVEN SUBAGENT WORKFLOW`.
- [x] 5.9 Audit: `grep -rn "@alexeyco/opencode-openspec" README.md Makefile
AGENTS.md CONTRIBUTING.md docs/ package.json package-lock.json` → zero
      hits; `node scripts/check.mjs` group 5 (relative links) green.
- Expected build result after group 5 (on top of groups 1-4): `make
check` green — all four gates (check.mjs, sync-vendor --check, tsc
  --noEmit, node --test).
- Covers scenarios — public-positioning: "Five sourced columns", "Every
  cell carries its source", "States defined by legend", "Relative links
  stay valid" (the REMOVED requirement "README disambiguates the
  package-name collision" carries no scenarios; its effect — deleting
  README.md:36 — lands in 5.2); release-publishing: "Metadata renders on
  npm", "check.mjs invariants unaffected"; comparison-freshness: "Env
  version entry yields registry expectation", "Scoped names split on the
  last @", "Env absent entry yields 404 expectation", "Env commit entry
  yields single-commit expectation", "Malformed env entry is loud, never
  skipped", "Presence checks are substring, not structural", "The
  workflow job env block carries the three variables" (no code or
  workflow-env change — README claim substrings preserved by 5.2 and the
  audit 6.3 proves the script and env stayed untouched).

## 6. Final verification and post-archive Purpose follow-up note

Files: none — this group only runs checks and records a note; it edits no
file, and no group ever edits `openspec/specs/**` in place.

- [x] 6.1 Record the post-archive manual follow-up (a user note, NOT an
      implementer edit; house pattern:
      openspec/changes/archive/2026-10-16-add-openspec-archive-command/tasks.md:73-77):
      after this change archives, refresh by hand the stale `## Purpose`
      paragraphs — openspec/specs/slash-commands/spec.md:5-7 (command names →
      `/omos.*`), openspec/specs/skill-registration/spec.md:6-7 (flow ids →
      `omos-*`), openspec/specs/orchestration-flows/spec.md:5-6 (flow ids →
      `omos-*`), openspec/specs/vendor-sync/spec.md:6
      (`@alexeyco/opencode-openspec` → `oh-my-openspec`) — because the delta
      merge never rewrites an established spec's Purpose
      (vendor/openspec/skills/openspec-sync-specs/SKILL.md:159-161; see
      design.md decision 2). The note already stands in proposal.md; this task
      only surfaces it in the apply run's report to the user.
- [x] 6.2 Run `openspec validate rename-plugin-to-oh-my-openspec` →
      expect VALID; run `make check` → green; run `make fmt`, then `make
check` again → still green (prettier must not have changed any
      semantics; vendor/ is prettier-ignored).
- [x] 6.3 Final audit over project files (the `--exclude-dir` flags below
      are the `vendor/`, `node_modules/`, `.git/`, `openspec/` exclusions).
      Role-id gate — ZERO occurrences:
      `grep -rnE "openspec-(researcher|planner|critic|implementer|verifier|reviewer|retrospector)" --exclude-dir=vendor --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=openspec .`
      → zero hits. Flow-id/command/old-package gate — exactly one kept
      third-party hit:
      `grep -rnE "@alexeyco/opencode-openspec|openspec\.(init|plan|apply|archive|retro)|openspec-(init|plan|apply|retro)([^-a-z0-9]|$)" --exclude-dir=vendor --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=openspec .`
      → exactly one hit, the kept competitor cell README.md:71
      (``Single `openspec-plan` agent:`` — Octane0411's agent name,
      third-party, kept); zero others. The trailing `([^-a-z0-9]|$)` boundary
      keeps the alternation from substring-matching the kept vendored ids
      (`openspec-apply-change` in README.md:122, docs/using-both.md:3,
      docs/vendor-sync.md:5-6,:21; `openspec-archive-change` in README.md:101,
      opencode/index.ts:150-151, core/prompts.ts:111-112). Allowed hits
      everywhere: `openspec_validate`, the `openspec` CLI and `openspec init`,
      `openspec/` paths, "OpenSpec" terminology, the vendored
      `openspec-archive-change`/`openspec-bulk-archive-change` ids, and
      third-party names. Remaining
      `grep -rn "opencode-openspec" --exclude-dir=vendor --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=openspec .`
      hits are exactly the third-party ones: README.md AngDrew
      footnotes/links/cells (including :71), tests/comparison.test.ts AngDrew
      fixtures, .github/workflows/comparison-freshness.yml:45-46.

## 7. Manual release steps — user-owned, post-merge; not implementer tasks and not an acceptance gate

This section is documentation required by the confirmed contract; it
carries no checkboxes on purpose. These steps cannot run during apply —
the tag must point at the release commit on master, and implementers
never run npm or git write commands. The user executes them after the
rename merges:

- Retag: delete the existing git tag `v1.14.3` (it points at the
  pre-rename commit b765524), re-create it on the release commit, and
  push it. The publish.yml gate (tag == `package.json` version, both
  1.14.3; the workflow reads the package name from package.json and
  needs no edit) then publishes `oh-my-openspec@1.14.3` with provenance
  on top of the 0.0.1 placeholder.
- Deprecate the old package across all published versions (0.0.0-stage,
  1.14.2, 1.14.3):
  `npm deprecate @alexeyco/opencode-openspec "Renamed: install unscoped 'oh-my-openspec' instead"`.
