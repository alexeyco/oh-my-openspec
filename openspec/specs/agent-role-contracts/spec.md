# agent-role-contracts

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

The `openspec-planner` prompt SHALL name three modes — `MODE: plan`,
`MODE: baseline`, `MODE: waves` — declared at the top of the task prompt
and never mixed (agents/openspec-planner.md:6-8). Each mode carries its
own write bounds: `plan` writes files only inside
`openspec/changes/<change-id>/` (agents/openspec-planner.md:12-13);
`baseline` writes only `openspec/specs/<capability>/spec.md` for
capabilities in the confirmed map — no `changes/`, no project code, and
never an existing spec file unless the prompt names it explicitly
(agents/openspec-planner.md:57-60); `waves` is read-only and never
changes artifact content (agents/openspec-planner.md:82,106). No mode
touches project code (agents/openspec-planner.md:106).

In `MODE: plan` the drafting steps SHALL additionally enforce: a
`### Requirement:` under `## MODIFIED` matches the baseline header
verbatim, since the delta merges by header name, and a rename goes to
`## RENAMED Requirements` with `FROM:`/`TO:` pairs
(agents/openspec-planner.md:23-25); no conditional-fallback task is ever
carried in place of fixing such a header (agents/openspec-planner.md:34-36);
before DONE and before finishing a revise round, `tasks.md` is re-read
against the delta specs so every cited scenario name appears verbatim as
a `#### Scenario:` heading and no two scenarios assert contradictory
output (agents/openspec-planner.md:31-34); a group that removes a lint
suppression or renames a symbol greps its call and test sites in the same
task and states the build result expected after that group alone, and
groups inseparable without leaving the tree uncompilable merge into one
group — merge addresses compile coupling, while the `MODE: waves` rule to
serialize overlapping-file groups addresses parallel-dispatch conflicts,
and the prompt keeps them distinct (agents/openspec-planner.md:36-43,90-92);
the report states that a passing `openspec validate` certifies format,
not archive-ability (agents/openspec-planner.md:50-52).

Planner and critic accept the same delta headers: the planner's header
list is `## ADDED|MODIFIED|REMOVED|RENAMED Requirements` with RENAMED
holding `FROM:`/`TO:` pairs (agents/openspec-planner.md:19-20), matching
the critic's editorial rule (agents/openspec-critic.md:19-21).

#### Scenario: Write bounds stated per mode

- **WHEN** the planner asset is read
- **THEN** `MODE: plan` bounds writes to `openspec/changes/<change-id>/`
  (agents/openspec-planner.md:13), `MODE: baseline` bounds them to named
  files under `openspec/specs/` (agents/openspec-planner.md:57-60), and
  `MODE: waves` declares the mode read-only (agents/openspec-planner.md:82)

#### Scenario: Modes are never mixed

- **WHEN** the planner asset is read
- **THEN** it states the three modes are never mixed
  (agents/openspec-planner.md:6-8) and project code is never touched in
  any mode (agents/openspec-planner.md:106)

#### Scenario: MODIFIED header must match the baseline verbatim

- **WHEN** the planner drafts a `## MODIFIED` requirement whose header
  differs from the baseline spec's `### Requirement:` line
- **THEN** the header is corrected to the verbatim baseline text, or the
  rename moves to `## RENAMED Requirements` with `FROM:`/`TO:` pairs —
  never papered over with a conditional-fallback task
  (agents/openspec-planner.md:23-25,34-36)

#### Scenario: Compile-coupled groups merge into one

- **WHEN** two candidate task groups cannot be split without leaving the
  tree uncompilable
- **THEN** the planner writes them as a single group, and a group that
  drops a lint suppression or renames a symbol carries the call/test-site
  grep and the expected post-group build result in that same task
  (agents/openspec-planner.md:36-43)

#### Scenario: Pre-DONE self-check of tasks against deltas

- **WHEN** the planner finishes `tasks.md` in `MODE: plan`
- **THEN** it has re-read `tasks.md` against the delta specs — every
  cited scenario name matches a `#### Scenario:` heading verbatim and no
  two scenarios contradict each other — before reporting DONE
  (agents/openspec-planner.md:31-34)

#### Scenario: Planner report disclaims archive-readiness

- **WHEN** the planner reports a passing `openspec validate` result for a
  drafted change
- **THEN** the report states the result certifies format only, not
  archive-ability, and claims nothing about CLI archive behavior beyond
  its stated semantics (agents/openspec-planner.md:50-52)

### Requirement: Research, validation, and review roles are read-only with evidence-bound claims

The researcher, critic, verifier, reviewer, and retrospector prompts SHALL
bind their roles to read-only work: the researcher never writes files and
never runs git write commands (agents/openspec-researcher.md:6-8); the critic
never writes files and never fixes artifacts itself (agents/openspec-critic.md:6-7,61-63);
the verifier never edits code or artifacts to make verification pass
(agents/openspec-verifier.md:6-8); the reviewer is read-only with `git diff`
and `git log` allowed but git write commands not (agents/openspec-reviewer.md:7-8);
the retrospector never applies or proposes applying its own findings
(agents/openspec-retrospector.md:44-46). Every researcher claim carries
`path:line` or command-output evidence (agents/openspec-researcher.md:25), and
the role never speculates about intent (agents/openspec-researcher.md:30-33).

#### Scenario: Researcher fact carries evidence

- **WHEN** the researcher reports a fact
- **THEN** the report line has the form `<claim> — <path:line or command output>` (agents/openspec-researcher.md:25)

#### Scenario: Critic reports findings only

- **WHEN** the critic identifies a defect in drafted artifacts
- **THEN** it emits the finding for the planner to revise and performs no write itself (agents/openspec-critic.md:61-63)

### Requirement: Mechanical validation gates are decisive for critic and verifier

The critic SHALL run the `openspec_validate` tool before any editorial review —
with the change id for change review, with no id for baseline-specs review —
and treat any INVALID violation as automatically BLOCKING, quoted verbatim
(agents/openspec-critic.md:10-15). The critic must never pass a target with a
failing mechanical validation as `CLEAN` (agents/openspec-critic.md:64). The
verifier SHALL run `openspec validate <change-id>` as its gate and let a
non-VALID result force the whole verification to `FAIL`
(agents/openspec-verifier.md:18-21).

#### Scenario: INVALID verdict cannot be CLEAN

- **WHEN** `openspec_validate` returns INVALID for the reviewed target
- **THEN** the critic quotes the violations verbatim as BLOCKING findings and withholds `CLEAN` (agents/openspec-critic.md:15,64)

#### Scenario: Gate failure fails the verification

- **WHEN** the verifier's `openspec validate` run returns a non-VALID result
- **THEN** the overall verification status is `FAIL` regardless of individual scenario outcomes (agents/openspec-verifier.md:20-21)

### Requirement: The implementer is confined to one task group with conflict escalation

The `openspec-implementer` prompt SHALL execute exactly one numbered task
group from `tasks.md` (agents/openspec-implementer.md:6-8), tick `- [ ]`
→ `- [x]` only for tasks it actually completed inside its own group, and
never reorder, renumber, or edit other groups' lines
(agents/openspec-implementer.md:16-17). When completing the group requires
touching a file assigned to another implementer in the same wave, it
SHALL stop and report `BLOCKED: file conflict: <path>`
(agents/openspec-implementer.md:23-24). It never commits, pushes, or runs
any git write command (agents/openspec-implementer.md:46-49), and never
lowers the bar to reach green (agents/openspec-implementer.md:20-22). Its
report format SHALL define `DEFERRED: <task-id> — <reason> — <user
action>` as the only legal way to leave a spec-mapped task unticked,
admissible only when completing that task requires actions or authority
outside the implementer's remit (a user request, an external resource);
a task in a manual/eyeball acceptance group is never deferrable — the
orchestrator's §6 gate runs those groups with the user, so they end
ticked or the run halts; in every other case an unfinished group
reports `BLOCKED`, never a deferral (agents/openspec-implementer.md:32-39).

#### Scenario: Group boundary on ticking

- **WHEN** the implementer finishes its assigned group
- **THEN** only that group's checkboxes change and other groups' lines
  are untouched (agents/openspec-implementer.md:16-17)

#### Scenario: File conflict stops the implementer

- **WHEN** group completion requires a file another same-wave implementer
  was assigned
- **THEN** the report says `BLOCKED: file conflict: <path>`
  (agents/openspec-implementer.md:23-24)

#### Scenario: Deferral is the only legal unticked task

- **WHEN** an implementer leaves a spec-mapped task unticked
- **THEN** the report carries `DEFERRED: <task-id> — <reason> — <user
action>` and the reason shows completion needs actions or authority
  outside its remit; any other unticked task makes the group `BLOCKED`
  (agents/openspec-implementer.md:32-39)

### Requirement: The verifier executes scenarios instead of reading code

For every `#### Scenario:` in the assigned spec files, the verifier SHALL
actually trigger the **WHEN** — run the command, call the function,
execute the test — and check the observable outcome against the
scenario's **THEN** wording, recording `PASS` or `FAIL` with the decisive
command and its key output line from a fresh run
(agents/openspec-verifier.md:10-16). Marking `PASS` on "the code looks
right" is forbidden, as is accepting a lowered bar such as a skipped test
or widened assertion (agents/openspec-verifier.md:42-43). When
cross-checking `tasks.md`, the verifier SHALL treat an unticked task
covered by a well-formed `DEFERRED:` line — task id, reason, and user
action all present — as legitimate rather than a done-but-unticked
mismatch, except for tasks in manual/eyeball acceptance groups, where
even a well-formed `DEFERRED:` line is itself a defect; and a
`DEFERRED:` line missing any part SHALL itself be reported as a defect
(agents/openspec-verifier.md:22-28).

#### Scenario: Reading code is not verification

- **WHEN** the verifier has only inspected the implementation without
  executing the WHEN step
- **THEN** the scenario cannot be recorded as PASS
  (agents/openspec-verifier.md:12-13,42)

#### Scenario: Well-formed deferrals pass the tasks check

- **WHEN** `tasks.md` shows an unticked spec-mapped task that is not in a
  manual/eyeball acceptance group and the implementer reports carry a
  matching `DEFERRED:` line with reason and user action
- **THEN** the verifier does not report it as a done-but-unticked
  mismatch, and flags it as a defect only when the line lacks its reason
  or user action (agents/openspec-verifier.md:22-28)

#### Scenario: Manual-group deferral is flagged as a defect

- **WHEN** an unticked task inside a manual/eyeball acceptance group
  carries a `DEFERRED:` line, well-formed or not
- **THEN** the verifier reports it as a defect — such groups are run
  with the user by the §6 gate and must end ticked — and the deferral
  does not excuse the mismatch (agents/openspec-verifier.md:22-28)

### Requirement: Reviewer and retrospector deliver bounded, cited findings

The reviewer SHALL critique the cumulative diff of one completed change against
its OpenSpec artifacts and report `APPROVE` or `CHANGES-REQUESTED`, never
approving while a BLOCKING line stands (agents/openspec-reviewer.md:6-8,25,34-37);
a choice that contradicts a spec scenario escalates to BLOCKING in its Choices
audit (agents/openspec-reviewer.md:28-29). The retrospector SHALL limit itself
to the plugin's own prompt entities — `agents/*.md`,
`skills/openspec-*/SKILL.md`, `core/prompts.ts` — dropping findings about
vendored skills, user project code, or the CLI silently
(agents/openspec-retrospector.md:6-14); every finding must quote one decisive
bundle line verbatim (agents/openspec-retrospector.md:17-20), is capped at 8
ranked HIGH to LOW with no padding (agents/openspec-retrospector.md:21-24), and
each `Fix:` line names the file and section with an executable edit
(agents/openspec-retrospector.md:27-28).

#### Scenario: Reviewer withholds approval on blocking findings

- **WHEN** the reviewer's report contains any BLOCKING line
- **THEN** the verdict cannot be `APPROVE` (agents/openspec-reviewer.md:34-37)

#### Scenario: Unquoted retrospector observation is dropped

- **WHEN** an observation about the finished run has no verbatim quote from the evidence bundle
- **THEN** it is not reported as a finding (agents/openspec-retrospector.md:17-20)

### Requirement: The critic enforces proposal-to-delta count consistency

The critic's editorial rules SHALL include a BLOCKING consistency check:
every count or list in `proposal.md` — requirements ADDED or MODIFIED,
capability names — must match the actual block count in
`specs/**/spec.md`, and a mismatch is reported as a numbered BLOCKING
finding (agents/openspec-critic.md:27-30).

#### Scenario: Stale proposal count blocks the change

- **WHEN** `proposal.md` claims a number of requirements or a capability
  list that the delta files do not hold
- **THEN** the critic returns the mismatch as a BLOCKING finding quoting
  both sides, and withholds `CLEAN`
