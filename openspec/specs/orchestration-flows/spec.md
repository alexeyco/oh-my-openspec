# Orchestration flows

## Purpose

This capability covers the four flow skills shipped under `skills/`:
omos-plan, omos-init, omos-apply, and omos-retro. Each flow is
the orchestrator's script for one command — plan a change, bootstrap baseline
specs, implement a change, retrospect a finished run. The shipped instructions
guarantee a shared discipline: the orchestrator dispatches role subagents and
never drafts or writes artifacts itself, never runs git write commands, gates
on the `openspec_validate` CLI with per-flow degradation rules, bounds its
critique loops, and confines every write to the `openspec/` tree.

## Requirements

### Requirement: The orchestrator dispatches, never drafts, and never writes outside the flow

Flow orchestrators SHALL dispatch role agents to write artifacts, never draft them directly, and keep writes within each flow's permitted OpenSpec paths. Git writes remain the user's responsibility.

#### Scenario: All artifact writing goes to subagents

- **WHEN** a flow needs proposal, spec, task, or baseline-spec content written
- **THEN** the flow dispatches `omos-planner` (or another role) rather than the orchestrator writing the file (skills/omos-plan/SKILL.md:9-10,92-95; skills/omos-init/SKILL.md:55-56)

#### Scenario: Flow bodies stay wired to the roles they dispatch

- **WHEN** a flow skill stops naming a role agent or tool it dispatches
- **THEN** the assets test fails for that skill (tests/assets.test.ts:62-107)

### Requirement: The CLI precondition gates each flow with per-flow degradation

Drafting and implementation flows SHALL gate on openspec_validate. When unavailable, plan may continue critic-only only with user consent; init and apply stop. Plan and init also require consent before initializing a missing OpenSpec root.

#### Scenario: Plan degrades to critic-only on declined install

- **WHEN** the CLI is unavailable and the user declines installing it during `/omos.plan`, then accepts non-mechanical validation
- **THEN** the flow continues with critic-only validation (skills/omos-plan/SKILL.md:21-22)

#### Scenario: Init and apply refuse to degrade

- **WHEN** the CLI is unavailable and the user declines installing it during `/omos.init` or `/omos.apply`
- **THEN** the flow stops (skills/omos-init/SKILL.md:20-22; skills/omos-apply/SKILL.md:27-28)

### Requirement: The plan flow interviews, grills, and confirms a playback before any file write

The plan flow SHALL interview for coverage, research unknowns, run an evidence-grounded grill, and obtain explicit confirmation of the seven-line playback before drafting. Critique and mechanical recovery SHALL follow their bounded rules before approval.

#### Scenario: No writing before playback confirmation

- **WHEN** the plan flow reaches drafting
- **THEN** the seven-line playback has been restated and explicitly
  confirmed by the user (skills/omos-plan/SKILL.md:92-94)

#### Scenario: Playback recites established findings

- **WHEN** the playback is restated for confirmation
- **THEN** the `Established:` entry names up to five decision-relevant
  research findings the user might re-ask, one per line, absences
  included (skills/omos-plan/SKILL.md:94-96)

#### Scenario: Ununderstood question is restated, not assumed

- **WHEN** the user indicates they did not understand an interview
  question, in any language
- **THEN** the flow re-asks it with the concrete gloss before recording
  any answer from it as `ASSUMPTION:` (skills/omos-plan/SKILL.md:48-51)

#### Scenario: Probe-resolvable unknown never reaches the playback

- **WHEN** research leaves an Unknown that a read-only local command can
  answer (e.g. `<binary> --help` or a no-arg subcommand that performs no
  action)
- **THEN** the flow re-dispatches a researcher with a `PROBE:` line instead
  of surfacing that Unknown in the §6 playback
  (skills/omos-plan/SKILL.md:57-61)

#### Scenario: Critic waits for the revision to report DONE

- **WHEN** a `NEEDS-FIX` verdict dispatches the planner revision
- **THEN** the next critic dispatch happens only after the revision reports
  DONE — the flow never batches a critic with the revision whose files it
  reads (skills/omos-plan/SKILL.md:111-113)

#### Scenario: Critique loop is bounded at three rounds

- **WHEN** the critic still returns NEEDS-FIX after 3 rounds
- **THEN** the flow presents the open findings and asks the user to accept
  them, run one final planner revise plus mechanical `openspec_validate`
  with no further critic, or stop
  (skills/omos-plan/SKILL.md:115-117)

#### Scenario: Final revise never waives INVALID

- **WHEN** the final revise chosen at loop end ends with INVALID validation
  output
- **THEN** the flow fixes the violations mechanically and re-validates until
  VALID rather than presenting INVALID artifacts for acceptance
  (skills/omos-plan/SKILL.md:117-119)

#### Scenario: Confirmed report names the branch read-only

- **WHEN** the user confirms the playback and the plan flow emits its final
  report
- **THEN** the report states the current branch from a read-only
  `git branch --show-current`-style check or says "no branch yet", and the
  flow has performed no git write
  (skills/omos-plan/SKILL.md:130-132)

#### Scenario: Next-step offers name the plugin's slash commands

- **WHEN** the confirmed plan report offers its next step
- **THEN** it names the plugin's slash command `/omos.apply
<change-id>` and offers no skill id as a command; an upstream `openspec`
  CLI or vendored command appears only where the plugin has no equivalent
  command for the action (skills/omos-plan/SKILL.md:132-137)

### Requirement: The plan flow validates drafted changes and offers recovery for unresolved findings

After the normal critique path and before approval, the plan flow SHALL call
`openspec_validate` for the drafted change. On `INVALID`, it SHALL dispatch
`omos-planner` with the exact findings and validate again after each revision.
If findings remain or the planner cannot safely resolve them, the flow SHALL
show the findings and offer the user another planner revision or the chance to
fix them, without claiming validation passed.

#### Scenario: Plan repairs and revalidates mechanical findings

- **WHEN** validation of the drafted change returns `INVALID` after critique
- **THEN** the flow sends the exact findings to the planner and revalidates the revised change

#### Scenario: Plan offers a next step for unresolved findings

- **WHEN** a planner revision leaves findings unresolved or the planner reports it cannot safely resolve them
- **THEN** the flow shows the exact findings and offers another planner revision or the user's own fix, without claiming validation passed

### Requirement: The init flow writes baseline specs describing observed behavior only

Init SHALL research the existing specs, confirm the capability map, and write only evidence-backed baseline behavior. Extend mode SHALL preserve existing specs, and unverified behavior SHALL not become a SHALL requirement.

#### Scenario: Un-evidenced capability is dropped

- **WHEN** a proposed capability in the map has no researcher evidence
- **THEN** the flow drops it rather than guessing (skills/omos-init/SKILL.md:50-51)

#### Scenario: Extend mode protects existing baselines

- **WHEN** `openspec/specs/` is non-empty and the user chooses extend
- **THEN** discovery skips covered capabilities and existing spec files are not touched (skills/omos-init/SKILL.md:32-34)

### Requirement: The apply flow gates on VALID, executes one implementer per task group, and handles blockage without lowering the bar

Apply SHALL require VALID before implementation, execute one implementer per task group in dependency-ordered waves, resolve conflicts and blockers without lowering requirements, run manual acceptance and verification, perform the full check suite, and review the cumulative diff.

#### Scenario: Invalid change blocks implementation

- **WHEN** `openspec_validate` does not return VALID for the selected
  change
- **THEN** the flow stops and reports the violations instead of
  dispatching implementers (skills/omos-apply/SKILL.md:29-30)

#### Scenario: Implementer payload carries the full wave table

- **WHEN** a wave dispatch is built for one task group
- **THEN** the prompt quotes the full wave table, including each group's
  assigned files, not only the dispatched group's row
  (skills/omos-apply/SKILL.md:50-52)

#### Scenario: File conflict becomes a mini-wave

- **WHEN** an implementer reports `BLOCKED: file conflict`
- **THEN** the blocked group is re-dispatched alone in a follow-up
  mini-wave after its conflicting sibling completes
  (skills/omos-apply/SKILL.md:64-65)

#### Scenario: Truncation is re-dispatched, not halted on

- **WHEN** an implementer reports `BLOCKED:` caused by prompt truncation
- **THEN** the orchestrator re-dispatches that group with a numbered edit
  list of at most 150 lines referencing `file:line` locations, without
  treating it as a guardrail or plan defect
  (skills/omos-apply/SKILL.md:68-71)

#### Scenario: Manual acceptance groups gate Review

- **WHEN** a manual or eyeball acceptance group in `tasks.md` is unticked
- **THEN** the flow runs it with the user and records the confirmation
  before §7 Review; no change enters Review with such a group unticked
  (skills/omos-apply/SKILL.md:75-78)

#### Scenario: Deferrals reach the user before Review

- **WHEN** one or more implementers report `DEFERRED:` lines
- **THEN** the orchestrator relays every such line verbatim to the user
  before dispatching §7 Review — except a deferral naming a task in a
  manual/eyeball acceptance group, which halts the run at the §6 gate
  instead (skills/omos-apply/SKILL.md:92-95)

#### Scenario: Mid-wave request cites an existing task

- **WHEN** the user adds a request mid-wave that a remaining `tasks.md`
  item already covers
- **THEN** the flow cites that item and dispatches no duplicate group
  (skills/omos-apply/SKILL.md:54-57)

#### Scenario: Post-final-wave full check suite run precedes Review

- **WHEN** the final wave's verifiers finish and no FAIL remains open
- **THEN** the flow performs its post-final-wave full check suite run once
  before dispatching §7 Review and cites its output in the reviewer payload
  (skills/omos-apply/SKILL.md:96-99)

#### Scenario: Reviewer sees every implementer choice

- **WHEN** §7 Review is dispatched
- **THEN** its `REVIEW FOCUS:` block quotes verbatim the `Choices:` report
  lines of every wave implementer, including `Choices: none` entries
  (skills/omos-apply/SKILL.md:103-106)

#### Scenario: Fix round runs the repo's markdown check before re-review

- **WHEN** Review returns `CHANGES-REQUESTED`, the fix round touches
  `openspec/` artifacts, and the repo has a markdown/lint check
- **THEN** the flow runs that check over the touched artifacts and pastes
  its output into the scoped re-review dispatch
  (skills/omos-apply/SKILL.md:110-113)

#### Scenario: Composited passes counted and relayed

- **WHEN** verifier reports contain `PASS (composited)` lines or
  `NO-REGRESSION-TEST:` lines
- **THEN** the Done summary counts composited passes as passes and relays
  every `NO-REGRESSION-TEST:` line verbatim
  (skills/omos-apply/SKILL.md:127-130)

#### Scenario: Done report next steps name plugin slash commands

- **WHEN** the Done report lists next steps for the user
- **THEN** each action the plugin has a command for is offered as its
  `/omos.<name>` command, no skill id is offered as a command, and
  upstream or vendored analogs appear only for actions with no plugin
  command (skills/omos-apply/SKILL.md:132-137)

#### Scenario: Branching question is answered with the convention

- **WHEN** the user asks about branching in the Done step
- **THEN** the flow cites the repo's branch-naming convention and
  performs no git write itself — branch creation and renaming stay with
  the user (skills/omos-apply/SKILL.md:138-140)

#### Scenario: Archiving stays with the user

- **WHEN** the apply flow finishes and reports next steps
- **THEN** archiving is presented as a deliberate user act and the flow
  has not run `openspec archive`
  (skills/omos-apply/SKILL.md:132-137,146-147)

The apply flow SHALL offer the plugin archive command as its next step using
`/omos.archive <change-id>` in the shared source skill. Host adapters may
render that recommendation in their native invocation form; the shared skill
SHALL not name Codex-only skill mentions.

#### Scenario: Apply offers the shared archive command

- **WHEN** the apply flow completes verification and review
- **THEN** its next-step recommendation in `skills/omos-apply/SKILL.md` is `/omos.archive <change-id>`

### Requirement: The archive flow syncs before archiving and repairs safely fixable post-archive spec issues

Archive SHALL validate the selected change, sync and verify required spec deltas before moving it, then validate the resulting specs. It SHALL repair safely fixable issues and stop without claiming success when findings remain.

#### Scenario: Sync completes before archive without asking

- **WHEN** the archive flow runs for a completed change
- **THEN** it requires sync before archive without asking whether to sync

#### Scenario: Sync blocker prevents archive

- **WHEN** required specification sync is blocked
- **THEN** the flow stops before archiving and reports the blocker

#### Scenario: Fixable post-archive issue is repaired and revalidated

- **WHEN** post-archive validation reports an issue safely fixable within
  OpenSpec artifacts
- **THEN** the flow repairs it and runs validation again

#### Scenario: Unsafe post-archive issue stops with a report

- **WHEN** an issue requires code changes or cannot be safely repaired
- **THEN** the flow stops and reports it without claiming validation passed

### Requirement: Archive syncs specifications before archiving

The archive flow's shared instructions in `core/prompts.ts::archiveInstruction`
and Codex wrapper guidance from `codex/skills.ts::renderArchiveSkill` SHALL
sync the change's specification deltas before archiving. If required sync is
blocked, the flow SHALL stop before archiving.

#### Scenario: Archive guidance requires sync without a confirmation prompt

- **WHEN** the shared archive instruction and Codex wrapper guidance are inspected
- **THEN** both direct the archive flow to sync specification deltas before archiving and contain no question asking whether to sync

#### Scenario: Archive guidance stops on a required sync blocker

- **WHEN** the shared archive instruction and Codex wrapper guidance are inspected
- **THEN** both direct the flow to stop before archiving when required sync is blocked

### Requirement: Archive sync gives new main specifications readable titles

When the archive guidance from `core/prompts.ts::archiveInstruction` and
`codex/skills.ts::renderArchiveSkill` creates a new main capability
specification under `openspec/specs/`, it SHALL set a human-readable
top-level title derived safely from the capability's purpose or meaning and
keep the machine-named path unchanged. When sync updates an existing main
capability specification, it SHALL preserve that file's existing authored
title.

#### Scenario: Archive guidance requires readable titles for new specs

- **WHEN** the shared archive instruction and Codex wrapper guidance are inspected
- **THEN** both require a human-readable title derived from the capability meaning for a new `openspec/specs/<capability>/spec.md` and retain the machine-named path

#### Scenario: Archive guidance preserves existing authored titles

- **WHEN** the shared archive instruction and Codex wrapper guidance are inspected
- **THEN** both require preserving an existing main specification's authored top-level title during sync

### Requirement: Archive validates after archiving and repairs fixable specification issues

After archive, the shared archive instruction in
`core/prompts.ts::archiveInstruction`, rendered for Codex by
`codex/skills.ts::renderArchiveSkill`, SHALL validate the resulting
specifications. If validation identifies a safely fixable issue in OpenSpec
artifacts, the flow SHALL repair it and run validation again. If an issue
cannot be safely fixed within OpenSpec artifacts, it SHALL stop and report
the issue.

#### Scenario: Archive guidance repairs fixable post-archive issues

- **WHEN** the shared archive instruction and Codex wrapper guidance are inspected
- **THEN** both require safely repairing fixable OpenSpec artifact issues found after archive and rerunning validation

#### Scenario: Archive guidance reports unfixable post-archive issues

- **WHEN** the shared archive instruction and Codex wrapper guidance are inspected
- **THEN** both require stopping and reporting issues that require code changes or cannot be safely repaired in OpenSpec artifacts, without claiming validation passed

### Requirement: The archive flow offers help with unresolved post-archive validation findings

After attempting safe repairs to post-archive OpenSpec artifact issues and
revalidating, the archive flow SHALL show any remaining findings and
proactively offer the user help to resolve them. It SHALL stop without
claiming validation passed while findings remain.

#### Scenario: Archive offers help when findings remain

- **WHEN** post-archive validation remains `INVALID` after safe repair attempts, or an issue cannot safely be repaired within OpenSpec artifacts
- **THEN** the flow shows the findings and offers the user help to resolve them, without claiming validation passed

#### Scenario: Archive completes after successful repair

- **WHEN** safe repairs make post-archive validation return `VALID`
- **THEN** the flow reports the successful validation and does not offer an unresolved-findings recovery step

### Requirement: The retro flow is read-only, single-dispatch, and relays the report verbatim

Retro SHALL compile the session evidence, dispatch one retrospector, and relay its Markdown report verbatim. It SHALL remain read-only and stop without inventing findings when the session has no role dispatches.

#### Scenario: Single dispatch with verbatim relay

- **WHEN** the evidence bundle is compiled
- **THEN** exactly one retrospector dispatch runs and its report is presented without additions, as rendered Markdown (skills/omos-retro/SKILL.md:27-39)

#### Scenario: Empty run stops the flow

- **WHEN** the session contains no role dispatches
- **THEN** the flow reports the empty run and stops rather than inventing one to analyze (skills/omos-retro/SKILL.md:47-48)
