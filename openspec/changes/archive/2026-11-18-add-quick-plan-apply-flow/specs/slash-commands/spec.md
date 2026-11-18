## RENAMED Requirements

### Requirement: Six commands registered with fixed descriptions

FROM: Four commands registered with fixed descriptions
TO: Six commands registered with fixed descriptions

Setup SHALL register exactly the six commands `omos.init`, `omos.plan`,
`omos.quick`, `omos.apply`, `omos.archive`, and `omos.retro` via
`ctx.command.transform` followed by `ctx.command.reload()`, each with a
constant description from `core/prompts.ts`. The quick description SHALL say
that the command plans and applies one behavior in one capability in one run.

#### Scenario: Command catalog after setup

- **WHEN** plugin setup completes
- **THEN** the host offers the six `/omos.*` commands, including
  `/omos.quick` with a description that identifies its short plan-and-apply
  behavior for one behavior in one capability

## MODIFIED Requirements

### Requirement: Execute prompts the session bound to exactly one flow skill

Each command SHALL prompt the invoking session with its flow-specific builder
and bind exactly one matching skill. Archive SHALL select the single or bulk
vendored skill by the number of supplied change ids.

#### Scenario: Quick command binds only the quick flow skill

- **WHEN** the user runs `/omos.quick add a small export option`
- **THEN** the session receives a prompt naming `omos-quick`, carrying the
  request text, with `skills` set to only `omos-quick`

#### Scenario: /openspec.plan with an idea

- **WHEN** the user runs `/omos.plan add CSV export`
- **THEN** the session receives the prompt text `Load the omos-plan skill and follow it exactly.\nUser request: add CSV export` with `skills` set to only `omos-plan`

#### Scenario: /openspec.archive with one change id

- **WHEN** the user runs `/omos.archive add-dark-mode`
- **THEN** the session receives prompt text beginning `Load the openspec-archive-change skill and follow it exactly.` with `skills` set to only `openspec-archive-change`

#### Scenario: /openspec.archive with two change ids

- **WHEN** the user runs `/omos.archive add-a add-b`
- **THEN** the session receives prompt text beginning `Load the openspec-bulk-archive-change skill and follow it exactly.` with `skills` set to only `openspec-bulk-archive-change`

### Requirement: Commands invoke no tools or git themselves

Each command's `execute` body SHALL only call `ctx.session.prompt` — no tool
invocations, no git state changes — pushing all workflow behavior into the
skill playbooks.

#### Scenario: Quick command performs one session prompt

- **WHEN** the quick command executes
- **THEN** its code performs exactly one host call (`ctx.session.prompt`)
  and does not invoke tools or Git operations

#### Scenario: Execute body is a single prompt call

- **WHEN** any command executes
- **THEN** its code performs exactly one host call (`ctx.session.prompt`) and nothing else

## ADDED Requirements

### Requirement: Quick command elicits a request when no argument is supplied

The quick command builder SHALL pass a non-empty user request to `omos-quick`
and SHALL instruct the skill to elicit a request when the command has no
argument.

#### Scenario: Quick command without a request

- **WHEN** the user runs `/omos.quick` without argument text
- **THEN** the session prompt tells `omos-quick` to elicit the change request
