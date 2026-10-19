# role-registration — delta for rename-plugin-to-oh-my-openspec

## MODIFIED Requirements

### Requirement: Role discovery from agents directory

The loader SHALL enumerate every file ending in `.md` in the given agents
directory, derive each role id from the filename minus the `.md` suffix, and
return the loaded roles sorted by id for deterministic ordering. Non-`.md`
files SHALL be ignored (core/roles.ts:26-39, tests/roles.test.ts:34-49).

#### Scenario: Filenames become sorted role ids

- **WHEN** `loadRoles` is run over a directory containing `omos-verifier.md` and `omos-researcher.md` plus an unrelated `notes.txt`
- **THEN** exactly two roles are returned, with ids `omos-researcher` first and `omos-verifier` second, and `notes.txt` is not loaded

#### Scenario: Body is preserved for later trimming

- **WHEN** a role file has valid frontmatter and a body
- **THEN** the loaded asset carries the raw body (plus `id`, `path`, `description`, `mode`) for the adapter to use (core/roles.ts:20-24,35)

### Requirement: Role id set is pinned to seven flow roles

`ROLE_IDS` SHALL be exactly the seven ids `omos-researcher`,
`omos-planner`, `omos-critic`, `omos-implementer`,
`omos-verifier`, `omos-reviewer`, `omos-retrospector`
(core/roles.ts:8-16), and the real `agents/` directory SHALL contain files
matching that set exactly — no more, no fewer — as enforced by the assets
integration test (tests/assets.test.ts:34-40).

#### Scenario: Agents directory drift fails the test gate

- **WHEN** a role file is added to or removed from `agents/` without updating `ROLE_IDS`
- **THEN** the "agents/ contains exactly the ROLE_IDS" assertion fails
