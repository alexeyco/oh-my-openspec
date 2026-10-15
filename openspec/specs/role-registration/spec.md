# role-registration

## Purpose

Defines how the plugin turns the markdown files under `agents/` into OpenCode
subagent roles. Each `agents/<id>.md` file is loaded at plugin setup, its
frontmatter is validated against a strict shape (description + `mode:
subagent`, nothing else), and the file body becomes the role's system prompt
registered with the host. The set of role ids is pinned in code to the seven
openspec flow roles, and an integration test keeps the `agents/` directory in
exact lockstep with that list, so a missing, extra, or malformed role file
fails loudly rather than silently degrading the flow.

## Requirements

### Requirement: Role discovery from agents directory

The loader SHALL enumerate every file ending in `.md` in the given agents
directory, derive each role id from the filename minus the `.md` suffix, and
return the loaded roles sorted by id for deterministic ordering. Non-`.md`
files SHALL be ignored (core/roles.ts:26-39, tests/roles.test.ts:34-49).

#### Scenario: Filenames become sorted role ids

- **WHEN** `loadRoles` is run over a directory containing `openspec-verifier.md` and `openspec-researcher.md` plus an unrelated `notes.txt`
- **THEN** exactly two roles are returned, with ids `openspec-researcher` first and `openspec-verifier` second, and `notes.txt` is not loaded

#### Scenario: Body is preserved for later trimming

- **WHEN** a role file has valid frontmatter and a body
- **THEN** the loaded asset carries the raw body (plus `id`, `path`, `description`, `mode`) for the adapter to use (core/roles.ts:20-24,35)

### Requirement: Role id set is pinned to seven flow roles

`ROLE_IDS` SHALL be exactly the seven ids `openspec-researcher`,
`openspec-planner`, `openspec-critic`, `openspec-implementer`,
`openspec-verifier`, `openspec-reviewer`, `openspec-retrospector`
(core/roles.ts:8-16), and the real `agents/` directory SHALL contain files
matching that set exactly — no more, no fewer — as enforced by the assets
integration test (tests/assets.test.ts:34-40).

#### Scenario: Agents directory drift fails the test gate

- **WHEN** a role file is added to or removed from `agents/` without updating `ROLE_IDS`
- **THEN** the "agents/ contains exactly the ROLE_IDS" assertion fails

### Requirement: Role frontmatter validation

A role document's frontmatter SHALL parse to an object containing a string
`description` and a `mode` equal to the string `"subagent"`; the presence of a
`color` key or a `model` key SHALL throw. This enforces the repo rules that
subagents ship no colors and never pin models (core/markdown.ts:48-83).

#### Scenario: Missing or non-string description

- **WHEN** a role file's frontmatter has `description: 42` or no description at all
- **THEN** loading throws `role doc: frontmatter missing string 'description'` (tests/roles.test.ts:51-55)

#### Scenario: Wrong mode

- **WHEN** a role file declares `mode: primary` (or any value other than `"subagent"`, or a non-string)
- **THEN** loading throws `role doc: frontmatter 'mode' must be "subagent"` (core/markdown.ts:60-62)

#### Scenario: Model pin rejected

- **WHEN** a role file's frontmatter contains a `model` key
- **THEN** loading throws `role doc: 'model' is not allowed — roles inherit the session model` (core/markdown.ts:72-76, tests/roles.test.ts:57-65)

### Requirement: Malformed markdown fails loudly at load

If a role file lacks parseable `---`-delimited YAML frontmatter, the frontmatter
is not an object, or the YAML is invalid, loading SHALL throw rather than skip
the file (core/markdown.ts:24-46). Because setup calls `loadRoles` before any
registration, such a file aborts plugin setup.

#### Scenario: Missing frontmatter delimiter

- **WHEN** a role file does not begin with a `---\n ... ---\n` frontmatter block
- **THEN** loading throws `markdown: missing or invalid YAML frontmatter` (core/markdown.ts:26-28)

### Requirement: Registration maps roles onto host agents

During plugin setup each loaded role SHALL be registered via
`ctx.agent.transform` by updating the host agent entry with
`name = role.id`, `description = role.description`, `mode = role.mode`, and
`system = role.body.trim()` (opencode/index.ts:60-71).

#### Scenario: Registered agent shape

- **WHEN** the plugin setup runs against a valid `agents/` directory
- **THEN** for each role the host sees an agent named after the file id, in `subagent` mode, whose system prompt is the file body with surrounding whitespace stripped, and whose description comes from frontmatter
