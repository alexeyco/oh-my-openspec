# Subagent execution policy

## Purpose

Defines the two cross-cutting behaviors the plugin applies to role
subagents at runtime: contract injection and forced background dispatch.
Every session whose agent is one of the seven role ids receives the shared
`SUBAGENT_CONTRACT` text appended to its system prompt, so all roles obey
the same reporting, artifact-hygiene, and git-safety rules without per-file
copies. Separately, every tool call that dispatches a role agent is
rewritten to run in the background, enabling the orchestrator to run roles
concurrently in waves; calls targeting non-role agents pass through
untouched and inputs are never mutated.

## Requirements

### Requirement: Contract injected into role sessions

Setup SHALL register a `ctx.session.hook("context")` listener that, when
`event.agent` is one of `ROLE_IDS`, pushes `{ type: "text", text:
SUBAGENT_CONTRACT }` onto `event.system`; sessions for any other agent SHALL
receive no contract text (opencode/index.ts:123-131).

#### Scenario: Role session gets the contract

- **WHEN** a session context event fires with `agent = "omos-planner"`
- **THEN** the system text list gains the full SUBAGENT_CONTRACT block

#### Scenario: Non-role session unaffected

- **WHEN** a session context event fires with an agent id outside `ROLE_IDS`
- **THEN** no contract text is pushed (opencode/index.ts:125)

### Requirement: Contract content is a fixed block

`SUBAGENT_CONTRACT` SHALL be the constant text asserting, in order: the
final message is a report for the orchestrator (findings first, then
evidence with exact paths, commands, key output lines); the artifacts
under `openspec/` are the contract — quote them, change them only where
the role prompt says so, never silently rewrite; never run git write
commands, enumerated as add, commit, push, stash, checkout, switch,
reset, restore, clean — version control belongs to the user, and the
contract adds the principle "Never mutate the working tree or refs;
compare against committed state with `git show`/`git diff`."; quoted
Guardrails are hard constraints — stop and report `BLOCKED: <reason>` if
the task cannot proceed without violating one; label anything
unverifiable `UNVERIFIED`, never guess; no drive-by refactors; and every
report is written in English regardless of the session's reply language,
appended as the constant's final sentence
(core/prompts.ts:21-37) — with
"never run git write commands" kept verbatim so the contract test
(tests/prompts.test.ts:168-173) passes unmodified.

#### Scenario: Single source of truth

- **WHEN** any role needs the contract
- **THEN** it comes from this one constant, not from copies in
  `agents/*.md` (opencode/index.ts:123-125 comment, injected at
  :126-134)

#### Scenario: Enumeration covers working-tree mutations

- **WHEN** the contract's git clause is read
- **THEN** the parenthetical lists all nine commands (add, commit, push,
  stash, checkout, switch, reset, restore, clean) and the text states
  that mutation of the working tree or refs is never allowed while
  `git show`/`git diff` against committed state is the comparison path
  (core/prompts.ts:27-30)

#### Scenario: Report language is pinned

- **WHEN** the contract text is read
- **THEN** its final sentence requires every report in English regardless
  of the session's reply language (core/prompts.ts:36)

### Requirement: Role dispatch forced into the background

Setup SHALL register a `ctx.tool.hook("execute.before")` listener that
replaces `event.input` with the result of `forceBackgroundEvent(event.tool,
event.input, roleIds)` (opencode/index.ts:135-137). For tool names
`subagent` and `task` (current and legacy host spellings), when the input
record's `agent` or `subagent_type` field (first string found) names a role
id, the hook SHALL return a shallow copy with `background: true`, overriding
even an explicit `background: false` (opencode/background.ts:6-14,39-64).

#### Scenario: Explicit foreground request overridden

- **WHEN** a `subagent` call inputs `{ agent: "omos-verifier", background: false }`
- **THEN** the hook input becomes `{ agent: "omos-verifier", background: true }` (tests/background.test.ts:23-30)

#### Scenario: Legacy task tool and field recognized

- **WHEN** a `task` call inputs `{ subagent_type: "omos-implementer" }`
- **THEN** the returned copy has `background: true` (tests/background.test.ts:32-39)

### Requirement: Non-role and non-dispatch calls pass through unmutated

`forceBackgroundEvent` SHALL return the identical input value (reference
equality) when the tool is not `subagent`/`task`, when the input is not a
plain object, when no role-name field is present, or when the named agent is
not a role id; the matching case returns a new copy and SHALL never mutate
the argument object (opencode/background.ts:44-64).

#### Scenario: Explore agent unaffected

- **WHEN** a `subagent` call inputs `{ agent: "explore", background: false }`
- **THEN** the hook returns the same object reference, `background` still `false` (tests/background.test.ts:41-44)

#### Scenario: Input never mutated

- **WHEN** the helper forces background on an object
- **THEN** the original object is unchanged after the call (tests/background.test.ts:53-57)
