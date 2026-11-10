# Agent role contracts

## Purpose

This capability covers the seven role definitions shipped as markdown assets
under `agents/`: planner, researcher, critic, implementer, verifier, reviewer,
and retrospector. Each role prompt is a behavioral contract that fixes what the
role may write, which roles are read-only, which mechanical gates are decisive,
how reports are formatted, and what the role never does. Scope enforcement is
deliberately not done through agent frontmatter: a role is bounded by its
prompt, the injected subagent contract, and the OpenSpec artifacts quoted into
its dispatch prompt (docs/agents.md:119-125,127-134).

## Requirements

### Requirement: The planner role operates in exactly three non-mixing modes with per-mode write bounds

The planner SHALL keep plan, baseline, and waves modes separate and enforce each mode's write scope. Plan drafts and waves SHALL follow the shared delta, task, grouping, and report contracts.

#### Scenario: Write bounds stated per mode

- **WHEN** the planner asset is read
- **THEN** `MODE: plan` bounds writes to `openspec/changes/<change-id>/`
  (agents/omos-planner.md:13), `MODE: baseline` bounds them to named
  files under `openspec/specs/` (agents/omos-planner.md:57-60), and
  `MODE: waves` declares the mode read-only (agents/omos-planner.md:82)

#### Scenario: Modes are never mixed

- **WHEN** the planner asset is read
- **THEN** it states the three modes are never mixed
  (agents/omos-planner.md:6-8) and project code is never touched in
  any mode (agents/omos-planner.md:106)

#### Scenario: MODIFIED header must match the baseline verbatim

- **WHEN** the planner drafts a `## MODIFIED` requirement whose header
  differs from the baseline spec's `### Requirement:` line
- **THEN** the header is corrected to the verbatim baseline text, or the
  rename moves to `## RENAMED Requirements` with `FROM:`/`TO:` pairs —
  never papered over with a conditional-fallback task
  (agents/omos-planner.md:23-25,34-36)

#### Scenario: Compile-coupled groups merge into one

- **WHEN** two candidate task groups cannot be split without leaving the
  tree uncompilable
- **THEN** the planner writes them as a single group, and a group that
  drops a lint suppression or renames a symbol carries the call/test-site
  grep and the expected post-group build result in that same task
  (agents/omos-planner.md:36-43)

#### Scenario: Pre-DONE self-check of tasks against deltas

- **WHEN** the planner finishes `tasks.md` in `MODE: plan`
- **THEN** it has re-read `tasks.md` against the delta specs — every
  cited scenario name matches a `#### Scenario:` heading verbatim and no
  two scenarios contradict each other — before reporting DONE
  (agents/omos-planner.md:31-34)

#### Scenario: Planner report disclaims archive-readiness

- **WHEN** the planner reports a passing `openspec validate` result for a
  drafted change
- **THEN** the report states the result certifies format only, not
  archive-ability, and claims nothing about CLI archive behavior beyond
  its stated semantics (agents/omos-planner.md:50-52)

In `MODE: plan` and `MODE: baseline`, the planner SHALL give each
`### Requirement:` heading a human-readable name and each capability
specification a human-readable top-level markdown title. These displayed
titles SHALL describe the requirement or capability rather than repeat its
machine identifier. The change's migration SHALL also replace
machine-identifier top-level titles in every existing main capability
specification under `openspec/specs/**/spec.md` with human-readable titles.
Technical change IDs, capability directory names, and paths SHALL remain
stable; content other than a migrated top-level title remains unchanged.
Archive change artifacts and historical archived specifications are outside
this migration. In `MODE: plan`, a `MODIFIED` requirement heading SHALL still
match the baseline header verbatim; when that header is not human-readable,
the planner SHALL use the existing `RENAMED Requirements` mechanism rather
than silently changing the merge key.

#### Scenario: Drafted requirement names are human-readable

- **WHEN** the planner writes an added requirement in plan mode or any requirement in baseline mode
- **THEN** its `### Requirement:` heading is a readable description rather than an identifier such as `archive-validation`

#### Scenario: Capability spec has a readable title

- **WHEN** the planner writes a capability spec file under its machine-named directory
- **THEN** the file's top-level heading is a human-readable capability name and the directory path remains unchanged

#### Scenario: Existing main specification titles are migrated

- **WHEN** an existing main specification under `openspec/specs/**/spec.md` has a machine-identifier top-level title, such as `# codex-host-integration Specification`
- **THEN** its top-level title is rewritten as a readable capability name, such as `# Codex host integration`, while its path and all other file content remain unchanged

#### Scenario: Modified merge key preserves a non-readable baseline name

- **WHEN** a baseline requirement heading is not human-readable and the planner changes its behavior
- **THEN** the planner preserves the exact baseline heading in a `MODIFIED` delta or expresses the heading change through `RENAMED Requirements`

### Requirement: Archive title review covers active artifacts without changing history

The archive role guidance SHALL review document-level title headings in every
artifact of the selected active change and affected main specifications, plus
`Requirement` headings in those specifications. It SHALL leave historical
archived changes and their specifications outside this review. A `MODIFIED`
requirement heading SHALL remain the baseline merge key verbatim; a heading
rename SHALL use `RENAMED Requirements` with exact `FROM:` and `TO:` values.

#### Scenario: Active archive artifacts are in scope

- **WHEN** the archive flow processes a selected active change
- **THEN** it reviews the document titles in that change and in affected main
  specifications, and the requirement headings in those specification files

#### Scenario: Historical archive is out of scope

- **WHEN** the archive flow reviews titles for a selected active change
- **THEN** it does not inspect or modify historical archived change artifacts
  or archived specifications

#### Scenario: Merge key is not silently rewritten

- **WHEN** a technical or placeholder baseline heading belongs to a
  `MODIFIED` requirement
- **THEN** the merge key remains verbatim or the change uses
  `RENAMED Requirements` with exact source and target headings

### Requirement: Research, validation, and review roles are read-only with evidence-bound claims

Researcher, critic, verifier, reviewer, and retrospector roles SHALL remain read-only. Research claims SHALL cite evidence, probe-resolvable Unknowns SHALL be probed, and conflicting sources SHALL be reported.

#### Scenario: Researcher fact carries evidence

- **WHEN** the researcher reports a fact
- **THEN** the report line has the form `<claim> — <path:line or command output>` (agents/omos-researcher.md:30)

#### Scenario: Critic reports findings only

- **WHEN** the critic identifies a defect in drafted artifacts
- **THEN** it emits the finding for the planner to revise and performs no write itself (agents/omos-critic.md:59-63,67)

#### Scenario: Probe answers a locally resolvable unknown

- **WHEN** a research question can be answered by a read-only local command
  (e.g. `<binary> --help` or a no-arg subcommand that performs no action)
- **THEN** the researcher runs it and returns a `PROBE:` answer line instead
  of an Unknown, and the question does not appear in the must-ask-user set
  (agents/omos-researcher.md:21-24,33-34)

#### Scenario: Conflicting interface sources are both quoted

- **WHEN** local `--help` output disagrees with the project's docs or
  CHANGELOG about an interface
- **THEN** the researcher quotes both sources verbatim and names the conflict
  rather than presenting one source as definitive
  (agents/omos-researcher.md:24-26)

### Requirement: Mechanical validation gates are decisive for critic and verifier

The critic SHALL treat every mechanical INVALID as BLOCKING and never return CLEAN for a failing target. The verifier SHALL fail the run when change validation is not VALID.

#### Scenario: INVALID verdict cannot be CLEAN

- **WHEN** `openspec_validate` returns INVALID for the reviewed target
- **THEN** the critic quotes the violations verbatim as BLOCKING findings and withholds `CLEAN` (agents/omos-critic.md:15,64)

#### Scenario: Gate failure fails the verification

- **WHEN** the verifier's `openspec validate` run returns a non-VALID result
- **THEN** the overall verification status is `FAIL` regardless of individual scenario outcomes (agents/omos-verifier.md:20-21)

### Requirement: The implementer is confined to one task group with conflict escalation

An implementer SHALL work on one task group, tick only its completed tasks, and stop on file conflicts. It SHALL run the required checks and use DEFERRED only for work outside its authority; manual acceptance tasks cannot be deferred.

#### Scenario: Group boundary on ticking

- **WHEN** the implementer finishes its assigned group
- **THEN** only that group's checkboxes change and other groups' lines
  are untouched (agents/omos-implementer.md:16-17)

#### Scenario: File conflict stops the implementer

- **WHEN** group completion requires a file another same-wave implementer
  was assigned
- **THEN** the report says `BLOCKED: file conflict: <path>`
  (agents/omos-implementer.md:26-27)

#### Scenario: Deferral is the only legal unticked task

- **WHEN** an implementer leaves a spec-mapped task unticked
- **THEN** the report carries `DEFERRED: <task-id> — <reason> — <user
action>` and the reason shows completion needs actions or authority
  outside its remit; any other unticked task makes the group `BLOCKED`
  (agents/omos-implementer.md:35-43)

#### Scenario: Wave-sharing implementers scope their checks

- **WHEN** an implementer runs as one of several groups in a wave
- **THEN** its prompt's rule requires the check suite scoped to the group's
  files, the scope stated in the Evidence list, and the full run deferred
  to the apply flow's post-final-wave full check suite run; the sole
  implementer of a wave
  runs the full suite (agents/omos-implementer.md:18-22)

### Requirement: The verifier executes scenarios instead of reading code

The verifier SHALL execute every assigned scenario and report PASS or FAIL with fresh command evidence. It SHALL reject weakened checks and audit task completion and DEFERRED lines against the manual-acceptance gate.

#### Scenario: Reading code is not verification

- **WHEN** the verifier has only inspected the implementation without
  executing the WHEN step
- **THEN** the scenario cannot be recorded as PASS
  (agents/omos-verifier.md:12-13,48)

#### Scenario: Well-formed deferrals pass the tasks check

- **WHEN** `tasks.md` shows an unticked spec-mapped task that is not in a
  manual/eyeball acceptance group and the implementer reports carry a
  matching `DEFERRED:` line with reason and user action
- **THEN** the verifier does not report it as a done-but-unticked
  mismatch, and flags it as a defect only when the line lacks any part —
  task id, reason, or user action (agents/omos-verifier.md:24-29)

#### Scenario: Manual-group deferral is flagged as a defect

- **WHEN** an unticked task inside a manual/eyeball acceptance group
  carries a `DEFERRED:` line, well-formed or not
- **THEN** the verifier reports it as a defect — such groups are run
  with the user by the apply flow's manual/eyeball acceptance gate and
  must end ticked — and the deferral does not excuse the mismatch
  (agents/omos-verifier.md:29-31)

#### Scenario: Composited proof is labeled

- **WHEN** a scenario's decisive evidence comes from combining more than
  one run rather than a single fresh run
- **THEN** the Scenarios line uses the value `PASS (composited): <run A> +
<run B>` and the report adds a `NO-REGRESSION-TEST:` line for that
  scenario; unlabeled composited proof is not admissible
  (agents/omos-verifier.md:15-18,36-39)

#### Scenario: Composited passes count toward the status

- **WHEN** every scenario line is `PASS` or `PASS (composited)` and the
  gate is VALID
- **THEN** the verifier's Status is PASS — the composited value counts as a
  pass, and the blocking-scenario id list stays reserved for FAIL
  (agents/omos-verifier.md:43-44)

### Requirement: Reviewer and retrospector deliver bounded, cited findings

The reviewer SHALL assess the cumulative diff against the change artifacts and block approval on unresolved blocking findings. The retrospector SHALL report at most eight evidence-backed findings about plugin prompts, with concrete costs and fixes.

#### Scenario: Reviewer withholds approval on blocking findings

- **WHEN** the reviewer's report contains any BLOCKING line
- **THEN** the verdict cannot be `APPROVE` (agents/omos-reviewer.md:34-37)

#### Scenario: Unquoted retrospector observation is dropped

- **WHEN** an observation about the finished run has no verbatim quote from the evidence bundle
- **THEN** it is not reported as a finding (agents/omos-retrospector.md:18-21)

#### Scenario: A quote that needs interpretation drops its finding

- **WHEN** a quoted bundle line shows a defect only once the retrospector's interpretation is added
- **THEN** the finding is dropped (agents/omos-retrospector.md:22-23)

#### Scenario: A hypothetical cost disqualifies a finding

- **WHEN** the only cost a finding can name is of the form "might cause" or "in principle"
- **THEN** the finding is not reported (agents/omos-retrospector.md:24-26)

#### Scenario: The tally line opens a non-empty report

- **WHEN** the retrospector reports one or more findings
- **THEN** the report's first line is the mechanical count `N findings: X HIGH · Y MED · Z LOW` and no preamble precedes it (agents/omos-retrospector.md:37-40,44)

#### Scenario: Clean run prints only the clean token

- **WHEN** the run exposed nothing actionable
- **THEN** the report is only `No findings — run clean.` — no tally line and no other text (agents/omos-retrospector.md:55-56)

### Requirement: The critic enforces proposal-to-delta count consistency

The critic's editorial rules SHALL include a BLOCKING consistency check:
every count or list in `proposal.md` — requirements ADDED or MODIFIED,
capability names — must match the actual block count in
`specs/**/spec.md`, and a mismatch is reported as a numbered BLOCKING
finding (agents/omos-critic.md:27-30).

#### Scenario: Stale proposal count blocks the change

- **WHEN** `proposal.md` claims a number of requirements or a capability
  list that the delta files do not hold
- **THEN** the critic returns the mismatch as a BLOCKING finding quoting
  both sides, and withholds `CLEAN`
