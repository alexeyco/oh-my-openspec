# Complete Codex listing metadata

## Why now

The generated Codex manifest still lacks listing fields that OpenAI requires for a Codex package. The existing bundle already has a square icon, but only declares it as the composer icon. The catalog scanner reports these gaps, and the OpenAI submission guide confirms which metadata is required and when listing URLs apply.

## What changes

Extend the generated listing with `longDescription`, `developerName`, `category`, `capabilities`, and `logo`. Reuse the existing bundled SVG for both `logo` and `composerIcon`, and cover the fields in bundle tests and the Codex integration contract. Document that website, support, privacy, and terms URLs apply to a remote MCP app submitted for public MCP review; the current local stdio package does not require them.

Do not add placeholder legal URLs, change the local MCP server, create policy pages, or include unrelated optional scanner recommendations such as README, SECURITY, LICENSE, `.codexignore`, or screenshots. Upload, publication, and the OpenAI partner allowlist remain outside this change.

ASSUMPTION: The existing square SVG is suitable for both the `logo` and `composerIcon` fields; no separate artwork is needed.

## Impact

This extends the `codex-host-integration` capability's generated manifest contract while preserving the existing local stdio behavior and bundle generation flow.
