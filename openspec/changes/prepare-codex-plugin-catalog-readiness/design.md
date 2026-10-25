# Design: Codex plugin catalog readiness

## Approach

Keep the Codex bundle generated from source. Add the icon source at
`codex/assets/icon.svg`; `codex/render.ts` copies its contents into the
bundle as `assets/icon.svg`. Extend `codex/manifest.ts` with an
`interface` object containing `displayName`, `shortDescription`, and
`composerIcon: "./assets/icon.svg"`. Regenerate the bundle with
`make codex` rather than editing `plugins/oh-my-openspec/` directly.

Update `tests/codex-bundle.test.ts` to expect 31 files, allow the
`interface` field, and assert that the manifest icon path resolves to
the generated asset and meets the catalog's size and square-dimension
requirements. Update the file-count comment in `codex/render.ts` and
the file inventory and acceptance checklist in `docs/codex.md` to say
31 files. Update the existing
`Generated Codex plugin bundle and git-marketplace delivery` contract in
the `codex-host-integration` baseline to match the new manifest and file
inventory. Update the acceptance checklist in `docs/codex.md` to Codex
CLI 0.164.0. Run the manual marketplace acceptance with a separately
created temporary `CODEX_HOME`; this leaves persistent user Codex state
unchanged.

Private vulnerability reporting is enabled for the GitHub repository.
Add a root `SECURITY.md` that links to
`https://github.com/alexeyco/oh-my-openspec/security/advisories/new` as
the private disclosure route and discourages public issue disclosure
before a fix is available. The repository setting is already enabled
and is not part of this change.

Pin all existing `uses:` references in the four current workflows to
full commit SHAs, retaining version comments. Add
`.github/workflows/hol-plugin-scanner.yml` using the reviewed scanner
action SHA from the catalog's contribution guide. Run it on pull
requests and pushes to `master`, set `min_score: 80`, and upload SARIF
with the `security-events: write` permission required by that upload.
Preserve `.github/workflows/vendor-sync.yml`'s factual provenance line.

The catalog guide states that its centralized scan is authoritative at
80/100. The local scan instructions elsewhere in that guide contain a
different 80/130 figure; the workflow follows the catalog action
template's `min_score: 80` setting and does not claim a centralized score
before the catalog runs its scan.

## Files

- `codex/manifest.ts` — add the typed catalog interface metadata.
- `codex/assets/icon.svg` — add the square text-free source icon.
- `codex/render.ts` — include the icon in the generated bundle file list.
- `plugins/oh-my-openspec/.codex-plugin/plugin.json` — generated manifest with interface metadata.
- `plugins/oh-my-openspec/assets/icon.svg` — generated icon asset.
- `tests/codex-bundle.test.ts` — update expected bundle files and manifest/icon assertions.
- `docs/codex.md` — update the generated bundle count in its inventory and acceptance checklist.
- `openspec/specs/codex-host-integration/spec.md` — sync the baseline bundle requirement with the catalog metadata and icon.
- `SECURITY.md` — document private vulnerability reporting.
- `.github/workflows/ci.yml` — pin checkout and setup-node.
- `.github/workflows/comparison-freshness.yml` — pin checkout and setup-node.
- `.github/workflows/publish.yml` — pin checkout and setup-node.
- `.github/workflows/vendor-sync.yml` — pin checkout, setup-node, and create-pull-request.
- `.github/workflows/hol-plugin-scanner.yml` — add pinned scanner CI.

## Verification

Run `make codex`, `make fmt`, and `make check`. Confirm the generated
manifest icon path resolves to `assets/icon.svg`, `tests/codex-bundle.test.ts`
checks the 31-file bundle, and every workflow `uses:` value is a full
40-character SHA. Run the Codex CLI 0.164.0 marketplace acceptance with
the isolated temporary `CODEX_HOME`, then remove that directory. Run
`npm pack --dry-run` to check the existing
OpenCode-only package allow-list remains unchanged. The scanner result
remains unverified until the source workflow runs; the catalog's
centralized score is determined by its admission scan.
