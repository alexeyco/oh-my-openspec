# Improve retro report format

## Why now

After `/openspec.retro`, a human should understand in about ten seconds: the
scale of the run, what each finding is about, where its evidence is, and what
to fix. Today's report cannot deliver that. Its shape is fixed in the
retrospector role prompt (`agents/openspec-retrospector.md`) and mirrored in
two baseline specs, and it is a wall of dense text: each finding is exactly
four unnumbered lines, the decisive quote is buried at the end of the `Was:`
sentence, nothing states the scale up front, and the only length rule caps
lines, not words. The guards are also too weak: a finding can survive with a
quote that proves nothing on its own, and with a cost that is hypothetical
("might cause", "in principle") rather than something the run actually paid.
No rendering layer exists between the role prompt and the user — the relay
presents the report as-is — so only a source format change cures this.

## What changes

- **retrospector role** (`agents/openspec-retrospector.md`): the report
  becomes structured Markdown. It opens with exactly one mechanical tally
  line, `N findings: X HIGH · Y MED · Z LOW`; findings are numbered, separated
  by one blank line, and each carries a heading
  `### <n>. <SEV> · <file> — <title ≤6 words>` whose title states what the
  finding is, derived from `Was:`. The verbatim bundle quote moves out of the
  `Was:` sentence onto its own blockquote line directly under it. Word caps
  replace the four-line rule: `Was:` ≤20 words, `Why:` ≤15, `Fix:` ≤25. Two
  new guards filter findings without real cost: (A) the quote must show the
  defect on its own — a line that needs interpretation to look like a problem
  drops the finding; (B) `Why:` must name what this run actually paid — a
  wasted round, rework, a user correction — and a "might cause" or
  "in principle" cost disqualifies the finding. The Report format section
  becomes an unfenced Markdown template, and the role emits Markdown, never a
  report wrapped in a code fence. A clean run prints only
  `No findings — run clean.` — no tally. Unchanged in meaning: the in-scope
  entity list, silent drops, "No quote → the finding does not exist.", the
  ≤8 cap with "never pad to eight", HIGH→LOW ranking, the severity
  definitions, `Fix:` executability, and the "You never" list.
- **retro flow** (`skills/openspec-retro/SKILL.md` §3 Relay): one added
  locked instruction — the report is presented as rendered Markdown, never
  inside a code block. "Present the report as-is. Add nothing — no
  commentary, no severity re-shuffling, no 'suggestions'" stays verbatim in
  force; no footer, no translation.
- **docs** (`docs/agents.md` §openspec-retrospector): the format description
  ("each exactly `Was / Why / Fix`") syncs to the new shape.
- **baseline specs** (delta files only): two MODIFIED requirements restate
  the pinned report shape and the rendered-Markdown relay, with every
  embedded `path:line` citation re-synced to the final file state.

Text-only change: no runtime code, no `core/prompts.ts` edit, no `vendor/`
change, no new plugin tool.

## Impact on capabilities

Two capabilities, each exactly 1 MODIFIED requirement:

- `agent-role-contracts`: "Reviewer and retrospector deliver bounded, cited
  findings" — the reviewer sentences and their citations carry over
  untouched; the retrospector sentences are restated for the tally line,
  numbered titled findings, blockquote quote, blank-line separation, word
  caps, and guards A+B as observable report rules. The existing scenario
  "Unquoted retrospector observation is dropped" is kept with an updated
  citation; four scenarios are added for the testable new behaviors: the
  interpretation-needing quote drop (guard A), the hypothetical-cost
  disqualification (guard B), the tally-first non-empty report, and the
  clean run printing only `No findings — run clean.` with no tally.
- `orchestration-flows`: "The retro flow is read-only, single-dispatch, and
  relays the report verbatim" — the relay sentence gains "as rendered
  Markdown" while keeping the presented-as-is / without-additions semantics;
  skill citations downstream of the one-line §3 insertion are re-synced.

No other capability is touched: `role-registration`, `skill-registration`,
and `slash-commands` are unaffected — no new roles, skills, or commands, and
`RETRO_COMMAND_DESCRIPTION` and `retroInstruction()` in `core/prompts.ts`
stay byte-identical.

## Out of scope

- New plugin tools, runtime code, and `vendor/` — text-only change.
- A relay footer line, and any translation of the report — reports stay
  English per the SUBAGENT_CONTRACT.
- Tests pinning the report format; the existing tests
  (`tests/assets.test.ts:100-107`, `tests/prompts.test.ts:154-165,177-188`)
  must pass unmodified and no test is added.
- Stale `path:line` citations in requirements this change does not MODIFY —
  e.g. the retrospector `:44-46` citation at
  `openspec/specs/agent-role-contracts/spec.md:113` (the "You never" list
  physically shifts but the citation stays, per house policy), the docs
  citation at `spec.md:12`, and slash-commands' old `core/prompts.ts`
  ranges.
- `README.md` — lines 74, 84, 93 ("≤8 cited, ranked findings") stay true
  unedited.
- The global user config and any consumer project.
- The ≤8 cap, "never pad to eight", HIGH→LOW ranking, the severity
  definitions, and the verbatim tokens `No findings — run clean.` and
  `BLOCKED:` — all kept exactly as worded today.

ASSUMPTION: change id `improve-retro-report-format`.
ASSUMPTION: no test is added for the report format; the machine gate is `make check` + `openspec validate` only.
ASSUMPTION: stale `path:line` citations in requirements NOT modified by this change stay untouched (house citation policy).
ASSUMPTION: README.md lines 74,84,93 stay true unedited ("≤8 cited, ranked findings").
ASSUMPTION: except verbatim-locked insertions (guard A and B sentences, tally line grammar `N findings: X HIGH · Y MED · Z LOW`, the relay "rendered Markdown" instruction), the exact English wording of each insertion is the implementer's choice within the confirmed constraints, matching surrounding file style.
ASSUMPTION: severity ladder definitions and the ≤8 cap stay exactly as worded today; the two guards strengthen "no padding" without restating the cap.

## Rejected risks

REJECTED-RISK: the human reader remains the only auditor of quote fidelity — no mechanical check that a blockquoted line exists verbatim in the bundle is added; the residual risk was accepted consciously.
