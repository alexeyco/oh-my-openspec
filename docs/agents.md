# Role catalog

Seven subagent roles drive the OpenSpec flow. Single source of truth:
`agents/*.md` — filename minus `.md` is the role id. Every role is
model-agnostic (no `model:` pin) and inherits the session model.

The normative behavioral contracts live in
[`openspec/specs/`](../openspec/specs) — see
[`agent-role-contracts`](../openspec/specs/agent-role-contracts/spec.md),
[`role-registration`](../openspec/specs/role-registration/spec.md), and
[`subagent-execution-policy`](../openspec/specs/subagent-execution-policy/spec.md).
This catalog is orientation: what each role is for and why the design looks
like this. Where the two disagree, the specs and the code win.

## Overview

The orchestrator (the main session running `/omos.init`,
`/omos.plan`, `/omos.apply`, `/omos.archive` or
`/omos.retro`) dispatches roles
and never implements itself. Role dispatches are forced into the background by
[`opencode/background.ts`](../opencode/background.ts), so independent work
runs concurrently; the orchestrator collects results from completion
notifications, never by polling.

| Phase (init) | Roles                                   |
| ------------ | --------------------------------------- |
| Discovery    | omos-researcher ×N (parallel, per area) |
| Baseline     | omos-planner (`MODE: baseline`)         |
| Critique ≤3× | omos-critic (`REVIEW: specs`) ⇄ planner |

| Phase (plan) | Roles                                                  |
| ------------ | ------------------------------------------------------ |
| Research     | omos-researcher ×N (parallel, per area)                |
| Grill        | orchestrator, attacks grounded in facts (1–3, up to 5) |
| Draft        | omos-planner (`MODE: plan`)                            |
| Critique ≤3× | omos-critic ⇄ omos-planner revisions                   |

| Phase (apply) | Roles                                                      |
| ------------- | ---------------------------------------------------------- |
| Wave plan     | omos-planner (`MODE: waves`)                               |
| Execute waves | omos-implementer ×1 per task group, parallel within a wave |
| Verify        | omos-verifier ×1 per capability (parallel)                 |
| Review        | omos-reviewer, then scoped re-review                       |

| Phase (retro) | Roles                                                 |
| ------------- | ----------------------------------------------------- |
| Reflect       | omos-retrospector ×1 (evidence bundle in, report out) |

## Roles

### omos-researcher

Explores the repository and existing OpenSpec artifacts for verifiable
facts: code with `path:line`, live specs that constrain the request, active
changes that overlap, project quality bar. Read-only. Questions a read-only
local probe can answer come back as `PROBE:` answer lines; only numbered
questions a probe could not resolve reach the next interview round.

### omos-planner

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

### omos-critic

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

### omos-implementer

Executes exactly one numbered task group. The spec scenarios quoted into
its prompt are the contract; it ticks only its own `- [ ]` boxes, runs the
project's full check suite when it is the sole implementer of its wave and
otherwise a suite scoped to the group's files — deferring the full run to
the apply flow's post-final-wave full check suite run — and reports
DONE/BLOCKED with evidence, `Choices:` lines for every decision the
artifacts left open, and plan divergences. A file conflict with a sibling
implementer stops it (`BLOCKED: file conflict`).

### omos-verifier

Checks implementation against artifacts by executing scenarios — actually
triggering WHEN and observing THEN, plus the mechanical
`openspec_validate` gate and `tasks.md` consistency. Fresh-run evidence per
scenario, `PASS`/`FAIL` lines. Rejects lowered bars. Read-only.

### omos-reviewer

Critiques the cumulative diff against proposal, spec delta, and design:
scope creep, happy-path-only scenarios, silent design divergence, leftover
TODOs, and the implementers' `Choices:` lines — the verbatim `Choices:`
report lines of every wave implementer arrive in the `REVIEW FOCUS:`
payload. Verdict `APPROVE` or `CHANGES-REQUESTED`; re-review of fixed
findings is scoped to `ADDRESSED`/`NOT-ADDRESSED`. Reads `git diff`,
writes nothing.

### omos-retrospector

Mines the evidence bundle of one finished run for defects in the plugin's
own prompt entities (`agents/*.md`, flow `skills/*/SKILL.md`,
`core/prompts.ts`) — and nothing else: vendored skills, project code, and
the CLI are out of scope, findings there are dropped. Every finding must
quote one decisive bundle line verbatim; unquoted observations do not
exist. At most 8 findings, ranked `HIGH` (wrong behavior or wasted work) →
`MED` (friction, rework) → `LOW` (polish). The report is rendered Markdown
and opens with the single tally line `N findings: X HIGH · Y MED · Z LOW`;
findings are numbered, separated by blank lines, each headed by severity,
file, and a title of at most 6 words. `Was:` (≤20 words) is followed by the
verbatim bundle quote as its own blockquote line; `Why:` (≤15 words) names
the concrete cost this run paid; `Fix:` (≤25 words) is an executable edit
naming file and section. The quote must show the defect on its own; a
hypothetical cost disqualifies the finding. Reports
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

Role scoping is kept out of frontmatter on purpose (see Scoping above): a
single shared contract binds all roles at once — report style, the git-write
ban, `BLOCKED`/`UNVERIFIED` conventions — instead of duplicating them in
seven prompts. The plugin injects it into every role session; the exact
contents and injection mechanism are specified in
[`subagent-execution-policy`](../openspec/specs/subagent-execution-policy/spec.md),
implemented in [`core/prompts.ts`](../core/prompts.ts) and the `context` hook.

## openspec_validate

The flow gates on the upstream CLI rather than reimplementing its rules:
validation semantics belong to OpenSpec, the plugin only wraps and formats
the report. The tool's exact contract (arguments, output strings, missing-CLI
behavior) is specified in [`spec-validation`](../openspec/specs/spec-validation/spec.md).

## See also

- [../skills/omos-init/SKILL.md](../skills/omos-init/SKILL.md) — the
  bootstrap flow that builds the baseline specs.
- [../skills/omos-plan/SKILL.md](../skills/omos-plan/SKILL.md) — the
  briefing flow that dispatches plan-phase roles.
- [../skills/omos-apply/SKILL.md](../skills/omos-apply/SKILL.md) —
  the execution flow that dispatches apply-phase roles.
- [../skills/omos-retro/SKILL.md](../skills/omos-retro/SKILL.md) —
  the retrospective flow that feeds the retrospector.
- [vendor-sync.md](vendor-sync.md) — where the vendored workflow skills
  come from and how they stay fresh.
