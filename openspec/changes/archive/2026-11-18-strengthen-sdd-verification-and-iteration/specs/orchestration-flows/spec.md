# Orchestration flows

## ADDED Requirements

### Requirement: The plan flow assesses relevant risk areas

The plan flow SHALL assess relevant risk areas alongside its existing coverage interview and SHALL NOT add requirements for irrelevant areas.

#### Scenario: Plan records applicable risk areas

- **WHEN** a proposed change could affect a listed risk area
- **THEN** the plan interview and playback identify the area and its constraint or acceptance scenario

#### Scenario: Non-applicable risk areas do not expand scope

- **WHEN** a listed risk area does not apply to the proposed change
- **THEN** the plan records it as not applicable or out of scope and does not invent requirements for it

#### Scenario: Risk applicability remains in the proposal

- **WHEN** the plan artifacts are drafted
- **THEN** `proposal.md` contains a `Risk review` section that lists each risk area as Applicable, Out of scope, or Unresolved and records the constraint or acceptance scenario for each Applicable area

#### Scenario: Risk review covers the expected areas

- **WHEN** the plan records its risk review
- **THEN** it classifies non-functional behavior, security and privacy, compatibility and migration, concurrency, observability, and accessibility

### Requirement: The apply flow maps scenarios to verification methods and evidence

Each acceptance scenario SHALL have a planned verification method and expected evidence in the change tasks. The apply flow SHALL ensure verifier reports identify the actual test, command, or manual/composited evidence used for each scenario.

#### Scenario: Verification method is planned per scenario

- **WHEN** a change is ready for implementation
- **THEN** every acceptance scenario maps to a verification method and expected evidence in `tasks.md`

### Requirement: The apply flow supports approved plan revision when implementation reveals a mismatch

If implementation reveals a genuine mismatch with the approved behavior, scope, design, or tasks, apply SHALL pause affected work, present the concrete finding and proposed artifact revision to the user, and continue only after approval when the revision changes the agreed contract. The flow SHALL update and revalidate approved artifacts before resuming affected tasks; it SHALL not silently widen scope.

#### Scenario: Contract-changing discovery pauses for approval

- **WHEN** implementation reveals that the approved scope or observable behavior must change
- **THEN** apply pauses affected tasks, presents the evidence and proposed artifact changes, and waits for user approval before changing the contract

#### Scenario: Approved plan revision is validated before work resumes

- **WHEN** the user approves a contract-changing plan revision
- **THEN** the artifacts are updated, `openspec_validate` returns VALID, and affected tasks are replanned before implementation resumes

#### Scenario: Contract-preserving clarification is reported and checked

- **WHEN** implementation reveals a design or task clarification that preserves approved scope and observable behavior
- **THEN** the flow records the clarification in the relevant artifact, validates the change, and resumes without requesting scope approval

#### Scenario: Verifier reports concrete evidence for every scenario

- **WHEN** the verifier completes a scenario
- **THEN** its report names the verification method and concrete test, command, or manual/composited action and observed outcome; manual or composited evidence is explicitly labeled
