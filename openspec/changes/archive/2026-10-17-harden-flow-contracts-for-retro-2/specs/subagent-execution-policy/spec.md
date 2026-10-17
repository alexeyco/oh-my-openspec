# subagent-execution-policy — delta for harden-flow-contracts-for-retro

## MODIFIED Requirements

### Requirement: Contract content is a fixed block

`SUBAGENT_CONTRACT` SHALL be the constant text asserting, in order: the
final message is a report for the orchestrator (findings first, then
evidence with exact paths, commands, key output lines); the artifacts
under `openspec/` are the contract — quote them, change them only where
the role prompt says so, never silently rewrite; never run git write
commands, enumerated as add, commit, push, stash, checkout, switch,
reset, restore, clean — version control belongs to the user, and the
contract adds the principle "Never mutate the working tree or refs;
compare against committed state with `git show`/`git diff`."; quoted
Guardrails are hard constraints — stop and report `BLOCKED: <reason>` if
the task cannot proceed without violating one; label anything
unverifiable `UNVERIFIED`, never guess; no drive-by refactors; and every
report is written in English regardless of the session's reply language,
appended as the constant's final sentence
(core/prompts.ts:21-37) — with
"never run git write commands" kept verbatim so the contract test
(tests/prompts.test.ts:168-173) passes unmodified.

#### Scenario: Single source of truth

- **WHEN** any role needs the contract
- **THEN** it comes from this one constant, not from copies in
  `agents/*.md` (opencode/index.ts:123-125 comment, injected at
  :126-134)

#### Scenario: Enumeration covers working-tree mutations

- **WHEN** the contract's git clause is read
- **THEN** the parenthetical lists all nine commands (add, commit, push,
  stash, checkout, switch, reset, restore, clean) and the text states
  that mutation of the working tree or refs is never allowed while
  `git show`/`git diff` against committed state is the comparison path
  (core/prompts.ts:27-30)

#### Scenario: Report language is pinned

- **WHEN** the contract text is read
- **THEN** its final sentence requires every report in English regardless
  of the session's reply language (core/prompts.ts:36)
