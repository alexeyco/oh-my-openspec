# Design — harden-flow-contracts-for-retro

## Approach

Text-only edits to nine files plus this change's own delta specs. Each edit
is anchored to verbatim current text (quoted in `tasks.md`) so the implementer
greps real content instead of trusting line numbers; line numbers shift as
insertions land and are recomputed once, in the final re-sync group. No
runtime logic, no `vendor/`, no baseline-spec edits.

Files to touch:

- `skills/openspec-plan/SKILL.md` — findings P1 (§4 probe re-dispatch), P2
  (§8 wait-for-DONE), P3 (§8 three-option escalation), P4 (§9 branch report),
  A1 (§9 command-offer clause, folded into task 1.4's same-bullet edit).
- `agents/openspec-planner.md` — P5 (step 6 tested assumptions), P6 (step 4
  exact paths), P7 (report revise-quote rule), P8 (waves rules + report rows).
- `agents/openspec-researcher.md` — P1b (probe-answered Unknowns), P9
  (conflicting interface sources).
- `skills/openspec-apply/SKILL.md` — P8 restatement (§3), P10 (§7 Choices in
  `REVIEW FOCUS:`), P11 (§4 full wave table), P12 (§8 composited count +
  `NO-REGRESSION-TEST:` relay), P13 (§6-end full-suite check), A2 (§8
  command-offer clause).
- `agents/openspec-verifier.md` — P12 (composited PASS, `NO-REGRESSION-TEST:`
  bullet, Status disambiguation), P14 (any-part deferral), P15 (gate phrase).
- `agents/openspec-implementer.md` — P13 (scoped-vs-full checks rewrite), P15
  (gate phrase).
- `core/prompts.ts` — P16 (`SUBAGENT_CONTRACT` appended sentence, array text
  only).
- `docs/agents.md` — :55-56 (researcher probe answers), :94 (implementer
  scoped checks), :107-109 (reviewer Choices payload). All docs edits live in
  one task group so a single implementer owns the file.
- `AGENTS.md` — B (promo-footer ban bullet appended to `## Conventions`);
  sole file of new group 6.

## Decided trade-offs

**Delta scope.** Only behaviors already codified in baseline requirements get
MODIFIED requirements. The flow-visible items are specified where the flows
see them: P1 (probe-resolved playback), P2 (DONE-ordered critique), and P4
(branch naming in the confirmed report) live in the MODIFIED plan-flow
requirement; P8b (file-listed wave rows) lives in the MODIFIED apply-flow
requirement, where the implementer payload that carries them is codified.
P5–P7 get no MODIFIED requirement: they refine how the planner writes
proposal `ASSUMPTION:` entries, design/task paths, and revise-round reports,
and that output travels through paper channels the flows already consume
verbatim — the §9 approval relays every `ASSUMPTION:` line
(skills/openspec-plan/SKILL.md:126-127) and the critic audits the same
artifacts editorially — so they harden the evidence quality of existing
channels without adding a new observable requirement; they are pinned
instead by the verbatim anchors of `tasks.md` group 1. P8a extends the
planner's `MODE: waves` rules, which the §3 restatement names as the source
of truth; the baseline planner requirement's cited text
(`agents/openspec-planner.md:36-43,90-92`) is kept unedited — its line
numbers may still shift because tasks 1.5-1.7 insert above those ranges;
positions re-sync at archive time; 5.1 leaves baseline `openspec/specs/**`
citations untouched, and the quoted content itself is not edited (per
the citation policy in proposal.md:103-106). This
matches the confirmed six-requirement scope; inventing a seventh planner
delta would restate prompt steps the critic already checks editorially.

**Token stability.** `ASSUMPTION:` stays the exact greppable prefix at every
consumer site (`agents/openspec-planner.md:48-49`, `agents/openspec-critic.md:35,62`,
`skills/openspec-plan/SKILL.md:126`): the untested marker is a suffix inside
the single line — `ASSUMPTION: <text> (untested — <disprover>)` — never a new
token form. New tokens introduced: `PROBE:` (research answers),
`NO-REGRESSION-TEST:` (verifier bullet), and the enum value
`PASS (composited): <run A> + <run B>`; each follows the existing
`ASSUMPTION:`/`REJECTED-RISK:`/`DEFERRED:` single-line style. Banned strings:
"nit", "reconcile group", "ownership exception", "removal task",
"Plan divergence:".

**Wave-contract interplay.** P8b (wave rows list each group's exact files) is
the enabler: P11 can only put "the full wave table, including each group's
assigned files" into implementer payloads because rows now carry paths; P13's
implementer scoping (suite limited to the group's files when sharing a wave)
is safe only because that assignment is visible to the implementer and the
flow. The full-suite deferral therefore appears twice, as two halves of one
rule: deferred in `agents/openspec-implementer.md`, executed post-final-wave
in `skills/openspec-apply/SKILL.md` §6/§7 boundary. Both texts must name the
same thing — "the post-final-wave full check suite run" — in the re-sync review.

**Command-offer form (A, post-playback pin).** A finished plan session offered
`/openspec-apply <change-id>` — a skill id — as a command; the repo texts are
correct today (plan §9 cites `/openspec.apply`, apply §8 cites
`/openspec.archive`) but pin content, not form. The fix is one verbatim-locked
clause, identical in `skills/openspec-plan/SKILL.md` §9 and
`skills/openspec-apply/SKILL.md` §8: plugin slash commands for actions the
plugin covers, no skill id ever offered as a command, upstream `openspec` CLI
or vendored `/openspec-<name>` commands only where no plugin equivalent
exists. Word-for-word identity is checked in 5.2. A1 extends task 1.4 rather
than adding a competing task: both clauses land in the same §9 bullet, one
anchor, one edit pass. The rule is observable final-report behavior, so the
delta folds a clause plus one scenario into each already-MODIFIED
plan-flow/apply-flow requirement — MODIFIED counts stay 2+3+1. No docs edit:
the slash-commands baseline enumeration (docs/agents.md:18, README.md:113) is
already correct.

**Promo-footer ban (B, post-playback pin).** A PR body gained a "Generated
with" footer. Landing site is `AGENTS.md` — the only text governing agent
output in this repo — not `SUBAGENT_CONTRACT`: plugin roles never create PRs
(their git-write ban already covers that) and the ban must also reach
orchestrator sessions. It gets its own group 6 rather than extending group 2:
group 2's docs sync is serialized behind group 3 (task 2.4 mirrors the landed
task 3.10 text), and this bullet has no such dependency — a new group keeps it
free to land in any wave, with AGENTS.md solely owned. No delta requirement:
AGENTS.md is repo-guide text outside the plugin capability surface. The
vendor-sync body line "Generated by the daily `vendor-sync` workflow" is
factual provenance, not promotion — kept, no task.

**§6-gate phrase (P15).** Role files replace "the §6 gate" with "the apply
flow's manual/eyeball acceptance gate": roles ship from the plugin package,
target repos do not contain the flow skill at any stable path, and no
`agents/*.md` precedent exists for filesystem references. Baseline specs keep
their own §6 wording — it describes the orchestrator-side flow skill, where
the section number genuinely exists; the MODIFIED delta requirements state
that the role prompts use the descriptive phrase.

**P3 vs the never-waived INVALID rule.** The three-option ask replaces
accept-or-stop; option two (final revise + mechanical validate) ends with
`openspec_validate` output, so the existing "Mechanical INVALID lines ...
never waived" bullet would otherwise be contradicted at loop end. The added
sentence makes the final revise subject to the same rule: INVALID is fixed
mechanically and re-validated until VALID; only the _editorial_ open findings
are acceptable by user choice.

**P4 reporting only.** The branch line is a report field, not a precondition:
adding branch state to §1 would imply the flow manages branches, while
`skills/openspec-plan/SKILL.md:10-11` and the Guardrails keep all git writes
with the user. Read-only `git branch --show-current` output is evidence, same
class as `git diff --stat` in the apply report.

## Data shapes

- Contract append: one new string element in the `SUBAGENT_CONTRACT` array
  after the final "refactors." entry, before `].join("\n");`; regex tests at
  `tests/prompts.test.ts:168-173` pin only existing phrases and pass
  unmodified.
- Wave-table row extension: `Wave <n>: <group ids> — files: <paths>` inside
  the fenced report block of the planner's `MODE: waves` output; the
  serialization-reason column keeps its current form.
- Verifier Scenarios line grammar:
  `<capability>/<requirement> :: <scenario> — PASS | PASS (composited): <run A> + <run B> | FAIL: <evidence or missing behavior>`.

## Citation re-sync

The last group recomputes every `path:line` citation inside this change's
three delta spec files against the final texts (MODIFIED requirements only,
same scoping as the archived batch 6.x tasks), then runs `make fmt` +
`make check` + `openspec validate` for this change.
