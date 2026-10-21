# Improve archive completion and specification headings

## Why now

The Codex apply flow currently points users to an upstream archive skill, the archive flow asks whether to sync specifications, and validation issues found after archiving are reported without an attempt to repair them. Specification headings can also expose internal identifiers instead of readable names.

## What changes

The archive workflow will sync specifications and archive in one run, stopping before archive if a required sync is blocked. It will validate after archive, repair fixable OpenSpec artifact issues, and validate again. Codex-generated skills will name plugin-owned skills with the `$oh-my-openspec:` namespace. OpenSpec requirement headings and capability specification headings will use human-readable names while technical identifiers and paths remain stable. Machine-identifier titles in every existing main capability specification under `openspec/specs/**/spec.md` will be rewritten readably; already readable titles remain. Archive change artifacts and history remain out of scope.

## Capabilities

- `orchestration-flows`: define the sync, archive, validate, repair, and apply next-step behavior.
- `codex-host-integration`: render namespaced plugin skill recommendations in Codex skills.
- `agent-role-contracts`: require readable requirement and capability headings in generated specifications.

ASSUMPTION: human-readable titles affect displayed markdown headings, not technical change IDs, directory names, or capability paths.

ASSUMPTION: after archive validation, repair attempts are limited to OpenSpec artifacts (specs and archived change artifacts), not implementation code; stop and report if issues cannot be fixed safely.
