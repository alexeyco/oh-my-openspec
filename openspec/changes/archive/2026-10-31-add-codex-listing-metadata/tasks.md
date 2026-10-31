## 1. Complete generated Codex listing metadata

- [x] 1.1 Extend `PluginInterface` and `renderPluginJson` in `codex/manifest.ts` with non-empty `longDescription`, `developerName`, `category`, `capabilities`, and `logo: "./assets/icon.svg"`; keep `composerIcon` on the same bundled asset. Scenario: "Required catalog metadata and icon are bundled".
- [x] 1.2 Update `tests/codex-bundle.test.ts` to assert the required manifest fields, both icon paths, asset dimensions and bundle inclusion, omission of all four remote-MCP URLs from the current local stdio manifest, and the documented conditional URL requirement. Scenario: "Required catalog metadata and icon are bundled"; Scenario: "Documentation explains conditional remote MCP URL requirements"; Scenario: "Local stdio MCP does not require remote-service URLs".
- [x] 1.3 Update `docs/codex.md` with the required listing fields and exact URL field names, explaining that they apply to attached remote MCP apps undergoing public review and not the current local stdio package. Scenario: "Documentation explains conditional remote MCP URL requirements"; Scenario: "Local stdio MCP does not require remote-service URLs".
- [x] 1.4 Update the `codex-host-integration` baseline to require the new listing metadata and document the local stdio and conditional remote MCP URL behavior. Scenario: "Required catalog metadata and icon are bundled"; Scenario: "Documentation explains conditional remote MCP URL requirements"; Scenario: "Local stdio MCP does not require remote-service URLs".

## 2. Verify generated bundle

- [x] 2.1 Run `make codex` and `make check`; confirm the generated manifest includes the required listing fields, both icon references resolve, and all bundle checks pass. Scenarios: "Required catalog metadata and icon are bundled"; "Local stdio MCP does not require remote-service URLs".
