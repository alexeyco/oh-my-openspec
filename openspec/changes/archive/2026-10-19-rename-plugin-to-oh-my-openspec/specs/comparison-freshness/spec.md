# comparison-freshness — delta for rename-plugin-to-oh-my-openspec

## MODIFIED Requirements

### Requirement: Expectations live in the workflow environment

The expected values `scripts/check-comparison.mjs` verifies SHALL come
from three environment variables — pinned by the job-level `env` block
of `.github/workflows/comparison-freshness.yml` — and never from the
comparison table's text:

1. `EXPECT_PACKAGES`: a comma-separated list of `name@version` entries.
   Scoped package names contain `@` themselves, so each entry SHALL be
   split on the LAST `@`: everything before it is the package name,
   everything after is the expected `dist-tags.latest` version. This
   package's own version is machine-owned by the vendor-sync mirror, so
   the list carries no `oh-my-openspec` self entry.
2. `ABSENT_PACKAGES`: a comma-separated list of package names expected
   to answer 404 on the registry.
3. `SINGLE_COMMIT_REPO`: a single `owner/repo@YYYY-MM-DD` entry — the
   repo expected to hold exactly one commit with that committer date
   (the same last-`@` split rule).

Whitespace around segments SHALL be trimmed. A malformed env string
SHALL never be skipped silently: a package entry without `@`, an empty
name or version segment, an `owner/repo` side that is not two non-empty
segments, a date that is not `YYYY-MM-DD`-shaped
(`\d{4}-\d{2}-\d{2}`, format-checked only), or — in check mode — any
of the three variables
unset or empty SHALL each yield an UNAVAILABLE finding (exit 2) naming
the variable and, where one exists, the offending entry.

The README (default: the working-tree file at the repo root,
overridable with `--readme <path>`) SHALL be read only for the liveness
URL set and the claim-presence substrings — never parsed for structure:
every `http:`/`https:` URL anywhere in the whole file — not only the
Comparison section — joins the deduplicated link-liveness set, and the
same single read supplies the text the presence checks search
(requirement "Four fact classes are verified against live sources and
the README"). The comparison table's layout, cell shapes, and footnote
grammar SHALL NOT be consulted; every expected value comes from the
env contract above.

The workflow's job-level `env` block SHALL set the three variables to
the pinned expectation values alongside the existing `GITHUB_TOKEN`
mapping. The exact values are drift-maintenance data, updated together
with the README table when a drift issue is resolved (dual-update
rule), so the values themselves are not spec. The rename leaves the
pinned values untouched: `ABSENT_PACKAGES: opencode-openspec` and
`SINGLE_COMMIT_REPO: AngDrew/opencode-openspec@2026-02-01`
(.github/workflows/comparison-freshness.yml:45-46) name the third-party
AngDrew package, not this one.

#### Scenario: Env version entry yields registry expectation

- **WHEN** `EXPECT_PACKAGES` contains `opencode-plugin-openspec@0.1.4`
- **THEN** the script expects `dist-tags.latest` = `0.1.4` for package
  `opencode-plugin-openspec`, both values taken from that entry — a
  test-local registry answering `0.1.4` makes the run clean, any other
  version makes it DRIFT

#### Scenario: Scoped names split on the last @

- **WHEN** `EXPECT_PACKAGES` contains
  `@moyaspace/openspec-superpowers-opencode@1.1.1`
- **THEN** the entry splits on the LAST `@` into name
  `@moyaspace/openspec-superpowers-opencode` and version `1.1.1`, and
  the registry GET goes to
  `<registry-base>/@moyaspace/openspec-superpowers-opencode`

#### Scenario: Env absent entry yields 404 expectation

- **WHEN** `ABSENT_PACKAGES` names `opencode-openspec`
- **THEN** the script expects GET `<registry-base>/opencode-openspec`
  to answer 404; a 404 verifies clean and a 200 with a
  `dist-tags.latest` is DRIFT (expected `404 (not published)`, found
  the version)

#### Scenario: Env commit entry yields single-commit expectation

- **WHEN** `SINGLE_COMMIT_REPO` reads
  `AngDrew/opencode-openspec@2026-02-01`
- **THEN** the script expects the commits listing of
  `AngDrew/opencode-openspec` to have length 1 with committer date
  `2026-02-01` — no repo name or date appears in the script source

#### Scenario: Malformed env entry is loud, never skipped

- **WHEN** an `EXPECT_PACKAGES` entry reads `opencode-plugin-openspec`
  (no `@`), or `SINGLE_COMMIT_REPO` reads
  `AngDrew/opencode-openspec@02-2026` (bad date), or one of the three
  variables is unset or empty in check mode
- **THEN** the script exits 2 and prints a `comparison-check:` `✗`
  line naming the variable and the offending entry; it never exits 0
  or 1 having skipped it

#### Scenario: Presence checks are substring, not structural

- **WHEN** a fixture README's table row is reformatted — spacing or cell
  boundaries changed — but one line still contains both
  `www.npmjs.com/package/opencode-plugin-openspec` and `v0.1.4`, and
  the absent-claim and commit-claim substrings appear anywhere in the
  file
- **THEN** the presence checks pass — layout-insensitive, no structure
  parsed; only a missing substring (e.g. a wrong version digit on
  every line carrying the package URL, a renamed `Not published`
  claim) turns them into DRIFT naming the entry

#### Scenario: The workflow job env block carries the three variables

- **WHEN** the job-level `env` block of
  `.github/workflows/comparison-freshness.yml` is read
- **THEN** it sets `EXPECT_PACKAGES`, `ABSENT_PACKAGES`, and
  `SINGLE_COMMIT_REPO` in the formats above and leaves the existing
  `GITHUB_TOKEN` mapping unchanged
