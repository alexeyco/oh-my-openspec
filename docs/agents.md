# Role catalog

Seven subagent roles drive the OpenSpec flow. Single source of truth:
`agents/*.md` — filename minus `.md` is the role id. Every role is
model-agnostic (no `model:` pin) and inherits the session model.

## Overview

The orchestrator (the main session running `/openspec.init`,
`/openspec.plan`, `/openspec.apply` or `/openspec.retro`) dispatches roles
and never implements itself. Role dispatches are forced into the background by
[`opencode/background.ts`](../opencode/background.ts), so independent work
runs concurrently; the orchestrator collects results from completion
notifications, never by polling.

| Phase (init) | Roles                                       |
| ------------ | ------------------------------------------- |
| Discovery    | openspec-researcher ×N (parallel, per area) |
| Baseline     | openspec-planner (`MODE: baseline`)         |
| Critique ≤3× | openspec-critic (`REVIEW: specs`) ⇄ planner |

| Phase (plan) | Roles                                                  |
| ------------ | ------------------------------------------------------ |
| Research     | openspec-researcher ×N (parallel, per area)            |
| Grill        | orchestrator, attacks grounded in facts (1–3, up to 5) |
| Draft        | openspec-planner (`MODE: plan`)                        |
| Critique ≤3× | openspec-critic ⇄ openspec-planner revisions           |

| Phase (apply) | Roles                                                          |
| ------------- | -------------------------------------------------------------- |
| Wave plan     | openspec-planner (`MODE: waves`)                               |
| Execute waves | openspec-implementer ×1 per task group, parallel within a wave |
| Verify        | openspec-verifier ×1 per capability (parallel)                 |
| Review        | openspec-reviewer, then scoped re-review                       |

| Phase (retro) | Roles                                                     |
| ------------- | --------------------------------------------------------- |
| Reflect       | openspec-retrospector ×1 (evidence bundle in, report out) |

## Roles

### openspec-researcher

Explores the repository and existing OpenSpec artifacts for verifiable
facts: code with `path:line`, live specs that constrain the request, active
changes that overlap, project quality bar. Read-only. Unknowns come back as
numbered questions for the next interview round.

### openspec-planner

Three modes, named at the top of the dispatch prompt:

- `MODE: plan` — the drafter: writes the complete change under
  `openspec/changes/<id>/` (proposal, spec deltas, design, tasks), seeding
  `ASSUMPTION:` lines for anything inferred and `REJECTED-RISK:` lines for
  every grill dismissal.
- `MODE: baseline` — the bootstrapper: writes `openspec/specs/<capability>/spec.md`
  for each confirmed capability from quoted research facts — observed current
  behavior only, `UNVERIFIED:` instead of invented SHALLs.
- `MODE: waves` — read-only execution planning: maps `tasks.md` groups to
  ordered waves; groups may share a wave only when they cannot touch the
  same file; overlap or uncertainty serializes. Output is the wave table
  itself.

Together these make the planner the only role that writes OpenSpec artifacts.

### openspec-critic

Guards artifacts before user approval — a drafted change (default) or
baseline specs (`REVIEW: specs`). Mechanical first: runs the
`openspec_validate` tool; any INVALID line is automatically blocking. Then
editorial: for changes — delta headers, scenario shape (`WHEN`/`THEN`),
traceability spec ↔ tasks, one-capability scope, honest tasks; for specs —
present-tense behavior only, evidence per requirement, 2–6 requirements per
capability, no duplicated behavior across capabilities. A `REJECTED-RISK:`
dropped from paper is BLOCKING — the user dismissed it, the proposal must
say so. Reports `CLEAN` or
`NEEDS-FIX` with numbered BLOCKING/NON-BLOCKING findings and every
`ASSUMPTION:` line. Read-only.

### openspec-implementer

Executes exactly one numbered task group. The spec scenarios quoted into
its prompt are the contract; it ticks only its own `- [ ]` boxes, runs the
project's full checks, and reports DONE/BLOCKED with evidence, `Choices:`
lines for every decision the artifacts left open, and plan divergences. A
file conflict with a sibling implementer stops it (`BLOCKED: file conflict`).

### openspec-verifier

Checks implementation against artifacts by executing scenarios — actually
triggering WHEN and observing THEN, plus the mechanical
`openspec_validate` gate and `tasks.md` consistency. Fresh-run evidence per
scenario, `PASS`/`FAIL` lines. Rejects lowered bars. Read-only.

### openspec-reviewer

Critiques the cumulative diff against proposal, spec delta, and design:
scope creep, happy-path-only scenarios, silent design divergence, leftover
TODOs, and the implementers' `Choices:` lines. Verdict `APPROVE` or
`CHANGES-REQUESTED`; re-review of fixed findings is scoped to
`ADDRESSED`/`NOT-ADDRESSED`. Reads `git diff`, writes nothing.

### openspec-retrospector

Mines the evidence bundle of one finished run for defects in the plugin's
own prompt entities (`agents/*.md`, flow `skills/*/SKILL.md`,
`core/prompts.ts`) — and nothing else: vendored skills, project code, and
the CLI are out of scope, findings there are dropped. Every finding must
quote one decisive bundle line verbatim; unquoted observations do not
exist. At most 8 findings, each exactly `Was / Why / Fix`, ranked
`HIGH` (wrong behavior or wasted work) → `MED` (friction, rework) → `LOW`
(polish), with an executable `Fix:` naming file and section. Reports
`No findings — run clean.` when the run exposed nothing actionable.
Read-only.

## Scoping

Permission/tool scoping is intentionally absent from agent frontmatter. A
role is bounded by three layers:

1. Its prompt in `agents/<role>.md` — mission, report format, "You never" list.
2. The injected `SUBAGENT_CONTRACT` (below) — shared behavior for all roles.
3. The OpenSpec artifacts quoted into the dispatch prompt — the contract for
   what may change; anything outside it is a defect to report, not to fix.

## SUBAGENT_CONTRACT injection

The plugin pushes `SUBAGENT_CONTRACT` (from [`core/prompts.ts`](../core/prompts.ts))
into the system prompt of every role session via the `context` hook. It
binds all roles at once: report style (findings, then evidence), artifacts
under `openspec/` as the contract, **never run git write commands**,
`BLOCKED: <reason>` on guardrail conflicts, `UNVERIFIED` labeling instead
of guessing, no drive-by refactors.

## openspec_validate

The mechanical gate, registered by the plugin entry:
`openspec_validate [change]` runs the upstream CLI
(`openspec validate <change> --json`, or `--all --json`) and returns
`VALID …` / `INVALID …:` with numbered violations, or `UNAVAILABLE` — the
flow skills then offer to install the CLI (`npm install -g
@fission-ai/openspec` or `brew install openspec`) with the user's explicit
consent. Upstream owns the rules; this plugin only wraps and formats.

## See also

- [../skills/openspec-init/SKILL.md](../skills/openspec-init/SKILL.md) — the
  bootstrap flow that builds the baseline specs.
- [../skills/openspec-plan/SKILL.md](../skills/openspec-plan/SKILL.md) — the
  briefing flow that dispatches plan-phase roles.
- [../skills/openspec-apply/SKILL.md](../skills/openspec-apply/SKILL.md) —
  the execution flow that dispatches apply-phase roles.
- [../skills/openspec-retro/SKILL.md](../skills/openspec-retro/SKILL.md) —
  the retrospective flow that feeds the retrospector.
- [vendor-sync.md](vendor-sync.md) — where the vendored workflow skills
  come from and how they stay fresh.
