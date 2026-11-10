# Agent role contracts

## ADDED Requirements

### Requirement: Archive title review covers active artifacts without changing history

The archive role guidance SHALL review document-level title headings in every artifact of the selected active change and affected main specifications, plus `Requirement` headings in those specifications. It SHALL leave historical archived changes and their specifications outside this review. A `MODIFIED` requirement heading SHALL remain the baseline merge key verbatim; a heading rename SHALL use `RENAMED Requirements` with exact `FROM:` and `TO:` values.

#### Scenario: Active archive artifacts are in scope

- **WHEN** the archive flow processes a selected active change
- **THEN** it reviews the document titles in that change and in affected main specifications, and the requirement headings in those specification files

#### Scenario: Historical archive is out of scope

- **WHEN** the archive flow reviews titles for a selected active change
- **THEN** it does not inspect or modify historical archived change artifacts or archived specifications

#### Scenario: Merge key is not silently rewritten

- **WHEN** a technical or placeholder baseline heading belongs to a `MODIFIED` requirement
- **THEN** the merge key remains verbatim or the change uses `RENAMED Requirements` with exact source and target headings
