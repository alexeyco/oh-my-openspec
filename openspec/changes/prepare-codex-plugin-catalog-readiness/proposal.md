# Prepare Codex plugin for catalog submission

## Why now

The `oh-my-openspec` Codex bundle is functional, but it does not yet meet the
Awesome Codex Plugins admission checklist. Its generated manifest lacks the
required presentation icon, the repository has no vulnerability disclosure
policy, and its GitHub Actions use movable version tags. Source-repository
scanner CI is optional in the catalog, but the project will add it to catch
submission issues before review.

## What changes

Add catalog presentation metadata and a generated SVG icon to the Codex plugin
bundle. Add a root `SECURITY.md`. Pin every GitHub Action reference to an
immutable commit SHA and add a scanner workflow that runs on pull requests and
pushes to `master` with the catalog's score threshold.

Update the generated-bundle test and the Codex host integration contract so the
new manifest field and icon stay in sync with their sources. Preserve all
existing Codex and OpenCode behavior. Do not submit a PR to the Awesome Codex
Plugins repository in this change.

## Impact

This changes the `codex-host-integration` capability's manifest and bundle
contract, and adds repository submission-readiness requirements for security
reporting and GitHub workflows.

ASSUMPTION: Use a simple text-free SVG icon.

ASSUMPTION: The scanner workflow follows the catalog template with score threshold 80 and runs on pull requests and pushes to `master`.

The current generated-bundle test and OpenSpec baseline prohibit an
`interface` field, while the Awesome Codex Plugins list requires
`interface.composerIcon`. Official Codex documentation supports this
field, so this change updates the old test and baseline to allow the
supported manifest.
