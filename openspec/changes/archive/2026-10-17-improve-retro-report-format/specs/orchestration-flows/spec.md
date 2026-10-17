# orchestration-flows — delta for improve-retro-report-format

## MODIFIED Requirements

### Requirement: The retro flow is read-only, single-dispatch, and relays the report verbatim

The retro flow SHALL compile an evidence bundle from the current session —
commands, role dispatches with verbatim final reports, friction lines, and the
end-of-run `git diff --stat` — keeping the bundle raw quoted lines rather than
paraphrase (skills/openspec-retro/SKILL.md:13-25). It dispatches the bundle to
`openspec-retrospector` exactly once, with no rounds
(skills/openspec-retro/SKILL.md:27-30), and presents the report as-is, as
rendered Markdown rather than inside a code block — no commentary, no severity
re-shuffling, no additions (skills/openspec-retro/SKILL.md:32-39).
The command never edits `agents/`, `skills/`, `core/`, or any project file, and
does not feed interpretations or fill gaps from memory
(skills/openspec-retro/SKILL.md:40-46). An empty run with no role dispatches
causes the flow to say so and stop (skills/openspec-retro/SKILL.md:47-48).

#### Scenario: Single dispatch with verbatim relay

- **WHEN** the evidence bundle is compiled
- **THEN** exactly one retrospector dispatch runs and its report is presented without additions, as rendered Markdown (skills/openspec-retro/SKILL.md:27-39)

#### Scenario: Empty run stops the flow

- **WHEN** the session contains no role dispatches
- **THEN** the flow reports the empty run and stops rather than inventing one to analyze (skills/openspec-retro/SKILL.md:47-48)
