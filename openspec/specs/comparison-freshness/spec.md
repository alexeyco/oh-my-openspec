# Comparison freshness

## Purpose

The comparison-freshness capability checks selected package and repository claims against live public sources and keeps the README comparison current, while distinguishing genuine drift from unavailable sources.

## Requirements

### Requirement: Expectations live in the workflow environment

The comparison checker SHALL read expected packages, absent packages, and repository commit date from workflow environment variables, splitting scoped package names at the last @ and excluding the plugin's machine-owned version.

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

### Requirement: Four fact classes are verified against live sources and the README

The checker SHALL verify each configured fact class against its live registry or repository source and the README, report unavailable sources separately from drift, and use explicit expectations rather than inferring them from README claims.

#### Scenario: Version drift is flagged with its env entry

- **WHEN** `EXPECT_PACKAGES` claims `opencode-plugin-openspec@9.9.9`
  and the test-local registry answers
  `"dist-tags":{"latest":"0.1.4"}`
- **THEN** the run exits 1 and the DRIFT finding lists the env entry
  (`EXPECT_PACKAGES opencode-plugin-openspec`), expected `9.9.9`,
  found `0.1.4`, and the source URL

#### Scenario: A matching 404 claim verifies clean

- **WHEN** `ABSENT_PACKAGES` names a package and the registry GET
  answers 404
- **THEN** that package produces no finding and contributes to a clean
  exit 0

#### Scenario: A second commit is drift

- **WHEN** the test-local GitHub API answers the commits endpoint with
  a two-element array
- **THEN** the run exits 1 and the finding states expected `1 commit`,
  found `2 commits`, with the repo URL

#### Scenario: A moved commit date is drift

- **WHEN** the API answers one commit whose `commit.committer.date` is
  `2026-03-15T00:00:00Z` while `SINGLE_COMMIT_REPO` reads
  `AngDrew/opencode-openspec@2026-02-01`
- **THEN** the run exits 1 and the finding states expected
  `2026-02-01`, found `2026-03-15`

#### Scenario: One GitHub call per run

- **WHEN** a run executes with `SINGLE_COMMIT_REPO` set
- **THEN** the run issues exactly one request to the commits endpoint —
  the fixture server counts hits

#### Scenario: A dead non-npm link is drift

- **WHEN** a non-npm `https:` URL in the README answers HEAD with a
  final 404 after redirects
- **THEN** the run exits 1 with a dead-link DRIFT finding naming the
  URL

#### Scenario: A registry 404 is not a dead link

- **WHEN** the README footnote URL `registry.npmjs.org/opencode-openspec`
  answers 404 during liveness checking
- **THEN** liveness counts it alive — the registry answered — and only
  class 1's `ABSENT_PACKAGES` expectation judges that 404

#### Scenario: npmjs.com pages are checked via the registry

- **WHEN** the README contains
  `https://www.npmjs.com/package/@lininn/openflow`
- **THEN** the fixture server's request log records no npmjs.com-page
  request and exactly one registry GET for the mapped package
  `<registry-base>/@lininn/openflow`, where a 200 and a 404 both count
  alive

#### Scenario: Version claim present on one line passes

- **WHEN** one README line contains both
  `www.npmjs.com/package/@lininn/openflow` and `v0.5.2` while
  `EXPECT_PACKAGES` holds `@lininn/openflow@0.5.2`
- **THEN** the presence check for that entry produces no finding,
  whatever the table's layout around the two tokens

#### Scenario: A wrong digit in the README is drift

- **WHEN** `EXPECT_PACKAGES` holds `@lininn/openflow@0.5.2` and the
  registry answers `0.5.2`, but no README line containing
  `www.npmjs.com/package/@lininn/openflow` carries `v0.5.2` — the
  table reads `v0.5.3`
- **THEN** the run exits 1 with a DRIFT finding
  `README claim not found for EXPECT_PACKAGES @lininn/openflow@0.5.2`
  printing the searched pair, the README path as source — even though
  env and live source agree

#### Scenario: Absent-claim substrings pass anywhere, missing is drift

- **WHEN** `ABSENT_PACKAGES` names `opencode-openspec` and the README
  carries `Not published` in one place and
  `registry.npmjs.org/opencode-openspec` on another line
- **THEN** the presence check passes — the two substrings are
  independent and layout-insensitive — while a README missing either
  one (a cell no longer saying `Not published`, a footnote losing the
  registry URL) exits 1 with DRIFT naming the entry

#### Scenario: Commit-claim substrings present pass, a moved README date is drift

- **WHEN** `SINGLE_COMMIT_REPO` reads
  `AngDrew/opencode-openspec@2026-02-01` and the README contains
  `single commit (2026-02-01` alongside
  `github.com/AngDrew/opencode-openspec`
- **THEN** the presence check passes — while a README whose footnote
  date was edited to `single commit (2026-03-15`, with env and the
  live API still at `2026-02-01`, exits 1 with DRIFT naming the entry

### Requirement: Exit codes separate clean, drift, and unavailable

The checker SHALL return distinct exit codes for clean results, detected drift, and unavailable sources so CI and issue mode can distinguish actionable changes from network failures.

#### Scenario: Clean run exits zero

- **WHEN** every fixture endpoint answers the env expectations and
  every README URL is alive
- **THEN** the script exits 0 and stdout ends with
  `comparison-check: ok`

#### Scenario: Drift-only run exits one

- **WHEN** the run produces only DRIFT findings
- **THEN** the script exits 1 and each printed finding carries env
  entry, README claim, or link, expected, found, and source

#### Scenario: Unreachable source exits two

- **WHEN** `COMPARISON_NPM_REGISTRY` points at a closed TCP port
  (connection refused, still refused after the single retry)
- **THEN** the script exits 2 with a `✗` line naming the unreachable
  source URL — never exit 0 or 1

#### Scenario: A 403 challenge is unavailable, not drift

- **WHEN** a non-npm domain answers HEAD with a final 403 bot challenge
- **THEN** the finding classifies UNAVAILABLE (exit 2), never dead-link
  DRIFT

#### Scenario: Mixed findings exit two

- **WHEN** one source yields DRIFT and another yields UNAVAILABLE in
  the same run
- **THEN** the script exits 2, the output prints both classes, and the
  workflow leaves any drift issue untouched

### Requirement: A monthly workflow alarms drift as exactly one issue

The monthly workflow SHALL create or update a single GitHub issue when the comparison checker finds drift, deduplicating against an existing open issue and avoiding issue creation for clean or unavailable results.

#### Scenario: Drift files one issue and the run stays green

- **WHEN** a run's check exits 1 and no open `comparison-drift` issue
  exists
- **THEN** the workflow POSTs an issue titled `README comparison drift`
  carrying the findings as body, and the run concludes green (success)

#### Scenario: Repeat drift updates the same issue

- **WHEN** a later run exits 1 and the dedup GET returns an open
  `comparison-drift` issue
- **THEN** the workflow PATCHes that issue's body with the fresh
  findings and creates no second issue

#### Scenario: Unavailable run goes red without touching issues

- **WHEN** a run's check exits 2
- **THEN** the job concludes failed (red) and no issue is created or
  updated, regardless of partial findings

#### Scenario: Unknown exit code fails the run

- **WHEN** the check step captures an exit code outside {0, 1, 2} —
  e.g. 127 (`node` missing) or 137 (process killed)
- **THEN** the step prints a `comparison-check:`-prefixed line and
  exits with that code, reddening the run, and neither the issue
  step's `code == '1'` condition nor the fail step's `code == '2'`
  condition matches — no issue is created or updated

#### Scenario: make check still runs exactly four gates

- **WHEN** a contributor runs `make check` after this change merges
- **THEN** the same four commands run as before (`node
scripts/check.mjs`, `node scripts/sync-vendor.mjs --check`, `npm run
typecheck`, `npm test`) and `scripts/check-comparison.mjs` is not
  among them — `git diff Makefile` is empty

### Requirement: Every run leaves a job-summary audit trail

Every workflow run SHALL write a job summary listing each comparison check and its verdict, including drift or unavailable outcomes, without exposing credentials.

#### Scenario: A clean run's summary lists every check with verdicts

- **WHEN** every fixture endpoint answers the env expectations and
  check mode runs with `--summary <path>`
- **THEN** the script exits 0 with stdout unchanged
  (`comparison-check: ok`), and `<path>` holds the checked-at UTC date,
  the three expectation values as given, all four class tables with a
  row per item — every registry entry with its actual version or 404,
  the commits row, the presence rows found `yes`, the liveness rows
  with their final statuses — and the classification line reading
  `clean` with zero drift and zero unavailable counts

#### Scenario: A drift run's summary names the failing rows, the issue stays the only alarm

- **WHEN** a run with a version-mismatch fixture passes both `--report`
  and `--summary`
- **THEN** the summary's registry table marks the mismatching row
  `drift` with expected and found versions and the classification line
  reads `drift` with the counts, while the outward alarm stays the
  single `comparison-drift` issue filed from the `--report` body — the
  summary files nothing and the flag leaves the report body unchanged

#### Scenario: An unavailable run still writes its audit summary

- **WHEN** a source is unreachable — the registry seam points at a
  closed port, a domain answers a 403 challenge, or an expectation
  variable is malformed — and `--summary <path>` was passed
- **THEN** the run exits 2 (red in the workflow) and `<path>` still
  exists: the affected rows carry the fetch error, status, or malformed
  value with verdict `unavailable`, a class whose entries all failed
  validation shows its no-checks-ran line, and the classification line
  reads `unavailable` — the audit survives the red run

#### Scenario: The summary never contains credentials

- **WHEN** check mode runs with `GITHUB_TOKEN` set — a fake token value
  in tests, exercised against the fixture server so the run's GitHub
  call really happens with the token present — and `--summary <path>`
- **THEN** the written file contains neither the token value nor any
  environment variable beyond the three expectation values as given —
  `GITHUB_TOKEN` and `GITHUB_REPOSITORY` never appear

#### Scenario: Without --summary nothing changes

- **WHEN** check mode runs without the flag, on any classification
- **THEN** no summary file is created and stdout and the exit code are
  byte-identical to the flagless contract — the landed scenarios'
  expected lines (`comparison-check: ok`, the `✗` finding shapes, the
  0/1/2 exits) hold verbatim
