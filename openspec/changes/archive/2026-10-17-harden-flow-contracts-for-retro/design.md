# Design — harden-flow-contracts-for-retro

## Approach

Text-only edits in three asset families; plugin code paths, hooks, and
registration are untouched. `skills/*/SKILL.md` are hand-authored
(opencode/index.ts:39, CONTRIBUTING.md:81-85), `agents/*.md` load through
core/roles.ts:26-40, and `SUBAGENT_CONTRACT` lives in core/prompts.ts:21-33.
Because every insertion shifts line numbers and the specs cite files by
line ranges, the last task group re-syncs all citations in the delta'd
requirements against the finished files and runs `make check`
(scripts/check.mjs + sync-vendor --check + typecheck + npm test). No
markdown linter exists in this repo; prettier via `make fmt` over touched
files is the formatting step and runs inside that final group, not at
commit time — the plugin never commits.

## Locked wording: DEFERRED (findings 10a/10b/10c/10d — four-site lockstep)

The canonical line format is fixed here so parallel implementers cannot
drift:

```
DEFERRED: <task-id> — <reason> — <user action>
```

Rationale: a task the implementer must not finish is neither DONE nor
BLOCKED; without a legal third state the implementer fakes progress or
the orchestrator halts on a non-blockage. Four sites must agree:

1. `agents/openspec-implementer.md` report format — defines the line and
   the admission test: legal only when completing the task requires
   actions or authority outside the implementer's remit (user request,
   external resource); never admissible for tasks in manual/eyeball
   acceptance groups — the §6 gate runs those with the user, so they end
   ticked or the run halts; otherwise `BLOCKED`.
2. `agents/openspec-verifier.md` tasks cross-check — a well-formed
   deferral is a legitimate unticked task, not a done-but-unticked
   mismatch; a line missing reason or user action is itself a defect;
   any deferral on a manual/eyeball-group task is itself a defect.
3. `skills/openspec-apply/SKILL.md` §6 — the orchestrator relays every
   admissible `DEFERRED:` line verbatim to the user before §7 Review;
   `DEFERRED:` is inadmissible for manual/eyeball-group tasks.
4. `skills/openspec-apply/SKILL.md` §8 — Done report bullet
   `DEFERRED:` entries, verbatim, one line each, alongside `choice:` and
   `ruling:`.

Ruling (critic round 1): deferring a manual/eyeball-group task would
both block §7 Review per the §6 gate and flow through to the Done
report — contradictory. Those groups must end ticked or the run halts,
so all four sites carry the same carve-out.

## Insertions per file

### core/prompts.ts (finding 14)

Replace lines 27-28 of the constant with:

```
"them. You never run git write commands (add, commit, push, stash,",
"checkout, switch, reset, restore, clean) — version control belongs to",
"the user. Never mutate the working tree or refs; compare against",
"committed state with `git show`/`git diff`. Treat Guardrails quoted in",
"your task prompt",
```

The tested phrase "never run git write commands" and all of
tests/prompts.test.ts:168-173 stay valid; the parenthetical merely grows.

### skills/openspec-apply/SKILL.md (findings 1, 3, 5, 7+11, 10c, 10d, 12)

- §4 end (after "Implementers tick their own…"): bullet stating a mid-wave
  user request is first checked against the wave table — the single source
  of execution order (Guardrails) — and remaining `tasks.md` items; a
  covering task is cited, never duplicated by a new dispatch.
- §5: extend the "Guardrail or plan defect → halt and ask the user"
  bullet with an explicit carve-out: a prompt-truncation `BLOCKED:` is the
  orchestrator's defect — re-dispatch the group with a numbered edit list
  of ≤150 lines referencing `file:line`, not inlined spec/transcript text.
- §6: before "After the final wave…", insert the ordering gate: every
  manual/eyeball acceptance group in `tasks.md` is executed with the user
  and confirmed first; no change enters §7 Review with any such group
  unticked. `DEFERRED:` is inadmissible for tasks in those groups — they
  end ticked or the run halts. Phrased as the orchestrator's ordering
  gate so it neither duplicates nor weakens the verifier's `tasks.md`
  consistency check; then the DEFERRED relay (lockstep site 3).
- §7: on `CHANGES-REQUESTED`, before dispatching re-review, run the repo's
  own markdown/lint check over every `openspec/` artifact the fix round
  touched, when the repo has one (conditional mirrors implementer.md's
  "when they exist"), and paste its output into the re-review dispatch.
  Note for the verifier: this repo has no markdown linter — `make check`
  is the closest gate — so in-repo the condition is vacuously satisfiable
  and the scenario passes by absence; do not hunt for a linter.
- §8: DEFERRED report bullet (lockstep site 4); under "Next steps for the
  user" one merged bullet (findings 7+11): branching questions are
  answered by citing the repo's `CONTRIBUTING.md` (or equivalent)
  branch-naming convention, e.g. `feat/<topic>` — creating/renaming
  branches stays the user's job, as do commits; the flow performs no git
  writes. This cites the convention without touching the guardrail.

### skills/openspec-plan/SKILL.md (findings 6, 13)

- §3, before the `ASSUMPTION:` labeling sentence: every question defines
  its terms with a concrete example or an either/or gloss; when the user
  signals non-understanding, in any language, the flow restates the
  question with the gloss before recording an answer as `ASSUMPTION:`.
  Language-agnostic phrasing — no user-language strings quoted.
- §6: "six lines" → "seven lines": `Outcome / Why now / Success /
Constraints / Out of scope / Rejected risks / Established`.
  `Established:` recites up to five decision-relevant research findings
  the user might re-ask, one per line, absences included. The playback
  keeps growing organically from six to seven — a named line, not a new
  section, so the confirmation gate stays one screen.

### agents/openspec-planner.md (findings 2, 4, 8)

- Step 3: a `### Requirement:` under `## MODIFIED` must match the baseline
  header verbatim — the delta merges by header name; a rename goes to
  `## RENAMED Requirements` with `FROM:`/`TO:` pairs (already specced, now
  tied to MODIFIED explicitly).
- Step 5: no conditional-fallback task in place of fixing a header; a
  group dropping a lint suppression or renaming a symbol greps call/test
  sites in that same task and states the expected post-group build result;
  groups inseparable without leaving the tree uncompilable merge into one.
  Distinction kept explicit: merge = compile coupling (writing time),
  serialize = overlapping-file dispatch conflicts (waves time).
- Step 5 self-check: before DONE and before finishing a revise round,
  re-read `tasks.md` against the delta specs — cited scenario names match
  `#### Scenario:` headings verbatim; no contradictory scenario pair.
  Complements (does not replace) the critic's traceability rule.
- Report format (MODE: plan): a passing `openspec validate` certifies
  format, not archive-ability; no claims about CLI archive behavior
  beyond its semantics.

### agents/openspec-critic.md (finding 9)

Editorial rules (change review): new BLOCKING bullet — every count or list
in `proposal.md` (requirements ADDED/MODIFIED, capability names) must match
the actual block count in `specs/**/spec.md`.

### agents/openspec-implementer.md / agents/openspec-verifier.md (findings 10a, 10b)

As defined in the lockstep section; exact DEFERRED string identical across
both files.

## Files touched

`core/prompts.ts`; `skills/openspec-apply/SKILL.md`;
`skills/openspec-plan/SKILL.md`; `agents/openspec-planner.md`;
`agents/openspec-critic.md`; `agents/openspec-implementer.md`;
`agents/openspec-verifier.md`; final re-sync of line citations in this
change's three delta spec files.

## Trade-offs already decided

- The manual-group gate is orchestrator-side ordering (§6), not a new
  verifier check — the verifier's consistency audit stays as specced.
- Branch-naming guidance is a citation of repo convention only; giving
  the orchestrator any git write would weaken the guardrail — rejected.
- Truncation re-dispatch is capped at 150 numbered lines to bound prompt
  growth instead of escalating to a user halt.
