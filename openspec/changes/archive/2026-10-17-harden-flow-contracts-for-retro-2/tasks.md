# Tasks — harden-flow-contracts-for-retro

Every insertion or replacement below must first locate the quoted anchor
text in the named file: match it verbatim where it fits one line, and
otherwise match a distinctive sub-line fragment or reflow-normalized text —
source files soft-wrap, so a whole wrapped sentence may not grep as written.
Line numbers are current-state hints only and shift as edits land. Wording
follows design.md's constraints; the verbatim-locked strings are the contract
sentence (4.1), the any-part deferral line (3.8), the gate replacement
phrase (3.9, 3.11), and the command-offer clause (1.4, 3.12). Banned
additions: "nit", "reconcile group", "ownership exception", "removal task",
"Plan divergence:", a filesystem path in
`agents/*.md`, and any new token form replacing the `ASSUMPTION:` prefix.

## 1. Plan flow skill and planner role

- [x] 1.1 skills/openspec-plan/SKILL.md §4 — insert after the sentence
      "Dispatch `openspec-researcher` subagents in parallel — one per unknown
      area (codebase region, existing capability, conventions). Wait for every
      report." (:56-57), before "Feed facts into the next steps": every Unknown
      a read-only local command can answer (`<binary> --help`, a no-arg
      subcommand **that performs no action**) is re-dispatched to a researcher
      with a `PROBE:` line; no probe-resolvable Unknown survives into the §6
      playback. Covers delta scenario "Probe-resolvable unknown never reaches
      the playback".
- [x] 1.2 skills/openspec-plan/SKILL.md §8 — insert a new bullet after
      "- `NEEDS-FIX` → dispatch `openspec-planner` with the exact BLOCKING list
      to revise; repeat." (:106-107): wait for the planner revision to report
      DONE (the role's Status line) before dispatching the next critic; never
      batch a critic with the revision whose files it reads. Covers scenario
      "Critic waits for the revision to report DONE".
- [x] 1.3 skills/openspec-plan/SKILL.md §8 — replace "After 3 rounds still
      `NEEDS-FIX` → present the open findings to the user and ask whether to
      accept or stop." (:108-109) with the three-option ask: accept them, run
      one final planner revise plus mechanical `openspec_validate` with no
      further critic, or stop; add that a final revise ending with INVALID
      output is fixed mechanically and re-validated until VALID — never waived,
      consistent with the next bullet "Mechanical INVALID lines from the critic
      are always fixed first, never waived by you." (:110-111). Covers
      scenarios "Critique loop is bounded at three rounds" and "Final revise
      never waives INVALID".
- [x] 1.4 skills/openspec-plan/SKILL.md §9 — extend "- Confirmed → final
      report: files, gate output, next step `/openspec.apply <change-id>`."
      (:119-120) with a current-branch line reported from a read-only
      `git branch --show-current`-style check, or "no branch yet"; reporting
      only — no §1 precondition, no branch creation (consistent with :10-11 and
      Guardrails :125-127); then append to the same bullet the verbatim-locked
      command-offer clause, shared word-for-word with task 3.12: "Offered
      commands are this plugin's slash commands (`/openspec.<name>`) whenever
      one exists for the action; a skill id is never offered as a command; the
      upstream `openspec` CLI or a vendored `/openspec-<name>` command is
      offered only where the plugin has no equivalent." Covers delta scenarios
      "Confirmed report names the branch read-only" and "Next-step offers name
      the plugin's slash commands".
- [x] 1.5 agents/openspec-planner.md MODE: plan step 6 — after "6. Label
      anything you inferred without user confirmation as `ASSUMPTION:` and every
      risk the user dismissed during the grill as `REJECTED-RISK:` — both as
      single lines inside `proposal.md`." (:44-46), add: an assumption about a
      command's reply shape or an API's behavior must first be tested with one
      read-only local run, quoted `<command> → <output line>` inside the
      single-line `ASSUMPTION:` entry; what cannot be tested keeps the
      `ASSUMPTION:` prefix and adds `(untested — <what would disprove it>)`.
      The literal prefix `ASSUMPTION:` must survive unchanged — consumers grep
      it at agents/openspec-planner.md:48-49, agents/openspec-critic.md:35,62,
      and skills/openspec-plan/SKILL.md:115; no `ASSUMPTION (untested):` token.
- [x] 1.6 agents/openspec-planner.md MODE: plan step 4 — extend "4. `design.md`
      — approach, files to touch, data shapes, trade-offs that were decided.
      Omit when the change is trivial." (:27-28): design.md and every task name
      exact paths; hedge words ("possibly", "or maybe") and open-ended file
      lists are banned; an unpinned file is reported as an open question in the
      role report for the orchestrator to resolve by research or interview
      before finalizing (the planner cannot dispatch research itself).
- [x] 1.7 agents/openspec-planner.md report format — extend "Report format:
      change id; files written with one-line summaries; every `ASSUMPTION:` and
      `REJECTED-RISK:` repeated; ..." (:48-49) with the revise-round rule: for
      each BLOCKING finding claimed fixed, quote the post-fix line verbatim in
      the report; an item is reported fixed only with that quote. Vocabulary is
      BLOCKING/NON-BLOCKING only — the word "nit" appears nowhere; revise
      dispatches carry BLOCKING findings only, per plan SKILL §8.
- [x] 1.8 agents/openspec-planner.md MODE: waves — (a) in Rules, after "-
      Uncertain overlap → serialize and note `conservative`." (:93), add:
      sequence a defining group before its consuming group whenever the
      alternative is a temporary stub or lint suppression in another group's
      file; keep the existing merge-vs-serialize distinction (:39-43) intact
      and introduce no new terms. (b) Extend the fenced report block
      ("Wave 1: <group ids> ... Unassigned: <group id> — <reason>", :97-102)
      so each row lists each group's exact file paths — e.g. `Wave <n>:
<group ids> — files: <paths>` — so scheduling sees overlap and dispatch
      payloads can carry it.

## 2. Researcher role and docs sync

- [x] 2.1 agents/openspec-researcher.md — extend the Gather bullet "- Unknowns:
      what could not be determined from the repo, each phrased as one concrete
      question." (:20-21): before listing an Unknown, run the read-only local
      probe (`<binary> --help`, a no-arg subcommand that performs no action);
      probe-answered questions return as `PROBE: <question> → <output line>`
      answers, not Unknowns, and the report line "- Unknowns: numbered
      questions the orchestrator must ask the user." (:28) counts only
      questions a probe could not resolve. Covers delta scenarios "Probe
      answers a locally resolvable unknown".
- [x] 2.2 agents/openspec-researcher.md — append to the same Unknowns bullet:
      when two sources disagree about an interface (local `--help` vs docs or
      CHANGELOG), quote both verbatim and name the conflict; never collapse one
      source into the definitive set. Covers scenario "Conflicting interface
      sources are both quoted".
- [x] 2.3 docs/agents.md — sync the researcher paragraph "Explores the
      repository ... Read-only. Unknowns come back as numbered questions for
      the next interview round." (:53-56) to mention `PROBE:` answers and that
      only unresolvable questions reach the interview round.
- [x] 2.4 docs/agents.md — sync the implementer paragraph fragment "it ticks
      only its own `- [ ]` boxes, runs the project's full checks, and reports
      DONE/BLOCKED" (:93-94) to the scoped-vs-full rule from task 3.10.
- [x] 2.5 docs/agents.md — sync the reviewer paragraph "Critiques the
      cumulative diff against proposal, spec delta, and design: ... and the
      implementers' `Choices:` lines." (:107-109) to state the `Choices:` lines
      arrive in the `REVIEW FOCUS:` payload; add nothing about plan divergences.

## 3. Apply flow skill, verifier, and implementer roles

- [x] 3.1 skills/openspec-apply/SKILL.md §3 — extend "It returns ordered waves
      of task groups (groups run in parallel within a wave; overlapping files
      serialize groups into later waves; conservative choices on uncertainty)."
      (:34-37): briefly add that each wave-table row lists its groups' exact
      file paths and that the planner's `MODE: waves` rules are the source of
      truth. Brief restatement only — do not duplicate the planner rules.
- [x] 3.2 skills/openspec-apply/SKILL.md §4 — replace "and the wave table row
      it belongs to" (:50) with "and the full wave table, including each
      group's assigned files". Covers scenario "Implementer payload carries the
      full wave table".
- [x] 3.3 skills/openspec-apply/SKILL.md §6 — insert a new final bullet/
      paragraph after "- Relay every implementer `DEFERRED:` line (`DEFERRED:
<task-id> — <reason> — <user action>`) verbatim to the user before §7
      Review starts; a deferral naming a task in a manual/eyeball group halts
      at the gate above instead of being relayed." (:90-93): after the final
      wave, before §7 Review, the orchestrator (or a designated dispatch)
      performs the post-final-wave full check suite run once and cites its
      output in the reviewer payload; implementer-scoped runs do not replace
      it. Covers scenario "Post-final-wave full check suite run precedes
      Review".
- [x] 3.4 skills/openspec-apply/SKILL.md §7 — extend "Dispatch
      `openspec-reviewer` over the cumulative diff (`git diff --stat` + full
      diff) with a `REVIEW FOCUS:` block: the riskiest hunks from the wave
      table and verifier notes." (:97-99): plus the verbatim `Choices:` report
      lines of every wave implementer (including `Choices: none`);
      Choices-only — do not add "Plan divergence:". Covers scenario "Reviewer
      sees every implementer choice".
- [x] 3.5 skills/openspec-apply/SKILL.md §8 — replace "- Verification summary:
      scenarios PASS count / total, gate VALID." (:120): composited passes
      (`PASS (composited)`) count as passes, and add a bullet relaying every
      verifier `NO-REGRESSION-TEST:` line verbatim. Covers scenario "Composited
      passes counted and relayed".
- [x] 3.6 agents/openspec-verifier.md — extend "- Record per scenario: `PASS`
      or `FAIL` with the decisive command and its key output line — fresh-run
      evidence, not a cached or remembered result." (:15-16): one decisive run
      is preferred; composition of several runs is legal only when labeled
      `PASS (composited): <run A> + <run B>`.
- [x] 3.7 agents/openspec-verifier.md report format — replace "- Scenarios:
      one line each — `<capability>/<requirement> :: <scenario> — PASS | FAIL:
<evidence or missing behavior>`." (:33) allowing the values
      `PASS | PASS (composited): <run A> + <run B> | FAIL`; add a new bullet
      after it — "NO-REGRESSION-TEST: one line per scenario proven only by
      composition or manual check, `<capability>/<requirement> :: <scenario> —
<how it was proven>` (or `none`)"; disambiguate "- Status: PASS (all
      scenarios pass, gate VALID) or FAIL with the blocking scenario ids."
      (:37-38) so composited passes count as passes. Covers scenarios
      "Composited proof is labeled" and "Composited passes count toward the
      status".
- [x] 3.8 agents/openspec-verifier.md — replace "A deferral missing its reason
      or user action is itself a defect, and so" (:26) with "A deferral missing
      any part — task id, reason, or user action — is itself a defect, and so".
      The contradicting baseline scenario "Well-formed deferrals pass the tasks
      check" is corrected in this change's delta (MODIFIED verifier requirement);
      baseline files under `openspec/specs/` are not edited here.
- [x] 3.9 agents/openspec-verifier.md — replace the line-wrapped "the §6" /
      "gate" (:27-28) with "the apply flow's manual/eyeball acceptance gate";
      no filesystem path, no flow section number in role files.
- [x] 3.10 agents/openspec-implementer.md — rewrite (not append) "- Run the
      project's checks (tests, lint, typecheck) when they exist — evidence must
      come from a full run, not a cherry-picked subset." (:18-19): full-suite
      run when the implementer is the sole implementer of its wave; otherwise
      the suite scoped to the group's files, the scope stated in Evidence and
      the full run deferred to the apply flow's post-final-wave full check
      suite run. Covers
      scenario "Wave-sharing implementers scope their checks".
- [x] 3.11 agents/openspec-implementer.md — replace "— the §6 gate" (:37) with
      "— the apply flow's manual/eyeball acceptance gate"; no filesystem path.
- [x] 3.12 skills/openspec-apply/SKILL.md §8 — append the verbatim-locked
      command-offer clause (word-for-word identical to task 1.4: "Offered
      commands are this plugin's slash commands (`/openspec.<name>`) whenever
      one exists for the action; a skill id is never offered as a command; the
      upstream `openspec` CLI or a vendored `/openspec-<name>` command is
      offered only where the plugin has no equivalent.") to the next-steps
      bullet "- Next steps for the user, in their hands: review the diff,
      commit, then archive with `/openspec.archive <change-id>`." (:122-123).
      The command texts stay as written — the clause pins the FORM, matching
      the slash-commands baseline (five `/openspec.*` commands;
      docs/agents.md:18 and README.md:113 already list them correctly; no docs
      edit). Covers delta scenario "Done report next steps name plugin slash
      commands".

## 4. Core contract

- [x] 4.1 core/prompts.ts — append one string element to the `SUBAGENT_CONTRACT`
      array after the final entry `"refactors.",` (:35), before `].join("\n");`
      (:36): "Write every report in English, regardless of the session's reply
      language." Change no other array text; the phrase "never run git write
      commands" stays verbatim.
- [x] 4.2 Run `npm test` and confirm tests/prompts.test.ts:168-173 (regexes for
      `never run git write commands`, `openspec/`, `UNVERIFIED`,
      `BLOCKED: <reason>`) passes unmodified; adjust nothing in the test file.
- [x] 4.3 Check the appended sentence matches the subagent-execution-policy
      delta's "in order" enumeration and the new scenario "Report language is
      pinned"; adjust the delta, not the constant, if they diverge.

## 5. Re-sync, sweep, and check

- [x] 5.1 Re-sync every `path:line` citation in this change's three delta spec
      files (MODIFIED requirements and their scenarios only) against the final
      texts of `skills/`, `agents/`, `core/`, `docs/agents.md`; no stale or
      wrong range remains. Baseline specs keep their own citations and wording,
      including their existing §6 references.
- [x] 5.2 Terminology drift review across all edited files: `PROBE:`,
      `NO-REGRESSION-TEST:`, and `PASS (composited)` consistent between plan
      SKILL §4, the researcher, the verifier, apply §6/§8; the post-final-wave
      full check suite run named identically in apply §6, the implementer
      rule, and both delta specs; the `ASSUMPTION:` prefix intact at every
      grep site; no banned strings added ("nit", "reconcile group",
      "ownership exception", "removal task", "Plan divergence:"); no
      filesystem path introduced in `agents/*.md`; no weakened git
      guardrail; the command-offer clause word-for-word identical between
      plan §9 and apply §8, and no edited file offers a skill id as a
      command.
- [x] 5.3 Run `make fmt` over the touched files, then `make check` — typecheck
      and `npm test` must all pass; `assets.test.ts` role/tool references in
      both edited SKILLs stay intact.
- [x] 5.4 Run `openspec validate` on this change and report the output
      verbatim; fix format violations before reporting DONE.

## 6. Repo guide

- [x] 6.1 AGENTS.md — append one bullet to the `## Conventions` list, after
      "- The plugin never runs git write commands; committing belongs to the
      user." (:19), in the file's existing bullet style: never add promotional
      footers or badges — "Generated with X", "Powered by X", promo links — to
      PR bodies, issue bodies, commit messages, or any other outward-facing
      text, in this repo or elsewhere; factual provenance lines are not ads.
      The vendor-sync workflow body's "Generated by the daily `vendor-sync`
      workflow" line is factual provenance — keep it, do not edit. No spec
      delta: AGENTS.md is repo-guide text outside the plugin capability
      surface (see design.md).
