# Design

## Approach

Keep OpenSpec as the source of truth. Add scenario verification fields to the existing planning guidance and make the verifier report the actual evidence. Extend the plan coverage map with a risk applicability pass and persist it in a concise `Risk review` section in `proposal.md`; require scenario outcomes to be atomic, observable, and independent of implementation details. Update apply so an implementer or reviewer can identify a genuine contract mismatch, return it to planning, and continue only after the user approves any change to agreed scope or behavior. Broaden retrospective evidence analysis to cover repeated workflow friction and verification gaps, using only the finished run's evidence bundle and preserving the existing bounded finding format.

## Files to change

- `skills/omos-plan/SKILL.md` — risk applicability prompts and plan revision handoff.
- `skills/omos-apply/SKILL.md` — approved contract-revision loop and verification evidence requirements.
- `agents/omos-planner.md` — scenario quality, verification map, and revised-plan responsibilities.
- `agents/omos-critic.md` — checks for scenario quality, risk applicability, and complete verification mapping.
- `agents/omos-implementer.md` — report discoveries that conflict with the plan without silently widening scope.
- `agents/omos-verifier.md` — report method and concrete evidence for every scenario.
- `agents/omos-reviewer.md` — check revised artifacts and implementation against the approved contract.
- `skills/omos-retro/SKILL.md` — include process-quality evidence in the retrospective bundle.
- `agents/omos-retrospector.md` — analyze prompt defects and process findings from the evidence bundle.
- `docs/agents.md` — describe the updated role responsibilities.

## Decisions

- Keep the mapping within `tasks.md` and the verifier report; do not introduce another artifact.
- Risk topics are prompts to assess for applicability, not mandatory requirements for every change.
- The proposal's `Risk review` lists each risk area as Applicable, Out of scope, or Unresolved; an Applicable area carries its constraint or acceptance scenario.
- A plan revision that changes behavior, scope, or acceptance criteria pauses implementation until the user approves the revised playback. A clarification that preserves the existing contract is reported and revalidated without asking for scope approval.
- Preserve manual and composited verification as valid evidence, but label it explicitly and identify the actions and observed result. Do not represent it as an automated regression test.
- A scenario is useful when it states one behavior and an observable outcome, avoids implementation-specific steps unless those are contractual, and covers important negative or boundary cases where applicable.
- Retrospective process findings are limited to observable run evidence: repeated `BLOCKED:` or `FAIL`, re-dispatches or extra rounds, plan divergences, and verification gaps. Prompt and process findings share the existing maximum of eight; every finding needs a decisive verbatim evidence quote and an actionable fix. Hypothetical costs are excluded.
