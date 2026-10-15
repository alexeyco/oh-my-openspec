# spec-validation

## Purpose

Defines the `openspec_validate` tool: a mechanical contract gate that
delegates all spec/change validation rules to the upstream `openspec` CLI
instead of re-implementing them. The tool runs `openspec validate` with
`--json`, defensively parses the report, and formats a single
agent-readable string (`VALID …` / `INVALID …` with numbered issues /
`UNAVAILABLE …` / `ERROR …`). Every outcome — including a missing CLI,
unparseable output, or a non-zero exit — is returned as tool content; the
tool never throws at the host.

## Requirements

### Requirement: Single tool with optional change selector

The plugin SHALL register exactly one tool named `openspec_validate` whose
input is an object with an optional string property `change`; a blank
(whitespace-only or empty) `change` SHALL be treated as absent, and the
working directory for CLI calls SHALL be `ctx.location?.directory` falling
back to `process.cwd()` (opencode/index.ts:202-231,54).

#### Scenario: Blank change falls back to full-project validation

- **WHEN** the tool executes with `change: "   "`
- **THEN** `validateProject` is called with `undefined` and the CLI runs `openspec validate --all --json` (opencode/index.ts:221-225, core/openspec.ts:156-158)

### Requirement: CLI invocation is never a rejection path

`runOpenspec` SHALL spawn `openspec` with the given args in the given cwd and
resolve for every outcome: on spawn failure with `ENOENT` it resolves
`{ missing: true }` with an install-hint stderr ("npm install -g
@fission-ai/openspec, or brew install openspec"); other spawn errors resolve
`missing: false` with the error string; process close resolves with `ok`
equal to exit code zero and captured stdout/stderr (core/openspec.ts:16-46).
When `missing` is true, `validateProject` SHALL return the string
`UNAVAILABLE: <install hint>` without parsing (core/openspec.ts:160-162).

#### Scenario: Missing CLI yields UNAVAILABLE, not a crash

- **WHEN** the `openspec` binary is not in PATH and the tool is called
- **THEN** the tool returns content starting `UNAVAILABLE: openspec CLI not found in PATH` and offers install instructions

### Requirement: Defensive parsing of the JSON report

`parseValidation` SHALL never throw: non-JSON or non-object stdout yields
`{ items: [], failed: -1 }`; item entries lacking a string `id` or boolean
`valid` are skipped; issue fields default `level` to `"ERROR"`, `path` to
`"file"`, `message` to `""`, and a non-string item `type` becomes `"unknown"`;
`failed` is taken from `summary.totals.failed` when a number, otherwise
recomputed as the count of invalid items (core/openspec.ts:64-114).

#### Scenario: Garbage stdout marked unparseable

- **WHEN** the CLI prints non-JSON to stdout
- **THEN** parsing returns `failed: -1` and the report becomes `INVALID: could not parse openspec validate output` (core/openspec.ts:122-124)

### Requirement: Report format is a fixed one-look shape

`formatValidation` SHALL emit exactly one header line — `INVALID: could not
parse openspec validate output` when `failed === -1`; `VALID: nothing to
validate (no changes or specs found)` when there are no items; `VALID: N
item(s) passed` when all items are valid; `INVALID: N of M item(s) failed`
otherwise — followed by globally numbered issue lines of the form
`<n>. [<type> <id>] <level> <path>: <message>`, with invalid items that
report no issues rendered as `<n>. [<type> <id>] invalid without details`
(core/openspec.ts:118-148).

#### Scenario: Numbered issues across items

- **WHEN** two invalid items report 1 and 2 issues respectively and no other items exist
- **THEN** the header is `INVALID: 2 of 2 item(s) failed` (M is the total item count) and the three issue lines are numbered 1., 2., 3. in item order

### Requirement: Exit status is judged by the JSON report, not the code

`validateProject` SHALL run `["validate", <changeId>, "--json"]` when a
change id is given and `["validate", "--all", "--json"]` otherwise. A
non-zero exit whose stdout still parses to items is trusted and formatted
normally; only when nothing parses (`items.length === 0 && failed === -1`)
SHALL it return `ERROR: openspec <args> failed: <trimmed stderr-or-stdout,
or exit <code>>` (core/openspec.ts:152-171).

#### Scenario: Failed validation exits non-zero but is formatted

- **WHEN** `openspec validate --all --json` exits 1 with a valid JSON report of failing items
- **THEN** the tool returns the `INVALID: …` report, not an `ERROR:` line

### Requirement: Outcome is content, never a throw

The tool's execute SHALL return the validation string as `{ content: report }`
for every path — valid, invalid, unavailable, unparseable, or errored — so a
call can never fail the host through this tool (opencode/index.ts:221-227).

#### Scenario: Caller always receives a report

- **WHEN** any execution of `openspec_validate` completes
- **THEN** the result is a content string beginning `VALID`, `INVALID`, `UNAVAILABLE`, or `ERROR`, and no exception propagates
