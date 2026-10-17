# Design — improve-retro-report-format

## Approach

Text-only edits to three files (`agents/openspec-retrospector.md`,
`skills/openspec-retro/SKILL.md`, `docs/agents.md`) plus this change's two
delta specs. Every edit in `tasks.md` is anchored to verbatim current text;
line numbers are plan-time hints. The two MODIFIED requirements carry
re-synced citations against the predicted final file states below; the final
re-sync group recomputes them against the actual texts, and the actual texts
govern whenever implementer wording shifts a line.

Files to touch:

- `agents/openspec-retrospector.md` — Rules block rewritten (blockquote
  rendering, guards A+B, numbering/title, word caps, tally-first), Report
  format section becomes the unfenced Markdown template, clean-run line
  gains "no tally".
- `skills/openspec-retro/SKILL.md` — §3 Relay gains one locked sentence; the
  paragraph grows by exactly one line, shifting only Guardrails below it.
- `docs/agents.md` — §openspec-retrospector paragraph (:119-130) syncs to
  the new shape; the :47 table row stays true untouched.
- `openspec/changes/improve-retro-report-format/specs/**` — the two delta
  files, citation re-sync only at the end.

No edit to `core/prompts.ts`, `README.md`, `tests/**`, `vendor/`, or any
baseline spec under `openspec/specs/`.

## Reference final layout: agents/openspec-retrospector.md (60 lines)

Locked strings (must appear verbatim): the tally grammar line
`N findings: X HIGH · Y MED · Z LOW`, the whole template block below, the
guard A sentence "The quote must show the defect on its own — if the line
needs your interpretation to look like a problem, drop the finding.", the
guard B disqualification clause ("might cause" / "in principle" …
disqualifies the finding), and the token `No findings — run clean.`. All
other wording may vary within the task constraints. Line numbers are the
plan-time citation targets of the delta spec:

```
 1: ---
 2: description: "Mine one finished run for defects in the plugin's own prompts; ≤8 cited, ranked findings."
 3: mode: subagent
 4: ---
 5:
 6: Analyze the evidence bundle of one finished run and report defects in the
 7: plugin's own prompt entities — and only those:
 8:
 9: - `agents/*.md` — role prompts
10: - `skills/openspec-*/SKILL.md` — flow skills
11: - `core/prompts.ts` — SUBAGENT_CONTRACT and command instructions
12:
13: Never report on: vendored OpenSpec skills, the user's project code, the
14: openspec CLI, or anything else — such findings are dropped silently.
15:
16: Rules:
17:
18: - Every finding must quote one decisive line from the bundle verbatim
19:   (a role's `BLOCKED:` line, a re-dispatch, a failed critic round, a user
20:   correction), rendered as its own blockquote line under `Was:`. No quote
21:   → the finding does not exist.
22: - The quote must show the defect on its own — if the line needs your
23:   interpretation to look like a problem, drop the finding.
24: - `Why:` names what this run actually paid — a wasted round, rework, a
25:   user correction. A cost of the form "might cause" or "in principle"
26:   disqualifies the finding.
27: - At most 8 findings. If the run produced more, keep the 8 with the highest
28:   cost; never pad to eight.
29: - Severity: `HIGH` = wrong behavior or wasted work; `MED` = friction,
30:   rework; `LOW` = polish. Rank HIGH → LOW.
31: - Number every finding for reference; its title is at most 6 words and
32:   states what the finding is, derived from `Was:` — no editorializing.
33: - Word caps: `Was:` at most 20 words, `Why:` at most 15, `Fix:` at most 25.
34:   One field is one sentence, no nesting, no follow-ups.
35: - `Fix:` names the file and the section, and states the exact edit — it
36:   must be executable without re-reading the session.
37: - The report opens with exactly one mechanical count line — the tally —
38:   and then the findings, one blank line between them: no preamble, no
39:   overall summary, no "how to verify" section. The bundle is your only
40:   evidence; the session transcript you cannot see does not exist.
41:
42: Report format — emit Markdown; never wrap the report in a code fence:
43:
44: N findings: X HIGH · Y MED · Z LOW
45:
46: ### 1. HIGH · <file> — <title ≤6 words>
47: - Was: <one sentence ≤20 words>
48:   > <the decisive bundle line, verbatim, as a blockquote>
49: - Why: <one sentence ≤15 words>
50: - Fix: <one sentence ≤25 words — file, section, exact executable edit>
51:
52: ### 2. MED · ...
53:
54: When the run exposed nothing actionable, print only this line — no tally:
55: `No findings — run clean.`
56:
57: You never:
58:
59: - Apply or propose applying anything yourself — findings are for a future PR.
60: - Speculate about causes the bundle does not show.
```

Lines 1-15 and the "You never" list keep their current text verbatim (the
list only shifts position). Bullet order in Rules is preserved: quote →
cap-8 → severity → format rules → Fix → preamble ban; the guards and the new
format bullets are inserted at the marked seams.

### Citation map (baseline → delta), agent-role-contracts

| Cited behavior                            | Baseline   | Delta (reference)                                                                     |
| ----------------------------------------- | ---------- | ------------------------------------------------------------------------------------- |
| In-scope entities + silent drops          | `:6-14`    | `:6-14` (same)                                                                        |
| Quote rule, now with blockquote rendering | `:17-20`   | `:18-21`                                                                              |
| Guard A (quote proves it alone)           | —          | `:22-23`                                                                              |
| Guard B (cost mandatory and concrete)     | —          | `:24-26`                                                                              |
| Cap-8 + severity + ranking                | `:21-24`   | `:27-30`                                                                              |
| Numbered findings, ≤6-word title          | —          | `:31-32`                                                                              |
| Word caps Was/Why/Fix                     | —          | `:33-34`                                                                              |
| `Fix:` executability                      | `:27-28`   | `:35-36`                                                                              |
| Tally first, blank line, no preamble      | —          | `:37-40`                                                                              |
| Markdown, unfenced template               | —          | `:42-52`                                                                              |
| Tally grammar line                        | —          | `:44`                                                                                 |
| Clean run: token only, no tally           | (:42 text) | `:54-55`                                                                              |
| "You never" list                          | `:44-46`   | physically `:57-60` — citation at baseline spec.md:113 stays untouched (house policy) |

Reviewer citations (`agents/openspec-reviewer.md:6-8,25,34-37`, `:28-29`)
carry over from the baseline verbatim — that file is not edited.

## Reference final layout: skills/openspec-retro/SKILL.md §3 (lines 33-39)

The locked relay sentence is: "Present the report as rendered Markdown,
never inside a code block." It joins the paragraph as its own sentence; the
existing sentences stay verbatim:

```
33: ### 3. Relay
34:
35: Present the report as-is. Add nothing — no commentary, no severity
36: re-shuffling, no "suggestions". Present the report as rendered Markdown,
37: never inside a code block. If the user wants fixes, that is ordinary
38: work in the plugin's own repository (`/openspec.plan` there, or direct
39: edits), not an action of this command.
```

### Citation map (baseline → delta), orchestration-flows

| Cited behavior                      | Baseline | Delta     |
| ----------------------------------- | -------- | --------- |
| Bundle compilation (§1)             | `:13-25` | unchanged |
| Single dispatch (§2)                | `:27-30` | unchanged |
| Relay as-is, rendered Markdown      | `:32-37` | `:32-39`  |
| Never-edit + bundle-only guardrails | `:39-44` | `:40-46`  |
| Empty run stops                     | `:45-46` | `:47-48`  |
| Scenario: dispatch + relay          | `:27-37` | `:27-39`  |

The read-only requirement at baseline orchestration-flows spec.md:23-26
cites `:8-9,29` — upstream of the only edit, unaffected, not MODIFIED.

## Decided trade-offs

**Unfenced template in the role file.** A fenced template teaches the model
to fence its output; the cure is to show the report as raw Markdown in the
prompt itself and say "never wrap the report in a code fence". Cost: the
template's `###` lines render as headings when previewing
`agents/openspec-retrospector.md` as Markdown. Accepted — the file is a
prompt asset, not documentation; docs/agents.md carries the human-facing
description.

**Word caps instead of line caps.** Today's "exactly four lines / one
sentence per line" bounds structure but not length — the wall of text comes
from long sentences. The caps (Was ≤20, Why ≤15, Fix ≤25) bound the thing
that actually hurts, and "one field is one sentence, no nesting, no
follow-ups" keeps the old structural guarantee.

**Guards as drop rules, not new vocabulary.** Guards A and B extend the
existing "No quote → the finding does not exist" mechanism: unverifiable or
cost-free findings are dropped silently. No new report token (no
`NO-COST:`-style marker) is introduced, so nothing downstream — relay,
specs' verbatim token list, tests — needs to learn a new string. The guards
strengthen "never pad to eight" without restating the cap.

**Tally line as the single allowed preamble.** The old ban ("No preamble, no
overall summary") is rewritten, not deleted: exactly one mechanical count
line may precede the findings, and a zero-finding run prints only the clean
token with no tally. One output shape per case, both mechanically checkable
by a human in a second.

**Bullet order preserved.** Insertions land at seams (after the quote rule,
in place of the four-lines rule, in place of the preamble ban) so cap-8,
severity, and `Fix:` keep their exact current wording and relative order —
minimal diff, and the baseline requirement's restated clauses map 1:1 onto
contiguous final ranges.

**Citation policy.** Only the two MODIFIED requirements get re-synced
citations, against the final post-edit texts. Citations in unmodified
requirements knowingly go stale where lines shift
(agent-role-contracts spec.md:113 `:44-46`; spec.md:12 docs ranges were
already stale before this change) — house policy defers them to a future
change that modifies those requirements.

**docs/agents.md sync shape.** The paragraph keeps its existing sentences
for scope, unquoted-drop, cap, ranking, severities, clean token, and
"Read-only."; only the format description is rewritten. No requirement cites
docs/agents.md — only the agent-role-contracts Purpose section does
(spec.md:12), already stale before this change and deferred under the
citation policy above — so paragraph-length drift is harmless.

## Token stability

Verbatim strings that must survive in the final files (sweep in tasks 5.1):
`No findings — run clean.` · `BLOCKED:` · `HIGH`/`MED`/`LOW` ·
`At most 8 findings` · `never pad to eight` · `No quote → the finding does
not exist.` (reflowed across lines is fine, words are not) ·
`Present the report as-is.` · `Add nothing — no commentary, no severity
re-shuffling` · the locked strings listed in the reference layouts above.
`core/prompts.ts` (`RETRO_COMMAND_DESCRIPTION` :18-19, `retroInstruction()`
:152-157) and `README.md` stay byte-identical.

Prettier runs with default `proseWrap: preserve`, so `make fmt` will not
rewrap the edited prose; task 5.2 still re-checks citation ranges after
formatting in case normalization moves a line.
