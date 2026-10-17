# Harden flow contracts for retro (batch 2)

## Why now

A retrospective of two finished runs produced sixteen confirmed findings
against the plugin's own prompt texts. The reports showed a contract that
shipped 32/32 tasks and then failed the user's smoke test; a critic verdict
consumed a round reading files a planner revision was still writing; and
planner reports carried claims that could not survive audit — an API-shape
assumption never tested, a "nits applied" line in vocabulary the repo does
not use, a Choices audit the reviewer could not verify because the choices
never reached it, and a composited verification pass nobody could tell apart
from a single-run proof. Each failure is a gap in the flow scripts and role
prompts themselves: the texts permitted the weak behavior. Two post-playback
user pins join the batch: a finished plan session offered the skill id
`/openspec-apply` as a command in its final report — the repo texts name
`/openspec.apply` today but nothing pinned the FORM — and a PR body carried
a "Generated with" promotional footer. All fixes are text-only edits to
`skills/*/SKILL.md`, `agents/*.md`, one appended sentence to the
`SUBAGENT_CONTRACT` constant, the matching docs lines, and one `AGENTS.md`
bullet; no
runtime logic changes, `vendor/` untouched. Landing them before the next run
keeps the flow scripts and role prompts the contract they claim to be. This
batch follows the style precedent of the first retro-hardening change
(archived 2026-10-17): same file layout, verbatim anchors, and a final
citation re-sync group scoped to the MODIFIED requirements only.

## What changes

- **plan flow** (`skills/openspec-plan/SKILL.md`): §4 re-dispatches a
  researcher with a `PROBE:` line for every Unknown a read-only local command
  can answer (`<binary> --help`, a no-arg subcommand that performs no action),
  so no probe-resolvable Unknown survives into the §6 playback; §8 never
  batches a critic with the planner revision whose files it reads — the
  revision must report DONE first — and the three-round exhaustion becomes a
  three-option ask (accept the open findings / one final planner revise plus
  mechanical `openspec_validate` with no further critic / stop), with INVALID
  from a final revise fixed mechanically until VALID, never waived; §9's
  confirmed report includes the current branch read from a read-only
  `git branch --show-current`-style check or "no branch yet" — the flow still
  performs no git writes — and its next-step offers name this plugin's slash
  commands (`/openspec.<name>`), never a skill id, with the upstream
  `openspec` CLI or vendored commands only where the plugin has no
  equivalent.
- **planner role** (`agents/openspec-planner.md`): `MODE: plan` step 6 requires
  an assumption about a command's reply shape or an API's behavior to be
  tested with one read-only local run and quoted `<command> → <output line>`
  inside the single-line `ASSUMPTION:` entry; what cannot be tested keeps the
  `ASSUMPTION:` prefix and adds `(untested — <what would disprove it>)` — the
  grep-able token is unchanged. Step 4 bans hedge words and open-ended file
  lists: design.md and every task name exact paths, and an unpinned file is
  reported as an open question for the orchestrator. The report format gains a
  revise-round rule — each BLOCKING finding claimed fixed quotes its post-fix
  line verbatim, and only BLOCKING/NON-BLOCKING vocabulary exists. `MODE:
waves` gains a serialization rule (defining group before consuming group
  whenever the alternative is a temporary stub or lint suppression in another
  group's file) and each wave-table row lists its groups' exact file paths.
- **researcher role** (`agents/openspec-researcher.md`): before listing an
  Unknown, run the read-only local probe; probe-answered questions return as
  `PROBE:` answers, not as must-ask-user Unknowns. When two sources disagree
  about an interface (local `--help` vs docs or CHANGELOG), quote both verbatim
  and name the conflict — never collapse one source into the definitive set.
- **apply flow** (`skills/openspec-apply/SKILL.md`): §3 restates the wave rules
  briefly and points at the planner's `MODE: waves` rules as source of truth;
  §4 gives each implementer the full wave table including each group's assigned
  files (not just its row); after the final wave and before §7 Review the
  orchestrator (or a designated dispatch) performs the post-final-wave full
  check suite run once and cites it in the review payload; §7's
  `REVIEW FOCUS:` block carries
  the verbatim `Choices:` report lines of every wave implementer; §8 counts
  `PASS (composited)` as a pass and relays every `NO-REGRESSION-TEST:` line
  verbatim; §8's next-step offers follow the same command-form clause as
  plan §9, word-for-word.
- **implementer role** (`agents/openspec-implementer.md`): the checks rule is
  rewritten — full suite when the sole implementer of its wave, otherwise
  suite scoped to the group's files with the scope stated in Evidence and the
  full run deferred to the apply flow's post-final-wave full check suite run;
  "the §6 gate" becomes
  the descriptive "the apply flow's manual/eyeball acceptance gate" — no
  filesystem path, since roles ship from the plugin package and target
  projects do not carry it.
- **verifier role** (`agents/openspec-verifier.md`): composited proof is legal
  but labeled — Scenarios lines allow `PASS (composited): <run A> + <run B>`,
  Status counts composited passes as passes, and a new `NO-REGRESSION-TEST:`
  bullet lists one line per scenario proven only by composition or manual
  check; a deferral missing any part — task id, reason, or user action — is
  itself a defect; the §6-gate phrase becomes the same descriptive wording.
- **subagent contract** (`core/prompts.ts`, `SUBAGENT_CONTRACT` text only):
  append the sentence "Write every report in English, regardless of the
  session's reply language." The tested phrase "never run git write commands"
  stays intact (`tests/prompts.test.ts:168-173` must pass unmodified).
- **docs** (`docs/agents.md`): the researcher, implementer, and reviewer
  paragraphs sync to the new probe answers, scoped-checks rule, and Choices
  payload.
- **repo guide** (`AGENTS.md`): one new Conventions bullet — never add
  promotional footers or badges ("Generated with X", "Powered by X", promo
  links) to PR bodies, issue bodies, commit messages, or any other
  outward-facing text, in this repo or elsewhere; factual provenance lines
  are not ads. Landed as its own group because AGENTS.md governs agent
  output in this repo while plugin roles never create PRs (their git-write
  ban already covers that).

Line-number citations inside the MODIFIED requirements are re-synced to the
final file state as part of this change; baseline specs under `openspec/specs/`
keep their own wording, and citations outside the MODIFIED requirements are
untouched.

## Impact on capabilities

Six delta requirements, all MODIFIED (2+3+1, unchanged), covering the
sixteen findings and both post-playback pins:

- `orchestration-flows`: 2 MODIFIED (plan-flow research probe, critique-loop
  ordering and escalation, branch and command-offer clauses; apply-flow wave
  payloads, full-suite gate, Choices relay, composited counting, command-offer
  clause). The command-offer rule is observable final-report behavior, so it
  is folded as one clause and one new scenario into each already-MODIFIED
  requirement — no new MODIFIED.
- `agent-role-contracts`: 3 MODIFIED (researcher probe and source-conflict
  rules; implementer scoped checks and descriptive gate phrase; verifier
  composited PASS, `NO-REGRESSION-TEST:`, and the any-part deferral rule with
  its corrected scenario).
- `subagent-execution-policy`: 1 MODIFIED (contract content block — the fixed
  enumeration gains the English-report sentence).
- The `AGENTS.md` promo-footer bullet gets no delta requirement: AGENTS.md is
  repo-guide text outside the plugin capability surface, and plugin roles
  never create PRs anyway.
- No other capability is touched. `role-registration` and `skill-registration`
  are unaffected: no new roles or skills, only prompt text edits.

## Out of scope

- Plugin code behavior beyond prompt text: no runtime logic, hooks,
  registration, or `vendor/` changes.
- Baseline specs under `openspec/specs/` — they sync at archive time; this
  change edits only its own delta files' citations.
- Consumer projects — plugin-side texts only.
- Replacing line-number citations with section anchors.

ASSUMPTION: skills/openspec-init critique loop (~:66-68) is deliberately NOT
mirrored for P2/P3; listed as follow-up, not changed.
ASSUMPTION: orchestrator-session reports (plan §9, apply §8) are outside
P16's language pin — SUBAGENT_CONTRACT covers role sessions only.
ASSUMPTION: except for the verbatim-locked insertions (the contract sentence,
the any-part deferral line, the gate replacement phrase, the command-offer
clause), the exact English wording of each insertion is the implementer's
choice within the confirmed constraints, matching surrounding file style.
ASSUMPTION: the vendor-sync workflow body's "Generated by the daily
`vendor-sync` workflow" line is factual provenance, not promotion — kept, no
task.

## Rejected findings

Clauses the grounded grill removed from the accepted set:

- "Plan divergence:" added to the reviewer input — rejected as a
  role-contract expansion with no evidence of need; only `Choices:` lines join
  the `REVIEW FOCUS:` block.
- A filesystem-path citation in the §6-gate replacement phrase — rejected as
  unresolvable in user repos; the replacement is descriptive text with no
  path and no section number.
- Literal "nit", "reconcile group", and a new `ASSUMPTION (untested):` token
  form — rejected as absent from, or conflicting with, repo vocabulary; the
  `ASSUMPTION:` prefix survives unchanged at all grep sites and untested
  items stay `(untested — ...)` suffixes inside the single line.

## Rejected risks

REJECTED-RISK: plan↔init critique-loop wording divergence remains (P2/P3
apply to plan only) — the findings scoped plan; init deferred as follow-up.
REJECTED-RISK: P7-lite leaves §5 mini-wave re-dispatch without a
removal-task obligation — an explicit exception ban would conflict with the
legitimate §5 protocol.
