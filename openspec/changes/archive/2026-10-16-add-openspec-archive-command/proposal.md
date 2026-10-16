# Add /openspec.archive command

## Why now

The plan→apply→archive loop is incomplete: the plugin registers four
commands (`/openspec.init`, `/openspec.plan`, `/openspec.apply`,
`/openspec.retro`) but nothing for archiving. `skills/openspec-apply/SKILL.md:99`
ends every successful run by pointing the user at the bare vendored skill
`openspec-archive-change` instead of a plugin command — the one workflow
step that closes the loop is the one without an entry point.

## What changes

- Fifth command `/openspec.archive [change-id ...]`, registered exactly
  like the existing four (constant description from `core/prompts.ts`,
  single `ctx.session.prompt` call in the execute body).
- Skill binding selected by argument count: 0–1 ids bind the vendored
  skill `openspec-archive-change`; 2+ ids bind
  `openspec-bulk-archive-change`. Exactly one skill per call.
- Every archive instruction carries a validation gate line: validate
  first with the `openspec_validate` tool, hard stop on INVALID —
  liftable only by explicit user instruction.
- Incomplete-tasks behavior (warn + confirm) stays with the vendored
  skills, unchanged; the command adds no task-completeness check.
- No edits under `vendor/openspec/**`. Edits are limited to
  `core/prompts.ts`, `opencode/index.ts`, tests, README/docs, and the
  pointer line in `skills/openspec-apply/SKILL.md`.

## Impact on capabilities

- `slash-commands`: five requirements MODIFIED (headers kept verbatim as
  the CLI matching keys) and one ADDED (archive validation gate line).
- No other capability delta. `skill-registration` and `role-registration`
  are undelta'd: no new curated flow skills (`FLOW_SKILL_IDS` stays four —
  archive binds vendored skills) and no new roles.

## Out of scope

- An own CLI wrapper around `openspec archive` — the vendored-skill flow
  IS what the base config uses; behavior stays with the skills.
- A new curated `openspec-archive` flow skill.
- A separate bulk command (bulk is the same command, chosen by id count).
- Any edits to vendored skill text.

## Assumptions

ASSUMPTION: ARCHIVE_COMMAND_DESCRIPTION wording "Archive completed OpenSpec changes through the vendored archive workflows".
ASSUMPTION: multi-id parsing is whitespace-separated, trimmed, order preserved.
ASSUMPTION: the gate line is embedded in every archiveInstruction output; the check itself is done by the orchestrator via openspec_validate, not the execute body.

## Risks

REJECTED-RISK: ручная mv-оркестрация легаси-скилла может разойтись с поведением CLI openspec archive — пользователь выбрал переиспользование легаси-скиллов, vendor-regenerated файл править нельзя.
