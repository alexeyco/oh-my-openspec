# Tasks: prepare Codex plugin for catalog submission

## 1. Catalog-compatible generated bundle

- [x] 1.1 Add `codex/assets/icon.svg` as a text-free square SVG at least
      48 by 48 and under 50 KiB; add it to `codex/render.ts` as
      `assets/icon.svg`; add the typed `interface.displayName`,
      `interface.shortDescription`, and `interface.composerIcon` metadata
      in `codex/manifest.ts`; run `make codex`; update
      `tests/codex-bundle.test.ts` to expect 31 files, allow `interface`,
      and assert that the icon path resolves to the generated SVG; update
      the bundle count comments in `codex/render.ts` and
      `tests/codex-bundle.test.ts`, the inventory and acceptance checklist
      in `docs/codex.md`, and the generated bundle requirement in
      `openspec/specs/codex-host-integration/spec.md`. Scenarios: "Catalog interface references the bundled icon" and "Bundle matches fresh render byte-for-byte".
- [x] 1.2 Create a separate temporary directory and use it as
      `CODEX_HOME` before running the Codex CLI installation acceptance
      steps against the local marketplace checkout; do not touch the
      user's `~/.codex`. Update the `docs/codex.md` acceptance checklist
      version to Codex CLI 0.164.0 and sync the
      `Marketplace install succeeds on Codex 0.164.0` scenario
      identifier and `WHEN` wording in
      `openspec/specs/codex-host-integration/spec.md` to use Codex CLI
      0.164.0 and `codex plugin marketplace add <local-checkout-path>`.
      Verify the installed bundle has 31 files and its
      `interface.composerIcon` path resolves inside the plugin cache,
      then remove the temporary directory. Scenario:
      "Marketplace install succeeds on Codex 0.164.0".

## 2. Vulnerability reporting policy

- [x] 2.1 Add root `SECURITY.md` with the GitHub Security Advisories
      private-reporting route and a request not to disclose unpatched
      vulnerabilities in public issues. Scenario: "Security policy gives a private reporting route".

## 3. Immutable GitHub Actions and scanner CI

- [x] 3.1 Replace mutable Action tags with full commit SHAs in
      `.github/workflows/ci.yml`,
      `.github/workflows/comparison-freshness.yml`,
      `.github/workflows/publish.yml`, and
      `.github/workflows/vendor-sync.yml`; keep release-version comments
      and preserve the vendor-sync provenance line. Scenario: "All workflow actions use immutable references".
- [x] 3.2 Add `.github/workflows/hol-plugin-scanner.yml` with the
      catalog-reviewed scanner action pinned by SHA, pull request and
      `master` push triggers, `min_score: 80`, SARIF output/upload, and
      the required least permissions. Scenario: "Scanner checks pull requests and default-branch pushes".

## 4. Verify catalog submission readiness

- [x] 4.1 Run `make fmt`, `make check`, and `npm pack --dry-run`; confirm
      the bundle test and manifest validation pass and the package allow-list
      remains unchanged. Scenarios: "Bundle matches fresh render byte-for-byte", "Marketplace install succeeds on Codex 0.164.0", and "Vendored bundle copies track the vendor tree".
- [x] 4.2 Inspect every `uses:` entry in `.github/workflows/*.yml` and
      confirm each has a full 40-character commit SHA; confirm the scanner
      workflow sets `min_score: 80`. Scenarios: "All workflow actions use immutable references" and "Scanner checks pull requests and default-branch pushes".
