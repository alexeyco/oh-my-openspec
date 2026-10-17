---
name: openspec-apply
description: "Apply an OpenSpec change via /openspec.apply — implement task groups in parallel waves, verify scenarios, review the diff. Never commits."
---

# openspec-apply

Implement `openspec/changes/<change-id>/` through dependency-ordered parallel
subagent waves with verification and review. The OpenSpec artifacts are the
contract. You never run git write commands — the user reviews and commits.

## Flow

### 1. Select the change

- `Change: <id>` given → use it.
- Otherwise run `openspec list --json` (or read `openspec/changes/`).
  Exactly one active change → confirm it. Several → ask, one per run.
  None → tell the user to run `/openspec.plan` and stop.

### 2. Mechanical gate

Run `openspec_validate` with the change id.

- `UNAVAILABLE` → offer to install the CLI now (`npm install -g
@fission-ai/openspec`, or `brew install openspec` on macOS; explicit yes
  required). **Declined** → stop — unlike plan, apply cannot verify without
  the gate.
- Not VALID → stop, report the numbered violations, suggest a
  `/openspec.plan` fix round. Do not proceed.

### 3. Wave plan

Dispatch `openspec-planner` with `MODE: waves` over `tasks.md` + `design.md`.
It returns ordered waves of task groups (groups run in parallel within a
wave; overlapping files serialize groups into later waves; conservative
choices on uncertainty). Record the wave table in the session before
dispatching.

### 4. Execute waves

For each wave, in order:

- Dispatch one `openspec-implementer` per group in the wave, all in a single
  parallel batch. On OpenCode the batch is one set of background dispatches,
  each returning `sessionID` and status `running` — collect results from
  completion notifications, never by polling.
- Each implementer prompt carries verbatim: the group's tasks, the spec
  requirement/scenario sections they implement, design.md decisions touching
  the group, and the wave table row it belongs to.
- Implementers tick their own `- [ ]` → `- [x]` in `tasks.md`.
- A user request arriving mid-wave is first checked against the wave table —
  the single source of execution order (Guardrails) — and the remaining
  `tasks.md` items; a covering task is cited, never duplicated by a new
  dispatch.

### 5. Blockage and conflict

An implementer `BLOCKED:` answer stops the run's dispatch loop for the
affected wave:

- `file conflict` → re-dispatch the blocked group alone in a follow-up
  mini-wave after its conflicting sibling completes.
- Guardrail or plan defect → halt and ask the user (irreversible action,
  security change, external side effect, broken plan are always user
  decisions). Never lower the bar to get green. Exception: a
  prompt-truncation `BLOCKED:` is the orchestrator's defect, not the
  plan's — re-dispatch the group with a numbered edit list of ≤150 lines
  referencing `file:line`, not inlined spec or transcript text.

### 6. Verify

Before §7 Review, the orchestrator's ordering gate: every manual/eyeball
acceptance group in `tasks.md` is executed with the user and its
confirmation recorded — no change enters Review with any such group
unticked. `DEFERRED:` is inadmissible for tasks in those groups — they end
ticked or the run halts. This gate is ordering only; the verifier's
`tasks.md` consistency check stays a separate mechanical audit.

After the final wave: dispatch one `openspec-verifier` per capability spec
file in parallel. Each runs the mechanical gate, executes every scenario's
WHEN/THEN, and checks `tasks.md` consistency.

- Any FAIL → one fix round: dispatch `openspec-implementer` per failing
  capability with the exact scenario lines, then re-run only the failed
  verifiers.
- Rejected: verifier reports that repeat the original claim with a weakened
  bar (skipped test, widened assertion) → treat as FAIL, do not re-dispatch
  the same implementer unchanged.
- Relay every implementer `DEFERRED:` line (`DEFERRED: <task-id> — <reason>
— <user action>`) verbatim to the user before §7 Review starts; a
  deferral naming a task in a manual/eyeball group halts at the gate above
  instead of being relayed.

### 7. Review

Dispatch `openspec-reviewer` over the cumulative diff (`git diff --stat` +
full diff) with a `REVIEW FOCUS:` block: the riskiest hunks from the wave
table and verifier notes.

- `CHANGES-REQUESTED` → fix round (implementer), then scoped re-review: only
  the open findings, answered `ADDRESSED` / `NOT-ADDRESSED`.
- On `CHANGES-REQUESTED`, before dispatching the re-review, run the repo's
  own markdown/lint check over every `openspec/` artifact the fix round
  touched, when the repo has one, and paste its output into the re-review
  dispatch.
- BLOCKING findings left at the user's explicit choice only, recorded as
  `ruling:` lines.

### 8. Done

Final report:

- Groups completed per wave with evidence one-liners.
- `choice:` entries — every implementer `Choices:` decision worth the user's
  eye, one line each (`none` if empty).
- `ruling:` entries — user-approved deviations, verbatim.
- `DEFERRED:` entries — verbatim, one line each
  (`DEFERRED: <task-id> — <reason> — <user action>`).
- Verification summary: scenarios PASS count / total, gate VALID.
- `git diff --stat` of the working tree.
- Next steps for the user, in their hands: review the diff, commit, then
  archive with `/openspec.archive <change-id>`.
- Branching questions are answered by citing the repo's `CONTRIBUTING.md`
  branch-naming convention, e.g. `feat/<topic>` — branch creation, renaming,
  and commits stay the user's; the flow performs no git writes.

## Guardrails

- Implementation is bounded by the spec delta: any needed change outside it
  is a plan defect → stop and ask, do not sneak it in.
- Never commit, push, or stage; never run `openspec archive` — archiving is
  a deliberate user act after review.
- The wave table is the single source of execution order for this run.
