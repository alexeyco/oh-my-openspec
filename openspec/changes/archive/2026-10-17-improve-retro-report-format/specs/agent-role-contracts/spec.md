# agent-role-contracts — delta for improve-retro-report-format

## MODIFIED Requirements

### Requirement: Reviewer and retrospector deliver bounded, cited findings

The reviewer SHALL critique the cumulative diff of one completed change against
its OpenSpec artifacts and report `APPROVE` or `CHANGES-REQUESTED`, never
approving while a BLOCKING line stands (agents/openspec-reviewer.md:6-8,25,34-37);
a choice that contradicts a spec scenario escalates to BLOCKING in its Choices
audit (agents/openspec-reviewer.md:28-29). The retrospector SHALL limit itself
to the plugin's own prompt entities — `agents/*.md`,
`skills/openspec-*/SKILL.md`, `core/prompts.ts` — dropping findings about
vendored skills, user project code, or the CLI silently
(agents/openspec-retrospector.md:6-14). Every finding must quote one decisive
bundle line verbatim, rendered as its own blockquote line under `Was:`
(agents/openspec-retrospector.md:18-21), and the quote must show the defect on
its own — a quoted line that needs interpretation to look like a problem drops
the finding (agents/openspec-retrospector.md:22-23). `Why:` names the cost this
run actually paid — a wasted round, rework, a user correction — and a cost of
the form "might cause" or "in principle" disqualifies the finding
(agents/openspec-retrospector.md:24-26). Findings are capped at 8, ranked
`HIGH` to `LOW` with no padding (agents/openspec-retrospector.md:27-30), and
each `Fix:` line names the file and section with an executable edit
(agents/openspec-retrospector.md:35-36). The report SHALL open with exactly one
mechanical tally line — `N findings: X HIGH · Y MED · Z LOW` — with no other
preamble, and one blank line SHALL separate findings
(agents/openspec-retrospector.md:37-40,44); findings are numbered, each heading
carries the severity and the file path alongside a title of at most 6 words
derived from `Was:` (agents/openspec-retrospector.md:31-32), and the field caps
are `Was:` at most 20 words, `Why:` at most 15, `Fix:` at most 25
(agents/openspec-retrospector.md:33-34). The report is emitted as Markdown and
never wrapped in a code fence (agents/openspec-retrospector.md:42-53). A run
that exposed nothing actionable prints only `No findings — run clean.` — no
tally line (agents/openspec-retrospector.md:55-56).

#### Scenario: Reviewer withholds approval on blocking findings

- **WHEN** the reviewer's report contains any BLOCKING line
- **THEN** the verdict cannot be `APPROVE` (agents/openspec-reviewer.md:34-37)

#### Scenario: Unquoted retrospector observation is dropped

- **WHEN** an observation about the finished run has no verbatim quote from the evidence bundle
- **THEN** it is not reported as a finding (agents/openspec-retrospector.md:18-21)

#### Scenario: A quote that needs interpretation drops its finding

- **WHEN** a quoted bundle line shows a defect only once the retrospector's interpretation is added
- **THEN** the finding is dropped (agents/openspec-retrospector.md:22-23)

#### Scenario: A hypothetical cost disqualifies a finding

- **WHEN** the only cost a finding can name is of the form "might cause" or "in principle"
- **THEN** the finding is not reported (agents/openspec-retrospector.md:24-26)

#### Scenario: The tally line opens a non-empty report

- **WHEN** the retrospector reports one or more findings
- **THEN** the report's first line is the mechanical count `N findings: X HIGH · Y MED · Z LOW` and no preamble precedes it (agents/openspec-retrospector.md:37-40,44)

#### Scenario: Clean run prints only the clean token

- **WHEN** the run exposed nothing actionable
- **THEN** the report is only `No findings — run clean.` — no tally line and no other text (agents/openspec-retrospector.md:55-56)
