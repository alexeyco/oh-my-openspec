# subagent-execution-policy — delta for rename-plugin-to-oh-my-openspec

## MODIFIED Requirements

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
