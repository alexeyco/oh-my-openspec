# Release publishing — delta for migrate-vendor-sync-openspec-2

## MODIFIED Requirements

### Requirement: The release record is tags and npm, not a CHANGELOG

Releases SHALL use version tags and npm; the plugin `version` in
`package.json` is machine-owned and mirrors the vendored OpenSpec version, so
feature branches add no CHANGELOG. The mirror version SHALL move only in the
daily `vendor-sync` workflow PR or in a migration change that moves the
vendored CLI's major layout — such a migration bumps `version` to the
regenerated `manifest.generatedBy` in its own branch, keeping the
`version == manifest.generatedBy` invariant (`scripts/check.mjs:184-194`)
true through the migration. The no-CHANGELOG half of the rule is unaffected:
merged PRs and npm history remain the record (`CONTRIBUTING.md`, Publishing —
version-mirror paragraph; `docs/vendor-sync.md`, "Versioning: a strict
mirror").

#### Scenario: Hotfix window with no upstream release

- **WHEN** a fix must ship before upstream OpenSpec releases again
- **THEN** maintainers dispatch vendor-sync manually; if it produces no PR
  with a new publishable number, the tag is held until the CLI version
  catches up (`CONTRIBUTING.md`, Publishing — "Consequence of strict
  mirroring" paragraph)

#### Scenario: Migration change moves the mirror version

- **WHEN** a migration change moves the vendored CLI's major layout — this
  change: `1.17.0` → `2.0.0`, with `vendor/openspec/**` regenerated and
  `package.json` `version` bumped in the same branch
- **THEN** `node scripts/check.mjs` passes the mirror invariant
  (`version == manifest.generatedBy == 2.0.0`), the branch adds no CHANGELOG
  file, and the daily `vendor-sync` workflow keeps its exclusive-mover role
  for every non-migration change
