## ADDED Requirements

### Requirement: Codex catalog listing metadata

The Codex listing SHALL include all required package metadata and document the URL requirements for its current MCP submission type.

#### Scenario: Required catalog metadata and icon are bundled

- **WHEN** the Codex bundle is rendered
- **THEN** its manifest contains non-empty `longDescription`, `developerName`, `category`, and `capabilities`, sets `logo` and `composerIcon` to `./assets/icon.svg`, and the referenced square SVG is included in the bundle

#### Scenario: Documentation explains conditional remote MCP URL requirements

- **WHEN** a maintainer reads `docs/codex.md` about Codex listing metadata
- **THEN** it names `websiteURL`, `supportURL`, `privacyPolicyURL`, and `termsOfServiceURL`, states that these accessible HTTPS URLs are required for an attached remote MCP app submitted for public MCP review, and says they are not required for the current local stdio package

#### Scenario: Local stdio MCP does not require remote-service URLs

- **WHEN** the bundled plugin uses the current local stdio MCP server
- **THEN** its listing metadata omits `websiteURL`, `supportURL`, `privacyPolicyURL`, and `termsOfServiceURL`
