# Orchestration Flows Specification

## ADDED Requirements

### Requirement: The plan flow validates drafted changes and offers recovery for unresolved findings

After the normal critique path and before approval, the plan flow SHALL call
`openspec_validate` for the drafted change. On `INVALID`, it SHALL dispatch
`omos-planner` with the exact findings and validate again after each revision.
If findings remain or the planner cannot safely resolve them, the flow SHALL
show the findings and offer the user another planner revision or the chance to
fix them, without claiming validation passed.

#### Scenario: Plan repairs and revalidates mechanical findings

- **WHEN** validation of the drafted change returns `INVALID` after critique
- **THEN** the flow sends the exact findings to the planner and revalidates the revised change

#### Scenario: Plan offers a next step for unresolved findings

- **WHEN** a planner revision leaves findings unresolved or the planner reports it cannot safely resolve them
- **THEN** the flow shows the exact findings and offers another planner revision or the user's own fix, without claiming validation passed

### Requirement: The archive flow offers help with unresolved post-archive validation findings

After attempting safe repairs to post-archive OpenSpec artifact issues and
revalidating, the archive flow SHALL show any remaining findings and
proactively offer the user help to resolve them. It SHALL stop without
claiming validation passed while findings remain.

#### Scenario: Archive offers help when findings remain

- **WHEN** post-archive validation remains `INVALID` after safe repair attempts, or an issue cannot safely be repaired within OpenSpec artifacts
- **THEN** the flow shows the findings and offers the user help to resolve them, without claiming validation passed

#### Scenario: Archive completes after successful repair

- **WHEN** safe repairs make post-archive validation return `VALID`
- **THEN** the flow reports the successful validation and does not offer an unresolved-findings recovery step
