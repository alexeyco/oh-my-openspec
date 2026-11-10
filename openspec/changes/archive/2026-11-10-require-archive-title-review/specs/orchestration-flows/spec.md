# Orchestration flows

## ADDED Requirements

### Requirement: Archive reviews titles before syncing and archiving

The archive flow SHALL inspect document-level title headings in every artifact of the selected change and the main specifications affected by its deltas, along with `Requirement` headings in those specifications, before syncing or archiving. It SHALL replace `TBD` placeholders and technical machine-name titles only when a readable title is clearly supported by the artifact content. It SHALL preserve readable authored main-spec titles and SHALL NOT edit historical archived changes or their specifications.

#### Scenario: Clear placeholders are repaired before sync

- **WHEN** a selected change artifact or affected main specification has a `TBD` document title or a technical machine-name title with a clear readable title in its content
- **THEN** the archive flow replaces that title before syncing or archiving and leaves historical archived artifacts unchanged

#### Scenario: Readable main-spec title is preserved

- **WHEN** an affected main specification already has a readable authored document title
- **THEN** the archive flow preserves that title while reviewing its specification requirement headings

#### Scenario: Ambiguous title blocks archive until the user decides

- **WHEN** the archive flow cannot safely derive a readable title from the selected change or an affected main specification
- **THEN** it asks the user to choose a title and waits for the decision before syncing or archiving

### Requirement: Archive title review preserves requirement merge keys

During title review, the archive flow SHALL preserve a `MODIFIED` requirement heading exactly as it appears in the baseline specification. If the requirement name must change, the selected change SHALL express it through `RENAMED Requirements` with the exact `FROM:` and `TO:` names.

#### Scenario: Modified requirement keeps its baseline heading

- **WHEN** a `MODIFIED` requirement has a technical or placeholder heading in the baseline
- **THEN** the archive flow retains that exact heading as the merge key rather than silently rewriting it

#### Scenario: Requirement title change uses the rename form

- **WHEN** a requirement heading needs a different readable name
- **THEN** the change expresses the rename through `RENAMED Requirements` with exact `FROM:` and `TO:` values before syncing
