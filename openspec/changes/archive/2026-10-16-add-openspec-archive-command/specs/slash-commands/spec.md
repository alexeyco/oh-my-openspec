# slash-commands — delta for add-openspec-archive-command

## MODIFIED Requirements

### Requirement: Four commands registered with fixed descriptions

Note: this header is kept verbatim as the CLI matching key; it now
describes five commands. Setup SHALL register exactly the five commands
`openspec.init`, `openspec.plan`, `openspec.apply`, `openspec.retro`,
`openspec.archive` via `ctx.command.transform` followed by
`ctx.command.reload()`, each with its constant description from
`core/prompts.ts` (opencode/index.ts:149-196, core/prompts.ts:5-15).

#### Scenario: Command catalog after setup

- **WHEN** plugin setup completes
- **THEN** the host offers the five `/openspec.*` commands with
  descriptions "Bootstrap the project's baseline capability specs through
  research and critique", "Draft an OpenSpec change through interview,
  research, and critique", "Implement an OpenSpec change through parallel
  subagent waves", "Retrospect the finished run: ≤8 cited findings on the
  plugin's own prompts", "Archive completed OpenSpec changes through the
  vendored archive workflows"

### Requirement: Execute prompts the session bound to exactly one flow skill

Each command's `execute` SHALL call `ctx.session.prompt` on the invoking
`sessionID` with text produced by the corresponding builder (which,
without an explicit `skillPath`, always begins
`Load the <skill-id> skill and follow it exactly.`; with `skillPath` the
load line becomes `Read the skill file <path> and follow it exactly.`,
per the core/prompts.ts:36-39 convention) and SHALL bind exactly one
skill: `openspec-init`, `openspec-plan`, `openspec-apply`, or
`openspec-retro` for the respective command. The archive command SHALL
bind a vendored skill selected by argument count:
`openspec-archive-change` when the argument text holds 0 or 1 change ids,
`openspec-bulk-archive-change` when it holds 2 or more
(opencode/index.ts:153-193, core/prompts.ts:33-104).

#### Scenario: /openspec.plan with an idea

- **WHEN** the user runs `/openspec.plan add CSV export`
- **THEN** the session receives the prompt text `Load the openspec-plan skill and follow it exactly.\nUser request: add CSV export` with `skills` set to only `openspec-plan`

#### Scenario: /openspec.archive with one change id

- **WHEN** the user runs `/openspec.archive add-dark-mode`
- **THEN** the session receives prompt text beginning `Load the
openspec-archive-change skill and follow it exactly.` with `skills` set
  to only `openspec-archive-change`

#### Scenario: /openspec.archive with two change ids

- **WHEN** the user runs `/openspec.archive add-a add-b`
- **THEN** the session receives prompt text beginning `Load the
openspec-bulk-archive-change skill and follow it exactly.` with `skills`
  set to only `openspec-bulk-archive-change`

### Requirement: Empty-argument fallbacks for init, plan, apply

When the argument text is empty or whitespace-only, the builders SHALL
append a fallback line instead of an argument echo: init — "No focus
given — discover candidate capabilities from the code itself."; plan —
"The user gave no request text — your first job is to elicit it."; apply —
"No change id given — list active changes, pick or confirm one before
dispatch."; archive — "No change ids given — list active changes, confirm
with the user which to archive." (core/prompts.ts:33-51,64-82,86-104).

#### Scenario: /openspec.apply with no change id

- **WHEN** the user runs `/openspec.apply` with no argument
- **THEN** the prompt text ends with the "No change id given — list active
  changes…" fallback line and contains no `Change:` line

#### Scenario: /openspec.archive with no change ids

- **WHEN** the user runs `/openspec.archive` with no argument, or with
  whitespace-only argument text
- **THEN** the prompt text carries the "No change ids given — list active
  changes, confirm with the user which to archive." fallback line and
  contains no `Change:` or `Changes:` line

### Requirement: Non-empty arguments embedded verbatim

For non-empty arguments the builders SHALL embed the text into a labeled
line: `Focus areas: <focus>` (init, trimmed), `User request: <request>`
(plan, verbatim), `Change: <changeId>` (apply, trimmed). The archive
builder SHALL embed one id as `Change: <id>` and two or more ids as
`Changes: <id1>, <id2>` — ids split on whitespace, each trimmed, joined
with comma-space, order preserved (core/prompts.ts:42-48,73-79,95-97).

#### Scenario: /openspec.init with focus text

- **WHEN** the user runs `/openspec.init auth and billing`
- **THEN** the prompt text contains `Focus areas: auth and billing` after the skill-load line

#### Scenario: /openspec.archive with irregular spacing

- **WHEN** the argument text is `  add-b   add-a  `
- **THEN** the prompt text contains `Changes: add-b, add-a` — trimmed ids
  in the given order, comma-space join, no stray spacing

### Requirement: Commands invoke no tools or git themselves

Each command's `execute` body SHALL only call `ctx.session.prompt` — no
tool invocations, no git state changes — pushing all workflow behavior
into the skill playbooks. The command set grows from four to five; the
invariant applies to `openspec.archive` as well
(opencode/index.ts:153-193,148).

#### Scenario: Execute body is a single prompt call

- **WHEN** any of the five commands executes
- **THEN** its code performs exactly one host call (`ctx.session.prompt`) and nothing else

## ADDED Requirements

### Requirement: Archive instruction always carries the validation gate line

`archiveInstruction` SHALL append, as its final line and regardless of
argument count, the gate line: "Validate first with the openspec_validate
tool; stop on INVALID unless the user explicitly overrides." The
validation itself is performed by the orchestrator session through the
`openspec_validate` tool — the execute body invokes no tools — and INVALID
output is a hard stop liftable only by explicit user instruction.

#### Scenario: Gate line present with a single id

- **WHEN** the user runs `/openspec.archive add-dark-mode`
- **THEN** the prompt text is exactly `Load the openspec-archive-change skill and follow it exactly.\nChange: add-dark-mode\nValidate first with the openspec_validate tool; stop on INVALID unless the user explicitly overrides.`

#### Scenario: Gate line present with empty and bulk arguments

- **WHEN** `archiveInstruction` is called with empty argument text, or
  with two or more change ids
- **THEN** the returned text ends with the gate line in every case

#### Scenario: Incomplete tasks are not gated by the command

- **WHEN** the bound vendored skill later finds unchecked tasks in
  `tasks.md`
- **THEN** its warn-and-confirm behavior applies unchanged — the command
  adds no task-completeness check of its own
