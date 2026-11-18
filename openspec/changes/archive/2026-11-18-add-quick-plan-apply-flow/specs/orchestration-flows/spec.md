## ADDED Requirements

### Requirement: The quick path plans one bounded behavior before code edits

The quick flow SHALL handle one externally observable behavior in one
capability, use a short interview and focused research, dispatch a planner and
critic, require mechanical validation, and obtain one compact-plan confirmation
before code edits. It SHALL omit the adversarial grill for eligible requests.

#### Scenario: Eligible request reaches one compact-plan confirmation

- **WHEN** a request contains exactly one externally observable behavior in
  one capability, changes no public API or architecture, requires no data
  migration, affects no security/privacy behavior, and triage finds no material
  unresolved risk
- **THEN** `/omos.quick` uses a short interview and focused research, skips
  the adversarial grill, dispatches the planner and critic, requires
  `openspec_validate` to return `VALID`, and asks the user to confirm a
  compact plan before editing project code

#### Scenario: Declined compact plan does not edit project code

- **WHEN** the user declines the compact plan
- **THEN** the flow stops before project-code edits and reports the OpenSpec
  change id and the user's next options

#### Scenario: Invalid validation blocks project-code edits

- **WHEN** validation of the drafted change does not return `VALID`
- **THEN** the quick flow follows the standard plan recovery rules and does
  not begin project-code edits until the change validates

### Requirement: The quick flow verifies approved tasks and leaves archive separate

After confirmation, the quick flow SHALL apply the approved tasks, verify each
scenario, run the full project check suite, review the cumulative diff, and
report the change without archiving, committing, or pushing.

#### Scenario: Confirmed compact plan completes apply verification

- **WHEN** the user confirms the compact plan
- **THEN** the flow applies the approved tasks, verifies each scenario,
  runs the full project check suite, reviews the cumulative diff, and reports
  the change without archiving, committing, or pushing

#### Scenario: Quick completion leaves archive as a separate action

- **WHEN** quick completes implementation, verification, checks, and review
- **THEN** it offers `/omos.archive <change-id>` as a separate next step and
  has not run the archive workflow

### Requirement: The quick flow routes broad and risky requests to ordinary gates

The quick flow SHALL use ordinary plan/apply gates for multiple behaviors,
broad or multi-capability scope, public API or architecture work, data
migration, security/privacy work, or material unresolved risk.

#### Scenario: Broad or risky request uses ordinary plan and apply gates

- **WHEN** triage finds multiple independent behaviors, broad scope, multiple
  capabilities, public API or architecture work, a data migration,
  security/privacy work, or a material unresolved risk
- **THEN** the flow switches to the full plan/apply gates in the same
  invocation, including the ordinary research and adversarial grill
