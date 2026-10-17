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
(skills/openspec-plan/SKILL.md:56-57), and for every Unknown a read-only
local command can answer — `<binary> --help`, a no-arg subcommand that
performs no action — it SHALL re-dispatch a researcher with a `PROBE:` line;
no probe-resolvable Unknown survives into the §6 playback
(skills/openspec-plan/SKILL.md:57-61). The flow runs the adversarial grill
normally 1–3 rounds, up to 5 only for large-scale changes, with every
attack citing a research fact or the user's own words
(skills/openspec-plan/SKILL.md:66-78). Each risk the user dismisses is
recorded as a `REJECTED-RISK:` line (skills/openspec-plan/SKILL.md:86-88).
A seven-line playback — `Outcome / Why now / Success / Constraints /
Out of scope / Rejected risks / Established`, where `Established:` recites
up to five decision-relevant research findings, one per line, absences
included — must be explicitly confirmed before any file is written
(skills/openspec-plan/SKILL.md:92-96). The critique loop runs at most 3
rounds — with mechanical INVALID lines always fixed first — and on
`NEEDS-FIX` the flow waits for the planner revision to report DONE before
dispatching the next critic, never batching a critic with the revision
whose files it reads (skills/openspec-plan/SKILL.md:111-113). After 3
unresolved rounds the open findings go to the user as a three-option ask —
accept them, run one final planner revise plus mechanical
`openspec_validate` with no further critic, or stop — and a final revise
ending with INVALID output is fixed mechanically and re-validated until
VALID, never waived (skills/openspec-plan/SKILL.md:115-120). The §9
confirmed report SHALL name the current branch as read from a read-only
`git branch --show-current`-style check, or "no branch yet" — reporting
only; the flow itself creates no branch and performs no git write
(skills/openspec-plan/SKILL.md:130-132). Its next-step offers SHALL name
this plugin's slash commands (`/openspec.<name>`) whenever one exists for
the action; a skill id is never offered as a command; the upstream
`openspec` CLI or a vendored `/openspec-<name>` command is offered only
where the plugin has no equivalent
(skills/openspec-plan/SKILL.md:132-137).

#### Scenario: No writing before playback confirmation

- **WHEN** the plan flow reaches drafting
- **THEN** the seven-line playback has been restated and explicitly
  confirmed by the user (skills/openspec-plan/SKILL.md:92-94)

#### Scenario: Playback recites established findings

- **WHEN** the playback is restated for confirmation
- **THEN** the `Established:` entry names up to five decision-relevant
  research findings the user might re-ask, one per line, absences
  included (skills/openspec-plan/SKILL.md:94-96)

#### Scenario: Ununderstood question is restated, not assumed

- **WHEN** the user indicates they did not understand an interview
  question, in any language
- **THEN** the flow re-asks it with the concrete gloss before recording
  any answer from it as `ASSUMPTION:` (skills/openspec-plan/SKILL.md:48-51)

#### Scenario: Probe-resolvable unknown never reaches the playback

- **WHEN** research leaves an Unknown that a read-only local command can
  answer (e.g. `<binary> --help` or a no-arg subcommand that performs no
  action)
- **THEN** the flow re-dispatches a researcher with a `PROBE:` line instead
  of surfacing that Unknown in the §6 playback
  (skills/openspec-plan/SKILL.md:57-61)

#### Scenario: Critic waits for the revision to report DONE

- **WHEN** a `NEEDS-FIX` verdict dispatches the planner revision
- **THEN** the next critic dispatch happens only after the revision reports
  DONE — the flow never batches a critic with the revision whose files it
  reads (skills/openspec-plan/SKILL.md:111-113)

#### Scenario: Critique loop is bounded at three rounds

- **WHEN** the critic still returns NEEDS-FIX after 3 rounds
- **THEN** the flow presents the open findings and asks the user to accept
  them, run one final planner revise plus mechanical `openspec_validate`
  with no further critic, or stop
  (skills/openspec-plan/SKILL.md:115-117)

#### Scenario: Final revise never waives INVALID

- **WHEN** the final revise chosen at loop end ends with INVALID validation
  output
- **THEN** the flow fixes the violations mechanically and re-validates until
  VALID rather than presenting INVALID artifacts for acceptance
  (skills/openspec-plan/SKILL.md:117-119)

#### Scenario: Confirmed report names the branch read-only

- **WHEN** the user confirms the playback and the plan flow emits its final
  report
- **THEN** the report states the current branch from a read-only
  `git branch --show-current`-style check or says "no branch yet", and the
  flow has performed no git write
  (skills/openspec-plan/SKILL.md:130-132)

#### Scenario: Next-step offers name the plugin's slash commands

- **WHEN** the confirmed plan report offers its next step
- **THEN** it names the plugin's slash command `/openspec.apply
<change-id>` and offers no skill id as a command; an upstream `openspec`
  CLI or vendored command appears only where the plugin has no equivalent
  command for the action (skills/openspec-plan/SKILL.md:132-137)

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
the single source of execution order; the §3 restatement points at the
planner's `MODE: waves` rules as the source of truth, and each wave-table
row lists its groups' exact file paths
(skills/openspec-apply/SKILL.md:34-39). Each wave dispatches one
`openspec-implementer` per group in a single parallel background batch,
with results collected from completion notifications, never by polling;
each implementer prompt carries verbatim the group's tasks, its spec
requirement/scenario sections, the design.md decisions touching the group,
and the full wave table including each group's assigned files
(skills/openspec-apply/SKILL.md:46-52). A user request arriving mid-wave
SHALL first be checked against the wave table and the remaining `tasks.md`
items — a task that already covers it is cited, never re-implemented by a
duplicate group dispatch (skills/openspec-apply/SKILL.md:54-57). A
`BLOCKED:` answer triggers the protocol: a file conflict re-dispatches the
blocked group alone in a follow-up mini-wave; a guardrail or plan defect
halts and asks the user — the bar is never lowered to get green
(skills/openspec-apply/SKILL.md:61-68). A `BLOCKED:` reporting prompt
truncation is the exception and the orchestrator's own defect, not the
plan's: the group is re-dispatched with a numbered edit list of at most
150 lines referencing `file:line` locations instead of inlined spec or
transcript text (skills/openspec-apply/SKILL.md:68-71). Before §7 Review,
the flow SHALL execute every manual/eyeball acceptance group in `tasks.md`
with the user and record their confirmation — no change enters Review
while any manual/eyeball group is unticked — and relay every implementer
`DEFERRED:` line to the user verbatim; the verifier's `tasks.md`
consistency check remains a separate mechanical audit
(skills/openspec-apply/SKILL.md:75-80,92-95). `DEFERRED:` is inadmissible for
tasks in manual/eyeball acceptance groups — the §6 gate runs those groups
with the user, so they must end ticked,
and a run halts rather than carrying such a task into Review or the §8 Done
report (skills/openspec-apply/SKILL.md:78-79,94-95). After the final wave,
verifiers run in parallel per capability spec file; any FAIL yields one fix
round, and a re-verification that repeats the claim with a weakened bar is
treated as FAIL (skills/openspec-apply/SKILL.md:82-91). After the final
wave and before §7 Review the flow SHALL perform its post-final-wave full
check suite run once — by the orchestrator or a designated dispatch — and
cite its output in the reviewer payload; implementer-scoped runs do not
replace it (skills/openspec-apply/SKILL.md:96-99). The run ends with
`openspec-reviewer` over the cumulative diff carrying a `REVIEW FOCUS:`
block that holds the riskiest hunks from the wave table, verifier notes,
and the verbatim `Choices:` report lines of every wave implementer; on
`CHANGES-REQUESTED` the flow SHALL, before dispatching the re-review, run
the repo's own markdown/lint check over every `openspec/` artifact the fix
round touched, when the repo has one, and paste its output into the
re-review dispatch; scoped re-review answers open findings as
ADDRESSED / NOT-ADDRESSED, and user-approved BLOCKING leftovers are
recorded as `ruling:` lines (skills/openspec-apply/SKILL.md:103-115). The
Done report lists `DEFERRED:` entries verbatim, one line each, alongside
`choice:` and `ruling:` entries (skills/openspec-apply/SKILL.md:122-126),
counts `PASS (composited)` scenario lines as passes in the verification
summary, and relays every verifier `NO-REGRESSION-TEST:` line verbatim
(skills/openspec-apply/SKILL.md:127-130); when the user asks about branching
the flow cites the repo's branch-naming convention from `CONTRIBUTING.md`
or its equivalent, e.g. `feat/<topic>` — creating and renaming branches
stays the user's job, as do commits, and this flow performs no git writes
(skills/openspec-apply/SKILL.md:138-140). The Done report's next-step
offers SHALL name this plugin's slash commands (`/openspec.<name>`)
whenever one exists for the action — archiving is offered as
`/openspec.archive <change-id>`; a skill id is never offered as a
command, and the upstream `openspec` CLI or a vendored
`/openspec-<name>` command appears only where the plugin has no
equivalent (skills/openspec-apply/SKILL.md:132-137). The flow never
commits and never runs `openspec archive`
(skills/openspec-apply/SKILL.md:146-147).

#### Scenario: Invalid change blocks implementation

- **WHEN** `openspec_validate` does not return VALID for the selected
  change
- **THEN** the flow stops and reports the violations instead of
  dispatching implementers (skills/openspec-apply/SKILL.md:29-30)

#### Scenario: Implementer payload carries the full wave table

- **WHEN** a wave dispatch is built for one task group
- **THEN** the prompt quotes the full wave table, including each group's
  assigned files, not only the dispatched group's row
  (skills/openspec-apply/SKILL.md:50-52)

#### Scenario: File conflict becomes a mini-wave

- **WHEN** an implementer reports `BLOCKED: file conflict`
- **THEN** the blocked group is re-dispatched alone in a follow-up
  mini-wave after its conflicting sibling completes
  (skills/openspec-apply/SKILL.md:64-65)

#### Scenario: Truncation is re-dispatched, not halted on

- **WHEN** an implementer reports `BLOCKED:` caused by prompt truncation
- **THEN** the orchestrator re-dispatches that group with a numbered edit
  list of at most 150 lines referencing `file:line` locations, without
  treating it as a guardrail or plan defect
  (skills/openspec-apply/SKILL.md:68-71)

#### Scenario: Manual acceptance groups gate Review

- **WHEN** a manual or eyeball acceptance group in `tasks.md` is unticked
- **THEN** the flow runs it with the user and records the confirmation
  before §7 Review; no change enters Review with such a group unticked
  (skills/openspec-apply/SKILL.md:75-78)

#### Scenario: Deferrals reach the user before Review

- **WHEN** one or more implementers report `DEFERRED:` lines
- **THEN** the orchestrator relays every such line verbatim to the user
  before dispatching §7 Review — except a deferral naming a task in a
  manual/eyeball acceptance group, which halts the run at the §6 gate
  instead (skills/openspec-apply/SKILL.md:92-95)

#### Scenario: Mid-wave request cites an existing task

- **WHEN** the user adds a request mid-wave that a remaining `tasks.md`
  item already covers
- **THEN** the flow cites that item and dispatches no duplicate group
  (skills/openspec-apply/SKILL.md:54-57)

#### Scenario: Post-final-wave full check suite run precedes Review

- **WHEN** the final wave's verifiers finish and no FAIL remains open
- **THEN** the flow performs its post-final-wave full check suite run once
  before dispatching §7 Review and cites its output in the reviewer payload
  (skills/openspec-apply/SKILL.md:96-99)

#### Scenario: Reviewer sees every implementer choice

- **WHEN** §7 Review is dispatched
- **THEN** its `REVIEW FOCUS:` block quotes verbatim the `Choices:` report
  lines of every wave implementer, including `Choices: none` entries
  (skills/openspec-apply/SKILL.md:103-106)

#### Scenario: Fix round runs the repo's markdown check before re-review

- **WHEN** Review returns `CHANGES-REQUESTED`, the fix round touches
  `openspec/` artifacts, and the repo has a markdown/lint check
- **THEN** the flow runs that check over the touched artifacts and pastes
  its output into the scoped re-review dispatch
  (skills/openspec-apply/SKILL.md:110-113)

#### Scenario: Composited passes counted and relayed

- **WHEN** verifier reports contain `PASS (composited)` lines or
  `NO-REGRESSION-TEST:` lines
- **THEN** the Done summary counts composited passes as passes and relays
  every `NO-REGRESSION-TEST:` line verbatim
  (skills/openspec-apply/SKILL.md:127-130)

#### Scenario: Done report next steps name plugin slash commands

- **WHEN** the Done report lists next steps for the user
- **THEN** each action the plugin has a command for is offered as its
  `/openspec.<name>` command, no skill id is offered as a command, and
  upstream or vendored analogs appear only for actions with no plugin
  command (skills/openspec-apply/SKILL.md:132-137)

#### Scenario: Branching question is answered with the convention

- **WHEN** the user asks about branching in the Done step
- **THEN** the flow cites the repo's branch-naming convention and
  performs no git write itself — branch creation and renaming stay with
  the user (skills/openspec-apply/SKILL.md:138-140)

#### Scenario: Archiving stays with the user

- **WHEN** the apply flow finishes and reports next steps
- **THEN** archiving is presented as a deliberate user act and the flow
  has not run `openspec archive`
  (skills/openspec-apply/SKILL.md:132-137,146-147)

### Requirement: The retro flow is read-only, single-dispatch, and relays the report verbatim

The retro flow SHALL compile an evidence bundle from the current session —
commands, role dispatches with verbatim final reports, friction lines, and the
end-of-run `git diff --stat` — keeping the bundle raw quoted lines rather than
paraphrase (skills/openspec-retro/SKILL.md:13-25). It dispatches the bundle to
`openspec-retrospector` exactly once, with no rounds
(skills/openspec-retro/SKILL.md:27-30), and presents the report as-is, as
rendered Markdown rather than inside a code block — no commentary, no severity
re-shuffling, no additions (skills/openspec-retro/SKILL.md:32-39).
The command never edits `agents/`, `skills/`, `core/`, or any project file, and
does not feed interpretations or fill gaps from memory
(skills/openspec-retro/SKILL.md:40-46). An empty run with no role dispatches
causes the flow to say so and stop (skills/openspec-retro/SKILL.md:47-48).

#### Scenario: Single dispatch with verbatim relay

- **WHEN** the evidence bundle is compiled
- **THEN** exactly one retrospector dispatch runs and its report is presented without additions, as rendered Markdown (skills/openspec-retro/SKILL.md:27-39)

#### Scenario: Empty run stops the flow

- **WHEN** the session contains no role dispatches
- **THEN** the flow reports the empty run and stops rather than inventing one to analyze (skills/openspec-retro/SKILL.md:47-48)
