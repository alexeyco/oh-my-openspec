# Require archive title review

## Why now

The archive flow currently asks for readable titles only when it creates a new main specification. It does not require a review of document titles in the selected change or machine-named titles in existing specifications affected by sync, so placeholders such as `TBD` can be archived and propagated.

## What changes

Before syncing and archiving, the archive flow will review document title headings in the selected change and affected main specifications, plus `Requirement` headings in their specifications. It will replace `TBD` placeholders and technical machine-name titles when the intended readable title is clear from the content. If it cannot determine a title safely, it will ask the user to choose and wait before archiving. A `MODIFIED` requirement heading remains an exact merge key unless the change uses `RENAMED Requirements`. Existing historical archives are not changed.

## Capabilities

- `orchestration-flows`: require a pre-archive title review and resolution of ambiguous titles.
- `agent-role-contracts`: define the scope of title review and preserve requirement merge-key semantics.
