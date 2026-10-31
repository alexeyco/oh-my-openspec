# Design: Complete Codex listing metadata

## Approach

Keep the Codex manifest generated from `codex/manifest.ts`. Extend `PluginInterface` and the rendered manifest with the required listing text, developer, category, capabilities, and `logo` path. Point both icon fields at `./assets/icon.svg`; `codex/render.ts` already includes the source asset in the bundle, so the bundle shape does not gain a file.

The current `.mcp.json` declares a local stdio server. Do not add website, support, privacy, or terms URLs to this package. Record the conditional rule in the Codex integration documentation and spec: all four URLs become required for an attached remote MCP app undergoing public MCP review. Test the documentation for the four exact field names and the local-stdio exception; do not try to simulate a remote MCP configuration that this repository does not support. Do not synthesize legal URLs or add unused URL configuration to the manifest renderer.

## Files

- `codex/manifest.ts` — add typed and rendered listing fields and point `logo` at the existing icon.
- `tests/codex-bundle.test.ts` — assert the required metadata, both icon paths, the bundled asset, local stdio URL omission, and the documented conditional URL requirement.
- `docs/codex.md` — document the added listing fields and when the four public MCP review URLs apply.
- `openspec/specs/codex-host-integration/spec.md` — sync the generated manifest contract and scenarios.

## Trade-offs

Reusing the same SVG keeps the generated bundle small and avoids maintaining duplicate artwork. The remote MCP URL rule is documented as conditional because this bundle uses a local stdio server; making the server remote or publishing it as an attached MCP app is outside this change.
