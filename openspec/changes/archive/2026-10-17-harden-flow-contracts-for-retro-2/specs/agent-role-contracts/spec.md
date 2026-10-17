# agent-role-contracts — delta for harden-flow-contracts-for-retro

## MODIFIED Requirements

### Requirement: Research, validation, and review roles are read-only with evidence-bound claims

The researcher, critic, verifier, reviewer, and retrospector prompts SHALL
bind their roles to read-only work: the researcher never writes files and
never runs git write commands (agents/openspec-researcher.md:6-8); the critic
never writes files and never fixes artifacts itself (agents/openspec-critic.md:6-7,67);
the verifier never edits code or artifacts to make verification pass
(agents/openspec-verifier.md:6-8); the reviewer is read-only with `git diff`
and `git log` allowed but git write commands not (agents/openspec-reviewer.md:7-8);
the retrospector never applies or proposes applying its own findings
(agents/openspec-retrospector.md:44-46). Every researcher claim carries
`path:line` or command-output evidence (agents/openspec-researcher.md:30), and
the role never speculates about intent (agents/openspec-researcher.md:38).
Before listing an Unknown, the researcher SHALL attempt a read-only local
probe — `<binary> --help`, a no-arg subcommand that performs no action — and
report probe-answered questions as `PROBE: <question> → <output line>` lines;
probe-resolved items are excluded from the must-ask-user Unknowns set
(agents/openspec-researcher.md:21-24,33-34). When two sources disagree about an
interface (local `--help` versus docs or CHANGELOG), the researcher SHALL
quote both verbatim and name the conflict, never collapsing one source into
the definitive set (agents/openspec-researcher.md:24-26).

#### Scenario: Researcher fact carries evidence

- **WHEN** the researcher reports a fact
- **THEN** the report line has the form `<claim> — <path:line or command output>` (agents/openspec-researcher.md:30)

#### Scenario: Critic reports findings only

- **WHEN** the critic identifies a defect in drafted artifacts
- **THEN** it emits the finding for the planner to revise and performs no write itself (agents/openspec-critic.md:59-63,67)

#### Scenario: Probe answers a locally resolvable unknown

- **WHEN** a research question can be answered by a read-only local command
  (e.g. `<binary> --help` or a no-arg subcommand that performs no action)
- **THEN** the researcher runs it and returns a `PROBE:` answer line instead
  of an Unknown, and the question does not appear in the must-ask-user set
  (agents/openspec-researcher.md:21-24,33-34)

#### Scenario: Conflicting interface sources are both quoted

- **WHEN** local `--help` output disagrees with the project's docs or
  CHANGELOG about an interface
- **THEN** the researcher quotes both sources verbatim and names the conflict
  rather than presenting one source as definitive
  (agents/openspec-researcher.md:24-26)

### Requirement: The implementer is confined to one task group with conflict escalation

The `openspec-implementer` prompt SHALL execute exactly one numbered task
group from `tasks.md` (agents/openspec-implementer.md:6-8), tick `- [ ]`
→ `- [x]` only for tasks it actually completed inside its own group, and
never reorder, renumber, or edit other groups' lines
(agents/openspec-implementer.md:16-17). When completing the group requires
touching a file assigned to another implementer in the same wave, it
SHALL stop and report `BLOCKED: file conflict: <path>`
(agents/openspec-implementer.md:26-27). It never commits, pushes, or runs
any git write command (agents/openspec-implementer.md:53), and never
lowers the bar to reach green (agents/openspec-implementer.md:23-25). Its
checks rule SHALL require the project's full check suite when the
implementer is the sole implementer of its wave, and otherwise a suite
scoped to the group's files with the scope stated in Evidence and the full
run deferred to the apply flow's post-final-wave full check suite run
(agents/openspec-implementer.md:18-22). Its report format SHALL define
`DEFERRED: <task-id> — <reason> — <user action>` as the only legal way to
leave a spec-mapped task unticked, admissible only when completing that
task requires actions or authority outside the implementer's remit (a user
request, an external resource); a task in a manual/eyeball acceptance group
is never deferrable — the role prompt names the gate descriptively as "the
apply flow's manual/eyeball acceptance gate", with neither the flow's
section number nor a filesystem path, since role files ship from the plugin
package and target projects do not carry that path — so such tasks end
ticked or the run halts; in every other case an unfinished group reports
`BLOCKED`, never a deferral (agents/openspec-implementer.md:35-43).

#### Scenario: Group boundary on ticking

- **WHEN** the implementer finishes its assigned group
- **THEN** only that group's checkboxes change and other groups' lines
  are untouched (agents/openspec-implementer.md:16-17)

#### Scenario: File conflict stops the implementer

- **WHEN** group completion requires a file another same-wave implementer
  was assigned
- **THEN** the report says `BLOCKED: file conflict: <path>`
  (agents/openspec-implementer.md:26-27)

#### Scenario: Deferral is the only legal unticked task

- **WHEN** an implementer leaves a spec-mapped task unticked
- **THEN** the report carries `DEFERRED: <task-id> — <reason> — <user
action>` and the reason shows completion needs actions or authority
  outside its remit; any other unticked task makes the group `BLOCKED`
  (agents/openspec-implementer.md:35-43)

#### Scenario: Wave-sharing implementers scope their checks

- **WHEN** an implementer runs as one of several groups in a wave
- **THEN** its prompt's rule requires the check suite scoped to the group's
  files, the scope stated in the Evidence list, and the full run deferred
  to the apply flow's post-final-wave full check suite run; the sole
  implementer of a wave
  runs the full suite (agents/openspec-implementer.md:18-22)

### Requirement: The verifier executes scenarios instead of reading code

For every `#### Scenario:` in the assigned spec files, the verifier SHALL
actually trigger the **WHEN** — run the command, call the function,
execute the test — and check the observable outcome against the
scenario's **THEN** wording, recording `PASS` or `FAIL` with the decisive
command and its key output line from a fresh run; a single decisive run is
preferred, and composition of several runs is legal only when labeled —
the Scenarios line then reads `PASS (composited): <run A> + <run B>` —
with a `NO-REGRESSION-TEST:` bullet carrying one line per scenario proven
only by composition or manual check; the Status line counts composited
passes as passes (agents/openspec-verifier.md:10-18,36-39,43-44). Marking
`PASS` on "the code looks right" is forbidden, as is accepting a lowered
bar such as a skipped test or widened assertion
(agents/openspec-verifier.md:48-49). When cross-checking `tasks.md`, the
verifier SHALL treat an unticked task covered by a well-formed `DEFERRED:`
line — task id, reason, and user action all present — as legitimate rather
than a done-but-unticked mismatch, except for tasks in manual/eyeball
acceptance groups, which the role prompt names descriptively as "the apply
flow's manual/eyeball acceptance gate" rather than by the flow's section
number, where even a well-formed `DEFERRED:` line is itself a defect; and a
`DEFERRED:` line missing any part — task id, reason, or user action — SHALL
itself be reported as a defect (agents/openspec-verifier.md:24-31).

#### Scenario: Reading code is not verification

- **WHEN** the verifier has only inspected the implementation without
  executing the WHEN step
- **THEN** the scenario cannot be recorded as PASS
  (agents/openspec-verifier.md:12-13,48)

#### Scenario: Well-formed deferrals pass the tasks check

- **WHEN** `tasks.md` shows an unticked spec-mapped task that is not in a
  manual/eyeball acceptance group and the implementer reports carry a
  matching `DEFERRED:` line with reason and user action
- **THEN** the verifier does not report it as a done-but-unticked
  mismatch, and flags it as a defect only when the line lacks any part —
  task id, reason, or user action (agents/openspec-verifier.md:24-29)

#### Scenario: Manual-group deferral is flagged as a defect

- **WHEN** an unticked task inside a manual/eyeball acceptance group
  carries a `DEFERRED:` line, well-formed or not
- **THEN** the verifier reports it as a defect — such groups are run
  with the user by the apply flow's manual/eyeball acceptance gate and
  must end ticked — and the deferral does not excuse the mismatch
  (agents/openspec-verifier.md:29-31)

#### Scenario: Composited proof is labeled

- **WHEN** a scenario's decisive evidence comes from combining more than
  one run rather than a single fresh run
- **THEN** the Scenarios line uses the value `PASS (composited): <run A> +
<run B>` and the report adds a `NO-REGRESSION-TEST:` line for that
  scenario; unlabeled composited proof is not admissible
  (agents/openspec-verifier.md:15-18,36-39)

#### Scenario: Composited passes count toward the status

- **WHEN** every scenario line is `PASS` or `PASS (composited)` and the
  gate is VALID
- **THEN** the verifier's Status is PASS — the composited value counts as a
  pass, and the blocking-scenario id list stays reserved for FAIL
  (agents/openspec-verifier.md:43-44)
