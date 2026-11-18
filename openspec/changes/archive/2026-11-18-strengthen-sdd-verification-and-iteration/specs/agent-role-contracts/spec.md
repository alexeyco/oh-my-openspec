# Agent role contracts

## ADDED Requirements

### Requirement: Planner writes atomic, observable, behavior-focused scenarios

The planner SHALL write atomic, behavior-focused and implementation-neutral scenarios with observable outcomes, cover relevant failure or boundary cases, and map each scenario to a verification method and expected evidence in `tasks.md`. It SHALL persist risk applicability in `proposal.md`.

#### Scenario: Scenario describes one observable behavior

- **WHEN** the planner writes an acceptance scenario
- **THEN** it describes one behavior and an observable outcome without prescribing internal implementation steps

#### Scenario: Relevant negative and boundary cases are represented

- **WHEN** research or the brief identifies a material failure or boundary condition
- **THEN** at least one scenario specifies the expected behavior for that condition

#### Scenario: Scenario maps to verification evidence

- **WHEN** the planner completes `tasks.md`
- **THEN** every scenario is mapped to a verification method and expected test, command, analysis, demonstration, or manual evidence

#### Scenario: Planner classifies all risk areas in the proposal

- **WHEN** the planner completes `proposal.md`
- **THEN** its `Risk review` section classifies non-functional behavior, security and privacy, compatibility and migration, concurrency, observability, and accessibility as Applicable, Out of scope, or Unresolved, and states a constraint or acceptance scenario for each Applicable area

### Requirement: Critic checks scenario quality and risk applicability

The critic SHALL check that scenarios are atomic, behavior-focused, implementation-neutral unless justified by the contract, and assert observable outcomes. It SHALL check that relevant failure and boundary cases are covered and SHALL reject missing scenario-to-verification mappings.

#### Scenario: Unobservable or implementation-prescribing outcome blocks review

- **WHEN** a scenario asserts an internal implementation detail without making it contractual or does not state an observable outcome
- **THEN** the critic reports a BLOCKING finding

#### Scenario: Missing verification mapping blocks review

- **WHEN** a scenario has no verification method and expected evidence in `tasks.md`
- **THEN** the critic reports a BLOCKING finding

### Requirement: Critic reviews the durable risk assessment

The critic SHALL check that the proposal's `Risk review` classifies every risk area and records a constraint or acceptance scenario for each applicable area.

#### Scenario: Relevant risk omission blocks review

- **WHEN** the brief or research indicates a material risk area but the plan neither covers it nor marks it out of scope or unresolved
- **THEN** the critic reports a BLOCKING finding

#### Scenario: Missing or incomplete durable risk review blocks review

- **WHEN** `proposal.md` has no `Risk review` section, omits a listed risk area, or leaves an Applicable area without a constraint or acceptance scenario
- **THEN** the critic reports a BLOCKING finding

### Requirement: The implementer reports contract mismatches without changing scope

The implementer SHALL report evidence when repository reality conflicts with the approved behavior, scope, design, or tasks, and SHALL distinguish contract-changing discoveries from clarifications that preserve the contract. It SHALL not silently change requirements or implement behavior outside the approved contract.

#### Scenario: Contract-changing discovery is reported for approval

- **WHEN** completing a task requires changing approved scope or observable behavior
- **THEN** the implementer reports the concrete evidence and proposed artifact change as a plan divergence and pauses the affected work

#### Scenario: Contract-preserving clarification is recorded

- **WHEN** implementation resolves an ambiguity without changing scope or observable behavior
- **THEN** the implementer reports the clarification and its evidence without inventing a new requirement

### Requirement: Verifier reports link each scenario to its evidence

The verifier SHALL name the verification method and concrete test, command, analysis, demonstration, or manual/composited action for each scenario, and state the observed outcome. Manual or composited evidence SHALL be labeled and SHALL NOT be described as an automated regression test.

#### Scenario: Verification report identifies method and evidence

- **WHEN** a scenario is reported as PASS or FAIL
- **THEN** the report identifies the method, concrete test or action, and observed outcome

#### Scenario: Manual evidence is not called an automated test

- **WHEN** a scenario is proven through a manual check or composited evidence
- **THEN** the report labels that method and does not claim an automated regression test exists

## MODIFIED Requirements

### Requirement: Reviewer and retrospector deliver bounded, cited findings

The reviewer SHALL assess the cumulative diff against the change artifacts and block approval on unresolved blocking findings. The retrospector SHALL evaluate evidence from the finished run for both plugin prompt defects and process friction or quality gaps. Process evidence SHALL include repeated `BLOCKED:` or `FAIL` outcomes, re-dispatches or extra rounds, plan divergences, and verification gaps when present in the run artifacts. Each finding SHALL be actionable and supported by a decisive verbatim quote from the evidence bundle; unsupported or hypothetical findings SHALL be omitted. Prompt and process findings SHALL share a maximum of eight findings and the existing severity-ranked report format.

#### Scenario: Reviewer withholds approval on blocking findings

- **WHEN** the reviewer's report contains any BLOCKING line
- **THEN** the verdict cannot be `APPROVE` (agents/omos-reviewer.md:34-37)

#### Scenario: Unquoted retrospector observation is dropped

- **WHEN** an observation about the finished run has no verbatim quote from the evidence bundle
- **THEN** it is not reported as a finding (agents/omos-retrospector.md:26-31)

#### Scenario: A quote that needs interpretation drops its finding

- **WHEN** a quoted bundle line shows a defect only once the retrospector's interpretation is added
- **THEN** the finding is dropped (agents/omos-retrospector.md:30-31)

#### Scenario: A hypothetical cost disqualifies a finding

- **WHEN** the only cost a finding can name is of the form "might cause" or "in principle"
- **THEN** the finding is not reported (agents/omos-retrospector.md:32-34)

#### Scenario: The tally line opens a non-empty report

- **WHEN** the retrospector reports one or more findings
- **THEN** the report's first line is the mechanical count `N findings: X HIGH · Y MED · Z LOW` and no preamble precedes it (agents/omos-retrospector.md:46-49,53)

#### Scenario: Clean run prints only the clean token

- **WHEN** the run exposed nothing actionable
- **THEN** the report is only `No findings — run clean.` — no tally line and no other text (agents/omos-retrospector.md:64-65)

#### Scenario: Retrospector evaluates process friction from run evidence

- **WHEN** the run evidence bundle contains repeated `BLOCKED:` or `FAIL` outcomes, re-dispatches or extra rounds, plan divergences, or verification gaps
- **THEN** the retrospector considers these as process findings alongside prompt defects and cites the decisive bundle evidence for every reported finding

#### Scenario: Process finding is actionable and evidence-bound

- **WHEN** a candidate process finding relies on a hypothetical cost or is not supported by a decisive verbatim evidence line
- **THEN** the retrospector omits it rather than inferring a defect

#### Scenario: Prompt and process findings share the report limit

- **WHEN** more than eight prompt and process findings are candidates
- **THEN** the retrospector reports no more than eight total, ranked by severity in the existing report format
