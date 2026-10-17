# Tasks — improve-retro-report-format

Every insertion or replacement below must first locate the quoted anchor text
in the named file: match it verbatim where it fits one line, and otherwise
match a distinctive sub-line fragment or reflow-normalized text — source files
soft-wrap, so a whole wrapped sentence may not grep as written. Line numbers
are current-state hints only and shift as edits land. Wording follows
design.md's reference layouts; the verbatim-locked strings are the guard A
sentence (1.2), the guard B disqualification clause (1.3), the tally grammar
line and the whole unfenced template (1.6), the clean-run token line (1.7),
and the relay rendered-Markdown sentence (2.1). Banned additions: a relay
footer line, any format-pinning test, any edit to `core/prompts.ts`,
`README.md`, `tests/**`, `vendor/`, or baseline specs under `openspec/specs/`,
and any new report token or vocabulary.

## 1. Retrospector role prompt

- [x] 1.1 agents/openspec-retrospector.md Rules — extend the quote bullet
      "- Every finding must quote one decisive line from the bundle verbatim
      (a role's `BLOCKED:` line, a re-dispatch, a failed critic round, a user
      correction). No quote → the finding does not exist." (:18-20): the quote
      is rendered as its own blockquote line under `Was:`. Keep the
      parenthetical list and the sentence "No quote → the finding does not
      exist." verbatim (reflow across lines allowed). Reference layout
      :18-21. Covers delta requirement (blockquote clause) and scenario
      "Unquoted retrospector observation is dropped".
- [x] 1.2 agents/openspec-retrospector.md Rules — insert a new bullet directly
      after the quote bullet, before "- At most 8 findings." (:21), with the
      locked sentence: "The quote must show the defect on its own — if the
      line needs your interpretation to look like a problem, drop the
      finding." Reference layout :22-23. Covers scenario "A quote that needs
      interpretation drops its finding".
- [x] 1.3 agents/openspec-retrospector.md Rules — insert a new bullet after
      the guard A bullet: `Why:` names what this run actually paid — a wasted
      round, rework, a user correction; locked clause: a cost of the form
      "might cause" or "in principle" disqualifies the finding. Reference
      layout :24-26. Keep the cap bullet "- At most 8 findings. If the run
      produced more, keep the 8 with the highest cost; never pad to eight."
      (:21-22) and the severity bullet "- Severity: `HIGH` = wrong behavior
      or wasted work; `MED` = friction, rework; `LOW` = polish. Rank HIGH →
      LOW." (:23-24) verbatim and in this order. Covers scenario "A
      hypothetical cost disqualifies a finding".
- [x] 1.4 agents/openspec-retrospector.md Rules — replace the bullet "- Each
      finding is exactly four lines — the header plus `Was:` `Why:` `Fix:`.
      One line means one sentence, no nesting, no follow-ups." (:25-26) with
      two bullets: (a) number every finding for reference; its title is at
      most 6 words, states what the finding is, derived from `Was:`, no
      editorializing; (b) word caps — `Was:` at most 20 words, `Why:` at most
      15, `Fix:` at most 25; one field is one sentence, retaining the "no
      nesting, no follow-ups" ban. Reference layout :31-34. Keep the `Fix:`
      bullet "- `Fix:` names the file and the section, and states the exact
      edit — it must be executable without re-reading the session." (:27-28)
      verbatim. Covers delta requirement (numbering, title, caps clauses).
- [x] 1.5 agents/openspec-retrospector.md Rules — rewrite the bullet "- No
      preamble, no overall summary, no "how to verify" section. The bundle
      is your only evidence; the session transcript you cannot see does not
      exist." (:29-31): the report opens with exactly one mechanical count
      line — the tally — and then the findings, one blank line between them;
      keep the no-preamble / no-overall-summary / no-"how to verify" bans and
      the sentence "The bundle is your only evidence; the session transcript
      you cannot see does not exist." verbatim. Reference layout :37-40.
      Covers delta requirement (tally-first clause) and, with 1.6, scenario
      "The tally line opens a non-empty report".
- [x] 1.6 agents/openspec-retrospector.md Report format — replace the section
      heading "Report format:" (:33) and the fenced template block (:35-40)
      with an unfenced template: the heading states that the role emits
      Markdown and never wraps the report in a code fence, followed by the
      locked template exactly (no code fence around it in the file; the
      `###` lines are intentional):

      ```
      N findings: X HIGH · Y MED · Z LOW

      ### 1. HIGH · <file> — <title ≤6 words>
      - Was: <one sentence ≤20 words>
        > <the decisive bundle line, verbatim, as a blockquote>
      - Why: <one sentence ≤15 words>
      - Fix: <one sentence ≤25 words — file, section, exact executable edit>

      ### 2. MED · ...
      ```

      Reference layout :42-52 (tally grammar line :44). Covers delta
      requirement (Markdown/unfenced clause) and scenario "The tally line
      opens a non-empty report".

- [x] 1.7 agents/openspec-retrospector.md — replace "When the run exposed
      nothing actionable: `No findings — run clean.`" (:42): a clean run
      prints only that line — no tally. The token `No findings — run clean.`
      stays verbatim. Reference layout :54-55. Keep the frontmatter (:1-4),
      the intro and scope list (:6-14), and the "You never" list (:44-47)
      textually unchanged — they only shift position. Covers scenario "Clean
      run prints only the clean token".

## 2. Retro flow skill relay

- [x] 2.1 skills/openspec-retro/SKILL.md §3 Relay — keep "Present the report
      as-is. Add nothing — no commentary, no severity re-shuffling, no
      "suggestions"." (:35-36) and the "If the user wants fixes, that is
      ordinary work in the plugin's own repository (`/openspec.plan` there,
      or direct edits), not an action of this command." sentence (:36-38)
      verbatim; insert the locked sentence "Present the report as rendered
      Markdown, never inside a code block." into the paragraph (reference
      layout places it after the word "suggestions", design.md §3 layout
      :33-39).
      No footer line, no other §3 text. Leave the frontmatter, §1, §2 (the
      `openspec-retrospector` reference at :30 feeds
      tests/assets.test.ts:104-107), and Guardrails untouched. Covers delta
      requirement (rendered-Markdown relay clause) and scenario "Single
      dispatch with verbatim relay".

## 3. Docs sync

- [x] 3.1 docs/agents.md §openspec-retrospector (:119-130) — rewrite the
      format description "At most 8 findings, each exactly `Was / Why / Fix`,
      ranked `HIGH` (wrong behavior or wasted work) → `MED` (friction,
      rework) → `LOW` (polish), with an executable `Fix:` naming file and
      section." (:126-128) to the new shape: the report opens with the single
      tally line `N findings: X HIGH · Y MED · Z LOW`; findings are numbered,
      separated by blank lines, each headed by severity, file, and a title of
      at most 6 words; `Was:` (≤20 words) is followed by the verbatim bundle
      quote as its own blockquote line; `Why:` (≤15 words) names the concrete
      cost this run paid; `Fix:` (≤25 words) is an executable edit naming
      file and section; the quote must show the defect on its own and a
      hypothetical cost disqualifies the finding; the report is rendered
      Markdown. Keep the scope sentences (:121-124), the unquoted-drop
      sentence (:124-126), the ≤8 cap with HIGH→LOW ranking and severity
      wording, the `No findings — run clean.` sentence (:128-129), and
      "Read-only." (:130). The table row ":47 Reflect — openspec-retrospector
      ×1 (evidence bundle in, report out)" stays true and untouched. No
      requirement cites docs/agents.md — only the stale Purpose-section docs
      ranges do (openspec/specs/agent-role-contracts/spec.md:12), deferred
      under design.md's citation policy; paragraph length may drift.

## 4. Citation re-sync (MODIFIED requirements only)

- [x] 4.1 Re-sync every `agents/openspec-retrospector.md:` citation in this
      change's specs/agent-role-contracts/spec.md (requirement text and all
      six scenarios) against the final file text; design.md's citation map
      predicts :6-14, :18-21, :22-23, :24-26, :27-30, :31-32, :33-34, :35-36,
      :37-40, :44, :42-52, :54-55. The actual final text governs where
      wording shifted a line. The reviewer sentences and citations
      (agents/openspec-reviewer.md:6-8,25,34-37, :28-29, :34-37) carry over
      from the baseline verbatim — that file is not edited; verify they are
      unchanged.
- [x] 4.2 Re-sync every `skills/openspec-retro/SKILL.md:` citation in this
      change's specs/orchestration-flows/spec.md against the final file text;
      predicted: :13-25 and :27-30 unchanged, relay :32-39, guardrails
      :40-46, empty run :47-48, dispatch+relay scenario :27-39.
- [x] 4.3 Verify no baseline spec under `openspec/specs/` was edited and the
      delta files cite no unmodified-requirement range: the stale
      `:44-46` citation at openspec/specs/agent-role-contracts/spec.md:113
      (the "You never" list physically moves to :57-60 in the reference
      layout), the docs citation at spec.md:12, and
      openspec/specs/orchestration-flows/spec.md:26 (`:8-9,29`, upstream of
      the edit) all stay untouched per house citation policy.

## 5. Tokens, formatting, checks

- [x] 5.1 Verbatim-token sweep across the edited files — all present:
      `No findings — run clean.`, `BLOCKED:`, `HIGH`/`MED`/`LOW`, "At most
      8 findings", "never pad to eight", "No quote → the finding does not
      exist.", "Present the report as-is.", "Add nothing — no commentary, no
      severity re-shuffling", the guard A sentence, the tally grammar line,
      and the template field lines. `git diff --stat` shows no change to
      `core/prompts.ts` (`RETRO_COMMAND_DESCRIPTION` :18-19,
      `retroInstruction()` :152-157), `README.md`, `tests/**`, or `vendor/`.
- [x] 5.2 Run `make fmt`, then re-check that every citation range re-synced
      in group 4 still matches the formatted texts (prettier defaults to
      `proseWrap: preserve`; if normalization moved a line, fix the range in
      the delta files).
- [x] 5.3 Run `make check` — scripts/check.mjs, the vendor-sync check,
      typecheck, and `npm test` must all pass; tests/assets.test.ts:100-107
      and tests/prompts.test.ts:154-165,177-188 pass unmodified; no new test
      file is added.
- [x] 5.4 Run `openspec validate improve-retro-report-format` and report the
      output verbatim; fix format violations before reporting DONE.
