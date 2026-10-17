# Harden flow contracts for retro

## Why now

A retrospective of a finished run produced 14 confirmed findings in the
plugin's own prompt texts: ordering gaps in the apply flow, a git-write
enumeration narrower than its intent, missing planner self-checks, no
legal status for "this task belongs to the user", an editorial consistency
rule the critic lacks, and a playback that recites intent without reciting
evidence. The fixes are text-only insertions and edits in
`skills/*/SKILL.md`, `agents/*.md`, and the `SUBAGENT_CONTRACT` constant;
no plugin code behavior changes. Landing them before the next run keeps
the flow scripts and role prompts the contract they claim to be.

## What changes

- **apply flow** (`skills/openspec-apply/SKILL.md`): §4 gains a mid-wave
  request dedup rule checked against the wave table; §5 carves
  prompt-truncation `BLOCKED:` out of the halt-and-ask bullet — it is the
  orchestrator's defect, re-dispatched with a numbered edit list of at
  most 150 lines referencing `file:line` locations; §6 gains a
  manual/eyeball-group gate (ANY unticked manual group blocks Review, not
  only UI-touching ones; `DEFERRED:` is inadmissible for their tasks) and
  relay of every `DEFERRED:` line to the user before Review; §7 runs the
  repo's own markdown/lint check, when it has one, over artifacts touched
  by a fix round before re-review; §8 reports `DEFERRED:` entries verbatim
  and cites the repo's branch-naming convention on branching questions —
  branch creation, renaming, and commits stay with the user. The
  "never run git write commands" guardrail is not weakened.
- **plan flow** (`skills/openspec-plan/SKILL.md`): §3 requires every
  interview question to gloss its terms and to be restated with the gloss
  when the user signals non-understanding, before recording an
  `ASSUMPTION:`; §6's playback becomes seven lines — the existing six plus
  an `Established:` recital of up to 5 decision-relevant research
  findings, absences included. Phrasing is language-agnostic.
- **planner role** (`agents/openspec-planner.md`): a `### Requirement:`
  under `## MODIFIED` must match the baseline header verbatim (renames go
  to `## RENAMED Requirements`); no conditional-fallback task may stand in
  for a header fix; a pre-DONE `tasks.md`↔delta self-check; compile-coupled
  groups merge into one (distinct from waves serialization, which orders
  parallel dispatch); the report claims no archive-readiness from a passing
  validate.
- **critic role** (`agents/openspec-critic.md`): new BLOCKING editorial
  rule — every count or list in `proposal.md` must match the actual blocks
  in `specs/**/spec.md`.
- **implementer + verifier roles**: the line
  `DEFERRED: <task-id> — <reason> — <user action>` becomes the only legal
  way to leave a spec-mapped task unticked, admissible only when
  completion needs actions or authority outside the implementer's remit,
  and never for tasks in manual/eyeball acceptance groups; the verifier
  treats a well-formed deferral as legitimate and a malformed one — or
  any manual-group deferral — as a defect. The wording is locked across
  all four sites (implementer, verifier, apply §6, apply §8).
- **subagent contract** (`core/prompts.ts`, `SUBAGENT_CONTRACT` text
  only): enumeration extended to (add, commit, push, stash, checkout,
  switch, reset, restore, clean), plus "Never mutate the working tree or
  refs; compare against committed state with `git show`/`git diff`." The
  tested phrase "never run git write commands" stays intact
  (`tests/prompts.test.ts:168-173` must pass unmodified).

Line-number citations inside the MODIFIED requirements are re-synced to
the final file state as part of this change; other spec files keep their
citations untouched.

## Impact on capabilities

Seven delta requirements, all covering the 14 findings (findings 7 and 11
are one change item):

- `orchestration-flows`: 2 MODIFIED (plan-flow gate; apply-flow gate,
  ordering, and reporting).
- `agent-role-contracts`: 3 MODIFIED (planner modes; implementer group
  confinement; verifier scenario execution) and 1 ADDED (critic
  proposal↔delta consistency).
- `subagent-execution-policy`: 1 MODIFIED (contract content block).
- No other capability is touched. `role-registration` and
  `skill-registration` are unaffected: no new roles or skills, only prompt
  text edits; `assets.test.ts` references stay intact.

## Out of scope

- Replacing line-number citations with section anchors.
- Plugin code behavior beyond prompt text (hooks, registration, vendor).
- Consumer projects — plugin-side texts only.

## Rejected risks

REJECTED-RISK: none — no risk was dismissed during the grill.

ASSUMPTION: exact English wording of each insertion is the planner's
choice within the confirmed constraints, matching surrounding file style.
ASSUMPTION: citation re-sync covers only the requirements this change
MODIFIES, within the same delta files.
ASSUMPTION: acceptance is `make check` green; tasks instruct running
`make fmt` over touched files inside the check group, not at commit time
(the plugin never commits).
ASSUMPTION: findings 7 and 11 are implemented as a single §8 insertion.
