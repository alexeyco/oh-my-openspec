# Tasks — harden-flow-contracts-for-retro

## 1. Subagent contract (core/prompts.ts)

- [x] 1.1 Replace the git clause in `SUBAGENT_CONTRACT` (core/prompts.ts:27-28)
      with the locked text from design.md: enumeration extended to (add,
      commit, push, stash, checkout, switch, reset, restore, clean) plus
      "Never mutate the working tree or refs; compare against committed state
      with `git show`/`git diff`." Keep the phrase "never run git write
      commands" verbatim.
- [x] 1.2 Run `npm test` and confirm tests/prompts.test.ts:168-173 passes
      unmodified; adjust nothing in the test file.

## 2. Apply flow skill (skills/openspec-apply/SKILL.md)

- [x] 2.1 §4 end: add the mid-wave dedup rule — a user request arriving
      mid-wave is first checked against the wave table (citing the existing
      guardrail, not restating it) and remaining `tasks.md` items; a covering
      task is cited, never duplicated by a new dispatch.
- [x] 2.2 §5: add the prompt-truncation carve-out to the "Guardrail or
      plan defect → halt and ask the user" bullet: truncation `BLOCKED:` is
      the orchestrator's defect — re-dispatch with a numbered edit list of
      ≤150 lines referencing `file:line`, not inlined spec/transcript text.
- [x] 2.3 §6: before "After the final wave…", insert the manual/eyeball
      gate (ANY unticked manual group blocks §7 Review; run it with the user
      and record confirmation) as the orchestrator's ordering rule, distinct
      from the verifier's `tasks.md` consistency check; state that
      `DEFERRED:` is inadmissible for tasks in those groups — they end
      ticked or the run halts (lockstep carve-out from design.md).
- [x] 2.4 §6: add the DEFERRED relay — every implementer `DEFERRED:` line
      is relayed verbatim to the user before §7 Review starts (lockstep
      wording from design.md).
- [x] 2.5 §7: on `CHANGES-REQUESTED`, before dispatching the re-review,
      run the repo's own markdown/lint check over every `openspec/` artifact
      the fix round touched, when the repo has one, and paste its output into
      the re-review dispatch.
- [x] 2.6 §8: add the `DEFERRED:` report bullet (verbatim, one line each,
      alongside `choice:`/`ruling:`) and the merged branch-convention bullet
      under "Next steps": cite the repo's `CONTRIBUTING.md` branch-naming
      convention on branching questions; branch creation, renaming, and
      commits stay the user's — the flow performs no git writes.

## 3. Plan flow skill (skills/openspec-plan/SKILL.md)

- [x] 3.1 §3: before the `ASSUMPTION:` sentence, add the gloss rule —
      every question defines its terms with a concrete example or either/or
      gloss; on any signal of non-understanding (in any language) restate the
      question with the gloss before recording the answer as `ASSUMPTION:`.
- [x] 3.2 §6: change the playback to seven lines, adding `Established:` —
      up to five decision-relevant research findings, one per line, absences
      included (e.g. "X exposes no theme API").

## 4. Planner role (agents/openspec-planner.md)

- [x] 4.1 MODE: plan step 3: a `### Requirement:` under `## MODIFIED`
      must match the baseline header verbatim (the delta merges by header
      name); renames go to `## RENAMED Requirements` with `FROM:`/`TO:` pairs.
- [x] 4.2 MODE: plan step 5: forbid conditional-fallback tasks in place of
      a header fix; require lint-suppression-removal and symbol-rename groups
      to grep call/test sites in the same task and state the expected
      post-group build result; merge groups inseparable without leaving the
      tree uncompilable — keep merge (compile coupling) distinct from waves
      serialization (dispatch conflicts) in wording.
- [x] 4.3 MODE: plan step 5: pre-DONE / pre-finish-revise self-check —
      re-read `tasks.md` against the delta specs; every cited scenario name
      matches a `#### Scenario:` heading verbatim; no two scenarios assert
      contradictory output.
- [x] 4.4 MODE: plan report format: a passing `openspec validate` certifies
      format only, not archive-ability; no claims about CLI archive
      behavior beyond its semantics. Covers the delta scenario
      "Planner report disclaims archive-readiness".

## 5. Critic, implementer, and verifier roles

- [x] 5.1 agents/openspec-critic.md editorial rules (change review): add
      the BLOCKING consistency bullet — every count or list in `proposal.md`
      matches the actual block count in `specs/**/spec.md`.
- [x] 5.2 agents/openspec-implementer.md report format: define
      `DEFERRED: <task-id> — <reason> — <user action>` as the only legal way
      to leave a spec-mapped task unticked; admissible only when completion
      needs actions or authority outside the implementer's remit (user
      request, external resource); never for tasks in manual/eyeball
      acceptance groups (§6 gate runs those with the user — ticked or
      halt); otherwise `BLOCKED`.
- [x] 5.3 agents/openspec-verifier.md tasks cross-check: a well-formed
      `DEFERRED:` line legitimizes the unticked task (not a done-but-unticked
      mismatch); a deferral missing reason or user action is itself a
      defect, and so is any deferral on a manual/eyeball-group task. Use
      the exact line format locked in design.md.

## 6. Reconcile, re-sync, and check

- [x] 6.1 Diff-review all seven edited files for terminology drift
      (DEFERRED line format identical at all four sites; truncation wording
      consistent between §5 and the contract; no weakened git guardrails).
- [x] 6.2 Re-sync every line-number citation in this change's three delta
      spec files against the finished files. The plan-flow and planner
      requirement citations are provisional estimates — recompute them
      from the final text (the apply-flow ranges were sanity-checked but
      re-verify those too); no stale or wrong range remains.
- [x] 6.3 Run `make fmt` over the touched files, then `make check` —
      scripts/check.mjs, sync-vendor --check, typecheck, and npm test must
      all pass; `assets.test.ts` role/tool references in both edited SKILLs
      stay intact.
- [x] 6.4 Run `openspec validate` on this change and confirm VALID.
