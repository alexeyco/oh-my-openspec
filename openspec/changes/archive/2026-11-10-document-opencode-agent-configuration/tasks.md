## 1. Add the configuration guide

- [x] 1.1 Add `docs/opencode.md` with current v2 JSONC examples for per-role permissions, project/global config scope and merge behavior, and model/reasoning variants. Explain prompt-vs-permission limits and parent-versus-child permissions. Scenarios: “Configure a role permission”, “Understand the limits of a permission rule”, “Distinguish launching from child permissions”, “Choose project or global configuration”, “Understand merged permission rules”, “Set a role model and reasoning variant”, “Keep the inherited model”.

## 2. Link the guide from the README

- [x] 2.1 Add a README relative link to `docs/opencode.md` in `See also`. Scenario: “Find configuration guidance”.

## 3. Check documentation

- [x] 3.1 Run `make fmt` and `node scripts/check.mjs`; verify the configuration examples against the linked current OpenCode documentation. Scenario: “Verify guide examples and formatting”.
