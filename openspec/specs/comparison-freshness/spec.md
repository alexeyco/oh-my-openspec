# Comparison freshness

## Purpose

TBD — update Purpose after archive (the delta carried no Purpose section).

## Requirements

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

### Requirement: Four fact classes are verified against live sources and the README

The script SHALL verify exactly four fact classes and nothing else:

1. **npm registry.** For each `EXPECT_PACKAGES` and `ABSENT_PACKAGES`
   entry, one GET `<registry-base>/<package>` (default
   `https://registry.npmjs.org`, overridable via env
   `COMPARISON_NPM_REGISTRY`) with header
   `Accept: application/vnd.npm.install-v1+json`. Registry GETs SHALL
   be deduplicated per package per run, so a class-1 expectation and a
   liveness URL mapped to the same package share one request. A 200
   response SHALL be compared at `.["dist-tags"].latest` against the
   entry's version; for an `ABSENT_PACKAGES` entry the response status
   SHALL equal 404. A mismatch is DRIFT naming the env entry (variable
   and package), expected value, found value, and source URL.
2. **Single commit.** One GET
   `<github-api-base>/repos/<owner>/<repo>/commits?per_page=2`
   (default `https://api.github.com`, overridable via env
   `COMPARISON_GITHUB_API`; an `Authorization: Bearer <token>` header
   SHALL be added whenever `GITHUB_TOKEN` is set) for the
   `SINGLE_COMMIT_REPO` entry — exactly one commits call per run. An
   array whose length is not 1, or whose first element's
   `commit.committer.date` does not start with the entry's date, is
   DRIFT.
3. **Link liveness.** Every URL of the deduplicated liveness set. URLs
   of the forms `www.npmjs.com/package/<x>` and `registry.npmjs.org/<x>`
   SHALL NOT be fetched directly: each maps to GET
   `<registry-base>/<x>`, where both 200 and 404 mean the registry
   answered — alive, no finding, because version truth belongs to
   class 1. Every other URL SHALL receive one HEAD request with
   redirects followed and no GET fallback: a final 2xx is alive; a
   final 404 is DRIFT (dead link); every other final status — including
   a 403 bot challenge — and every transport failure is UNAVAILABLE.
4. **README claim presence.** A pure substring search over the README
   text already read for the liveness URL set — the same single read,
   no network, no structural parsing; matches are case-sensitive. For
   each `EXPECT_PACKAGES` entry, ONE line of the README SHALL contain
   both `www.npmjs.com/package/<name>` and the token `v<version>`.
   For each `ABSENT_PACKAGES` entry, the README SHALL contain the
   substring `Not published` somewhere AND the substring
   `registry.npmjs.org/<name>` somewhere — two independent checks;
   requiring one shared line would re-introduce layout coupling. For
   the `SINGLE_COMMIT_REPO` entry, the README SHALL contain
   `single commit (<date>` AND `github.com/<owner>/<repo>`. A missing
   substring is DRIFT — the file was readable, the claim is absent —
   never UNAVAILABLE; UNAVAILABLE stays reserved for an unreadable
   README and env-format problems. The finding reads
   `README claim not found for <entry>`, prints the searched
   substring(s), and names the README path as its source.

Each fetch attempt SHALL time out after 10 s (`AbortSignal.timeout`),
and a transport error, 429, or 5xx SHALL be retried exactly once after
2 s before classifying UNAVAILABLE.

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

The script SHALL print every line with the prefix `comparison-check:`
in the failure-list style of `scripts/check.mjs` — one summary line,
then `  ✗ <class> <env entry, README claim, or link>: expected <e>,
found <f> (<source url or README path>)` lines — and SHALL exit:

- `0` when every check ran and no DRIFT finding exists; the final line
  is `comparison-check: ok`.
- `1` when at least one DRIFT finding and no UNAVAILABLE finding
  exists.
- `2` when at least one UNAVAILABLE finding exists, whether or not
  DRIFT findings also exist — UNAVAILABLE dominates the exit code
  because a run that could not reach its sources cannot vouch for the
  table; both classes still print. Malformed env entries and unset or
  empty expectation variables count as UNAVAILABLE findings.

When `--report <path>` is passed and DRIFT findings exist, the script
SHALL write the issue-body markdown — the DRIFT finding list with env
entry, README claim, or link, expected, found, and source — to
`<path>`. Exit-2 output SHALL follow the environment-failure style of
`scripts/sync-vendor.mjs` (prefixed lines, no stack dumps).

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

`.github/workflows/comparison-freshness.yml` SHALL run on `schedule`
with cron `"0 6 1 * *"` and on `workflow_dispatch`, declare top-level
`permissions: contents: read` and `issues: write`, check out the repo,
set up Node 22, and run the script directly — with no `npm ci` step,
because the script imports Node builtins only. The workflow SHALL
capture the script's exit code without failing the step on it, and
then:

- On exit `1` (DRIFT): open or update exactly one issue through the
  GitHub REST API with `GITHUB_TOKEN` — dedup via
  `GET /repos/{owner}/{repo}/issues?labels=comparison-drift&state=open`;
  if an open issue exists, `PATCH` its body to the fresh findings;
  otherwise `POST /repos/{owner}/{repo}/issues` with the fixed title
  `README comparison drift`, label `comparison-drift`, and the finding
  list (env entry, README claim, or link, expected, found, source) as
  body. The job SHALL then finish green — drift is alarmed, not a
  build failure.
- On exit `2` (UNAVAILABLE): fail the job (red run) and create or
  update no issue.
- On exit `0`: finish green with no issue action.

The check step SHALL treat a captured exit code outside {0, 1, 2} —
127 when `node` is missing, 137 when the process is killed — as an
environment failure: it prints a `comparison-check:`-prefixed line and
exits with that code, reddening the run, and because both conditional
steps key on the exact codes `'1'`/`'2'`, no issue is created or
updated. The workflow SHALL declare a `concurrency` group
`comparison-freshness` with `cancel-in-progress: false`, serializing
scheduled and dispatched runs — the exactly-one-issue guarantee is
race-free only under serialization, since two concurrent runs could
both observe zero open issues in the dedup GET and both POST.

The `gh` CLI SHALL NOT be used anywhere in the workflow. The script
SHALL NOT be added to `make check` or to the `ci.yml` push/PR gates —
the four-gate composition
(`openspec/specs/release-publishing/spec.md`, requirement "make check
composes the four repo gates") stays byte-identical.

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

Check mode SHALL accept a `--summary <path>` flag. When the flag is
passed, the script SHALL append a markdown audit report to `<path>`
after the checks run, on every classification — clean, drift, and
unavailable runs alike write it, because the trail exists exactly for
the clean runs that file no issue and whose run logs expire with
retention. A successful summary write SHALL print no stdout line and
SHALL change no exit code; a failed write SHALL be recorded as an
UNAVAILABLE finding naming the path, forcing exit 2 through the
dominance rule. Issue mode SHALL ignore the flag. Without the flag, no
file is written anywhere and stdout and the exit code stay the whole
contract, byte-identical to the flagless behavior.

The summary SHALL contain the checked-at date in UTC, the three
expectation variables' values as given (`(unset)` when unset), one
table per fact class with a row per item — registry checks (package,
expected version or absent-404, actual `dist-tags.latest`, status
code, or fetch error, verdict), the GitHub commits check (repo,
expected count and date, actual, verdict), README presence (entry,
substring(s) searched, found yes/no), and link liveness (URL, final
status, verdict) — and the run's classification line: `clean`,
`drift`, or `unavailable` under the same dominance rule as the exit
code, with the per-severity finding counts. A class whose entries all
failed env validation keeps its table heading and shows a
no-checks-ran line instead of rows.

The summary SHALL carry no credentials and no environment variable
beyond the three expectation variables: `GITHUB_TOKEN` and
`GITHUB_REPOSITORY` are excluded explicitly, and the summary renderer
never reads the environment as a whole. The workflow's check step
SHALL pass `--summary "$GITHUB_STEP_SUMMARY"` — Actions injects the
path and renders the appended markdown as the job summary in the run
UI; the script itself never reads `GITHUB_STEP_SUMMARY` from the
environment.

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
