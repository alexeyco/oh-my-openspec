# orchestration-flows

## Purpose

This capability covers the four flow skills shipped under `skills/`:
openspec-plan, openspec-init, openspec-apply, and openspec-retro. Each flow is
the orchestrator's script for one command — plan a change, bootstrap baseline
specs, implement a change, retrospect a finished run. The shipped instructions
guarantee a shared discipline: the orchestrator dispatches role subagents and
never drafts or writes artifacts itself, never runs git write commands, gates
on the `openspec_validate` CLI with per-flow degradation rules, bounds its
critique loops, and confines every write to the `openspec/` tree.

## Requirements

### Requirement: The orchestrator dispatches, never drafts, and never writes outside the flow

Every flow skill SHALL state that the orchestrator dispatches role subagents
and never drafts artifacts itself, and SHALL forbid writes beyond the flow's
ownership. plan, init, and apply state "You never run git write commands" —
plan adds "the user reviews files and decides what happens to them"
(skills/openspec-plan/SKILL.md:9-11; skills/openspec-init/SKILL.md:9-10;
skills/openspec-apply/SKILL.md:8-10). retro instead states the stronger
"Read-only: this command never edits anything — findings are for a future PR"
and names its single dispatch target `openspec-retrospector`
(skills/openspec-retro/SKILL.md:8-9,29).
This wiring is machine-checked: each flow skill's body must reference the role
agents and, where it dispatches it, the `openspec_validate` tool — the test
asserts `openspec_validate` for init, plan, and apply
(tests/assets.test.ts:67-72,79-84,91-97) and only `openspec-retrospector` for
retro (tests/assets.test.ts:100-107).

#### Scenario: All artifact writing goes to subagents

- **WHEN** a flow needs proposal, spec, task, or baseline-spec content written
- **THEN** the flow dispatches `openspec-planner` (or another role) rather than the orchestrator writing the file (skills/openspec-plan/SKILL.md:9-10,92-95; skills/openspec-init/SKILL.md:55-56)

#### Scenario: Flow bodies stay wired to the roles they dispatch

- **WHEN** a flow skill stops naming a role agent or tool it dispatches
- **THEN** the assets test fails for that skill (tests/assets.test.ts:62-107)

### Requirement: The CLI precondition gates each flow with per-flow degradation

Each drafting/implementing flow SHALL call `openspec_validate` up front and act
on the result: on `UNAVAILABLE` it may offer a global install, performed only
on an explicit yes (skills/openspec-plan/SKILL.md:17-20;
skills/openspec-init/SKILL.md:16-19; skills/openspec-apply/SKILL.md:25-27).
When the user declines the install, behaviors differ by flow — plan may
continue critic-only on an explicit yes (skills/openspec-plan/SKILL.md:21-22),
while init (skills/openspec-init/SKILL.md:20-22) and apply
(skills/openspec-apply/SKILL.md:27-28) stop. When `openspec/` is missing, plan
and init ask for consent and then run `openspec init --tools none`, never
re-initializing tool files; a declined consent stops the flow
(skills/openspec-plan/SKILL.md:23-26; skills/openspec-init/SKILL.md:23-25).

#### Scenario: Plan degrades to critic-only on declined install

- **WHEN** the CLI is unavailable and the user declines installing it during `/openspec.plan`, then accepts non-mechanical validation
- **THEN** the flow continues with critic-only validation (skills/openspec-plan/SKILL.md:21-22)

#### Scenario: Init and apply refuse to degrade

- **WHEN** the CLI is unavailable and the user declines installing it during `/openspec.init` or `/openspec.apply`
- **THEN** the flow stops (skills/openspec-init/SKILL.md:20-22; skills/openspec-apply/SKILL.md:27-28)

### Requirement: The plan flow interviews, grills, and confirms a playback before any file write

The plan flow SHALL keep the coverage interview to at most 5 questions per
round, ordered by impact × uncertainty (skills/openspec-plan/SKILL.md:36-40),
and every question SHALL define its terms with a concrete example or an
either/or gloss; when the user signals they did not understand a question,
in any language, the flow SHALL restate it with the gloss before recording
anything from it as `ASSUMPTION:` (skills/openspec-plan/SKILL.md:48-51).
It dispatches researchers in parallel one per unknown area
(skills/openspec-plan/SKILL.md:56-57), and runs the adversarial grill
normally 1–3 rounds, up to 5 only for large-scale changes, with every
attack citing a research fact or the user's own words
(skills/openspec-plan/SKILL.md:66-75). Each risk the user dismisses is
recorded as a `REJECTED-RISK:` line (skills/openspec-plan/SKILL.md:83-84).
A seven-line playback — `Outcome / Why now / Success / Constraints /
Out of scope / Rejected risks / Established`, where `Established:` recites
up to five decision-relevant research findings, one per line, absences
included — must be explicitly confirmed before any file is written
(skills/openspec-plan/SKILL.md:89-93). The critique loop runs at most 3
rounds — with mechanical INVALID lines always fixed first — and after 3
unresolved rounds the open findings go to the user as accept-or-stop
(skills/openspec-plan/SKILL.md:102-111).

#### Scenario: No writing before playback confirmation

- **WHEN** the plan flow reaches drafting
- **THEN** the seven-line playback has been restated and explicitly
  confirmed by the user (skills/openspec-plan/SKILL.md:89-91)

#### Scenario: Playback recites established findings

- **WHEN** the playback is restated for confirmation
- **THEN** the `Established:` entry names up to five decision-relevant
  research findings the user might re-ask, one per line, absences
  included (skills/openspec-plan/SKILL.md:91-93)

#### Scenario: Ununderstood question is restated, not assumed

- **WHEN** the user indicates they did not understand an interview
  question, in any language
- **THEN** the flow re-asks it with the concrete gloss before recording
  any answer from it as `ASSUMPTION:` (skills/openspec-plan/SKILL.md:48-51)

#### Scenario: Critique loop is bounded at three rounds

- **WHEN** the critic still returns NEEDS-FIX after 3 rounds
- **THEN** the flow presents the open findings and asks the user whether
  to accept or stop (skills/openspec-plan/SKILL.md:108-109)

### Requirement: The init flow writes baseline specs describing observed behavior only

The init flow SHALL read `openspec/specs/` and branch on its state — empty
proceeds to discovery; non-empty reports existing capabilities and offers
extend-only mode that never touches existing spec files
(skills/openspec-init/SKILL.md:27-34). It merges parallel researcher findings
into a capability map and interviews until the user confirms add/remove/rename,
dropping any capability no researcher evidenced
(skills/openspec-init/SKILL.md:36-51). Drafting goes to `openspec-planner` with
`MODE: baseline`, writing `## Purpose` and SHALL requirements with WHEN/THEN
scenarios that describe current, observed behavior only — aspirations belong
to `/openspec.plan` (skills/openspec-init/SKILL.md:53-60). Writes land only in
`openspec/specs/`, existing files are never overwritten without per-file
consent, and `UNVERIFIED` beats an invented SHALL
(skills/openspec-init/SKILL.md:81-86).

#### Scenario: Un-evidenced capability is dropped

- **WHEN** a proposed capability in the map has no researcher evidence
- **THEN** the flow drops it rather than guessing (skills/openspec-init/SKILL.md:50-51)

#### Scenario: Extend mode protects existing baselines

- **WHEN** `openspec/specs/` is non-empty and the user chooses extend
- **THEN** discovery skips covered capabilities and existing spec files are not touched (skills/openspec-init/SKILL.md:32-34)

### Requirement: The apply flow gates on VALID, executes one implementer per task group, and handles blockage without lowering the bar

The apply flow SHALL refuse implementation unless `openspec_validate`
reports the change VALID — otherwise it stops, reports the numbered
violations, and suggests a `/openspec.plan` fix round
(skills/openspec-apply/SKILL.md:21-30). Execution order comes from
`openspec-planner` with `MODE: waves`, recorded as a wave table that is
the single source of execution order
(skills/openspec-apply/SKILL.md:32-38,134). Each wave dispatches one
`openspec-implementer` per group in a single parallel background batch,
with results collected from completion notifications, never by polling
(skills/openspec-apply/SKILL.md:40-47). A user request arriving mid-wave
SHALL first be checked against the wave table and the remaining `tasks.md`
items — a task that already covers it is cited, never re-implemented by a
duplicate group dispatch (skills/openspec-apply/SKILL.md:52-55). A
`BLOCKED:` answer triggers the protocol: a file conflict re-dispatches the
blocked group alone in a follow-up mini-wave; a guardrail or plan defect
halts and asks the user — the bar is never lowered to get green
(skills/openspec-apply/SKILL.md:59-66). A `BLOCKED:` reporting prompt
truncation is the exception and the orchestrator's own defect, not the
plan's: the group is re-dispatched with a numbered edit list of at most
150 lines referencing `file:line` locations instead of inlined spec or
transcript text (skills/openspec-apply/SKILL.md:66-69). Before §7 Review,
the flow SHALL execute every manual/eyeball acceptance group in `tasks.md`
with the user and record their confirmation — no change enters Review
while any manual/eyeball group is unticked — and relay every implementer
`DEFERRED:` line to the user verbatim; the verifier's `tasks.md`
consistency check remains a separate mechanical audit
(skills/openspec-apply/SKILL.md:73-78,90-93). `DEFERRED:` is inadmissible for
tasks in manual/eyeball acceptance groups — the §6 gate runs those groups
with the user, so they must end ticked, and a run halts rather than
carrying such a task into Review or the §8 Done report
(skills/openspec-apply/SKILL.md:76-77,92-93). After the final wave, verifiers
run in parallel per capability spec file; any FAIL yields one fix round,
and a re-verification that repeats the claim with a weakened bar is
treated as FAIL (skills/openspec-apply/SKILL.md:80-89). The run ends with
`openspec-reviewer` over the cumulative diff carrying a `REVIEW FOCUS:`
block; on `CHANGES-REQUESTED` the flow SHALL, before dispatching the
re-review, run the repo's own markdown/lint check over every `openspec/`
artifact the fix round touched, when the repo has one, and paste its
output into the re-review dispatch; scoped re-review answers open findings
as ADDRESSED / NOT-ADDRESSED, and user-approved BLOCKING leftovers are
recorded as `ruling:` lines (skills/openspec-apply/SKILL.md:97-108). The
Done report lists `DEFERRED:` entries verbatim, one line each, alongside
`choice:` and `ruling:` entries (skills/openspec-apply/SKILL.md:118-119),
and when the user asks about branching the flow cites the repo's
branch-naming convention from `CONTRIBUTING.md` or its equivalent, e.g.
`feat/<topic>` — creating and renaming branches stays the user's job, as
do commits, and this flow performs no git writes
(skills/openspec-apply/SKILL.md:124-126). The flow never commits and
never runs `openspec archive` (skills/openspec-apply/SKILL.md:128-133).

#### Scenario: Invalid change blocks implementation

- **WHEN** `openspec_validate` does not return VALID for the selected
  change
- **THEN** the flow stops and reports the violations instead of
  dispatching implementers (skills/openspec-apply/SKILL.md:29-30)

#### Scenario: File conflict becomes a mini-wave

- **WHEN** an implementer reports `BLOCKED: file conflict`
- **THEN** the blocked group is re-dispatched alone in a follow-up
  mini-wave after its conflicting sibling completes
  (skills/openspec-apply/SKILL.md:62-63)

#### Scenario: Truncation is re-dispatched, not halted on

- **WHEN** an implementer reports `BLOCKED:` caused by prompt truncation
- **THEN** the orchestrator re-dispatches that group with a numbered edit
  list of at most 150 lines referencing `file:line` locations, without
  treating it as a guardrail or plan defect
  (skills/openspec-apply/SKILL.md:66-69)

#### Scenario: Manual acceptance groups gate Review

- **WHEN** a manual or eyeball acceptance group in `tasks.md` is unticked
- **THEN** the flow runs it with the user and records the confirmation
  before §7 Review; no change enters Review with such a group unticked
  (skills/openspec-apply/SKILL.md:73-76)

#### Scenario: Deferrals reach the user before Review

- **WHEN** one or more implementers report `DEFERRED:` lines
- **THEN** the orchestrator relays every such line verbatim to the user
  before dispatching §7 Review — except a deferral naming a task in a
  manual/eyeball acceptance group, which halts the run at the §6 gate
  instead (skills/openspec-apply/SKILL.md:90-93)

#### Scenario: Mid-wave request cites an existing task

- **WHEN** the user adds a request mid-wave that a remaining `tasks.md`
  item already covers
- **THEN** the flow cites that item and dispatches no duplicate group
  (skills/openspec-apply/SKILL.md:52-55)

#### Scenario: Fix round runs the repo's markdown check before re-review

- **WHEN** Review returns `CHANGES-REQUESTED`, the fix round touches
  `openspec/` artifacts, and the repo has a markdown/lint check
- **THEN** the flow runs that check over the touched artifacts and pastes
  its output into the scoped re-review dispatch
  (skills/openspec-apply/SKILL.md:103-106)

#### Scenario: Branching question is answered with the convention

- **WHEN** the user asks about branching in the Done step
- **THEN** the flow cites the repo's branch-naming convention and
  performs no git write itself — branch creation and renaming stay with
  the user (skills/openspec-apply/SKILL.md:124-126)

#### Scenario: Archiving stays with the user

- **WHEN** the apply flow finishes and reports next steps
- **THEN** archiving is presented as a deliberate user act and the flow
  has not run `openspec archive`
  (skills/openspec-apply/SKILL.md:122-123,132-133)

### Requirement: The retro flow is read-only, single-dispatch, and relays the report verbatim

The retro flow SHALL compile an evidence bundle from the current session —
commands, role dispatches with verbatim final reports, friction lines, and the
end-of-run `git diff --stat` — keeping the bundle raw quoted lines rather than
paraphrase (skills/openspec-retro/SKILL.md:13-25). It dispatches the bundle to
`openspec-retrospector` exactly once, with no rounds
(skills/openspec-retro/SKILL.md:27-30), and presents the report as-is — no
commentary, no severity re-shuffling (skills/openspec-retro/SKILL.md:32-37).
The command never edits `agents/`, `skills/`, `core/`, or any project file, and
does not feed interpretations or fill gaps from memory
(skills/openspec-retro/SKILL.md:39-44). An empty run with no role dispatches
causes the flow to say so and stop (skills/openspec-retro/SKILL.md:45-46).

#### Scenario: Single dispatch with verbatim relay

- **WHEN** the evidence bundle is compiled
- **THEN** exactly one retrospector dispatch runs and its report is presented without additions (skills/openspec-retro/SKILL.md:27-37)

#### Scenario: Empty run stops the flow

- **WHEN** the session contains no role dispatches
- **THEN** the flow reports the empty run and stops rather than inventing one to analyze (skills/openspec-retro/SKILL.md:45-46)
