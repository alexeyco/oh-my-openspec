# slash-commands

## Purpose

Defines the four user-facing OpenCode commands the plugin registers —
`/openspec.init`, `/openspec.plan`, `/openspec.apply`, `/openspec.retro` —
and how each turns user input into a session prompt. Executing a command
does not perform the workflow itself: it composes a short instruction from a
pure builder function and sends it to the current session bound to exactly
one flow skill, so the skill's playbook drives everything that follows. Init,
plan, and apply each have a documented empty-argument fallback; their
non-empty arguments are embedded into a labeled line — verbatim for plan,
trimmed for init and apply. Retro takes no user argument at all.

## Requirements

### Requirement: Four commands registered with fixed descriptions

Setup SHALL register exactly the four commands `openspec.init`,
`openspec.plan`, `openspec.apply`, `openspec.retro` via
`ctx.command.transform` followed by `ctx.command.reload()`, each with its
constant description from `core/prompts.ts` (opencode/index.ts:149-196,
core/prompts.ts:5-15).

#### Scenario: Command catalog after setup

- **WHEN** plugin setup completes
- **THEN** the host offers the four `/openspec.*` commands with descriptions "Bootstrap the project's baseline capability specs through research and critique", "Draft an OpenSpec change through interview, research, and critique", "Implement an OpenSpec change through parallel subagent waves", "Retrospect the finished run: ≤8 cited findings on the plugin's own prompts"

### Requirement: Execute prompts the session bound to exactly one flow skill

Each command's `execute` SHALL call `ctx.session.prompt` on the invoking
`sessionID` with text produced by the corresponding builder (which always
begins `Load the <skill-id> skill and follow it exactly.`) and SHALL bind
exactly one skill: `openspec-init`, `openspec-plan`, `openspec-apply`, or
`openspec-retro` for the respective command (opencode/index.ts:153-193,
core/prompts.ts:33-104).

#### Scenario: /openspec.plan with an idea

- **WHEN** the user runs `/openspec.plan add CSV export`
- **THEN** the session receives the prompt text `Load the openspec-plan skill and follow it exactly.\nUser request: add CSV export` with `skills` set to only `openspec-plan`

### Requirement: Empty-argument fallbacks for init, plan, apply

When the argument text is empty or whitespace-only, the builders SHALL append
a fallback line instead of an argument echo: init — "No focus given —
discover candidate capabilities from the code itself."; plan — "The user gave
no request text — your first job is to elicit it."; apply — "No change id
given — list active changes, pick or confirm one before dispatch."
(core/prompts.ts:33-51,64-82,86-104).

#### Scenario: /openspec.apply with no change id

- **WHEN** the user runs `/openspec.apply` with no argument
- **THEN** the prompt text ends with the "No change id given — list active
  changes…" fallback line and contains no `Change:` line

### Requirement: Non-empty arguments embedded verbatim

For non-empty arguments the builders SHALL embed the text into a labeled
line: `Focus areas: <focus>` (init, trimmed), `User request: <request>`
(plan, verbatim), `Change: <changeId>` (apply, trimmed)
(core/prompts.ts:42-48,73-79,95-97).

#### Scenario: /openspec.init with focus text

- **WHEN** the user runs `/openspec.init auth and billing`
- **THEN** the prompt text contains `Focus areas: auth and billing` after the skill-load line

### Requirement: Retro takes no user argument

`openspec.retro`'s `execute` SHALL destructure only `sessionID` and call
`retroInstruction()` with no argument, so any text the user types after the
command is ignored; the instruction is fixed: load `openspec-retro` and
"Compile the evidence bundle from this session and dispatch the
retrospector." (opencode/index.ts:186-192, core/prompts.ts:55-60).

#### Scenario: Argument text dropped

- **WHEN** the user runs `/openspec.retro some stray text`
- **THEN** the session prompt is identical to a bare `/openspec.retro` — it contains no "some stray text"

### Requirement: Commands invoke no tools or git themselves

Each command's `execute` body SHALL only call `ctx.session.prompt` — no tool
invocations, no git state changes — pushing all workflow behavior into the
skill playbooks (opencode/index.ts:153-193,148).

#### Scenario: Execute body is a single prompt call

- **WHEN** any of the four commands executes
- **THEN** its code performs exactly one host call (`ctx.session.prompt`) and nothing else

UNVERIFIED: The repo-wide "commands never touch git" invariant (comment at
opencode/index.ts:148) is enforced downstream only through skill and
contract instructions; the end-to-end run was not observed by this
baseline.
