# Design — add-comparison-freshness-check

Short by intent: one script, one test file, one workflow. The sections
below pin every decision the spec leaves open — seams, classification
table, env contract, URL extraction, README presence contract, audit
summary, issue mechanics, workflow shape.

## Invocation modes and test seams

`scripts/check-comparison.mjs`, Node builtins only (`node:fs`,
`node:path`, `node:url`, global `fetch`):

| Mode  | Invocation                                                                                 | Behavior                                                                                                                                                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| check | `node scripts/check-comparison.mjs [--readme <path>] [--report <path>] [--summary <path>]` | read the env contract and the README (URL set + presence substrings) → verify → print `comparison-check:` lines; exit 0/1/2; on DRIFT with `--report`, write the issue-body markdown to `<path>`; with `--summary`, append the audit summary to `<path>` on EVERY classification |
| issue | `node scripts/check-comparison.mjs --report-issue <path>`                                  | read the report file; dedup/create/update the single `comparison-drift` issue via REST; exit 0, or 2 on any REST/environment failure; `--summary` is ignored here, as `--readme`/`--report` already are                                                                          |

Environment seams (base-URL defaults pinned so tests never touch the
internet; the three expectation variables have no defaults — see "Env
contract"):

| Variable                  | Default                      | Purpose                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `COMPARISON_NPM_REGISTRY` | `https://registry.npmjs.org` | registry base for classes 1 and 3                                                                                                                                                                                                                                                                                                                                       |
| `COMPARISON_GITHUB_API`   | `https://api.github.com`     | commits-endpoint base for class 2; the fake REST endpoint in issue-mode tests                                                                                                                                                                                                                                                                                           |
| `EXPECT_PACKAGES`         | — (required in check mode)   | comma-separated `name@version` expectations; the workflow job env block pins the production values                                                                                                                                                                                                                                                                      |
| `ABSENT_PACKAGES`         | — (required in check mode)   | comma-separated package names expected to 404 on the registry                                                                                                                                                                                                                                                                                                           |
| `SINGLE_COMMIT_REPO`      | — (required in check mode)   | `owner/repo@YYYY-MM-DD` single-commit expectation                                                                                                                                                                                                                                                                                                                       |
| `GITHUB_TOKEN`            | —                            | optional in check mode (adds `Authorization: Bearer` to api.github.com calls, keeping the run off the 60/h anonymous pool from shared runner IPs); required in issue mode. Supply source: the workflow's job-level `env: GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` block (Actions does not export it automatically); locally it stays unset unless the user exports it |
| `GITHUB_REPOSITORY`       | —                            | `owner/repo`, required in issue mode                                                                                                                                                                                                                                                                                                                                    |

The three expectation variables have no script-level defaults: the
workflow's job env block is their only production source, and check
mode treats an unset or empty variable as an UNAVAILABLE finding
naming it — a run missing its expectations fails loudly instead of
silently checking only links. Tests set all three per case to values
the fixture server answers.

Fixture tests point both base variables at one local `node:http`
server on 127.0.0.1 and use a closed port for the unreachable case
(bind port 0, record the port, close, then use it). Tiny fixture
READMEs hold the liveness URLs — pointing at the local server — plus
the presence substrings for the case's env values; no table markup is
needed, because structure is never parsed.

## Env contract

Formats and pinned values (2026-10-17, equal to the README table they
mirror; the workflow job env block carries them verbatim):

| Variable             | Format                         | Pinned value                                                                                           |
| -------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `EXPECT_PACKAGES`    | comma-separated `name@version` | `opencode-plugin-openspec@0.1.4,@moyaspace/openspec-superpowers-opencode@1.1.1,@lininn/openflow@0.5.2` |
| `ABSENT_PACKAGES`    | comma-separated names          | `opencode-openspec`                                                                                    |
| `SINGLE_COMMIT_REPO` | `owner/repo@YYYY-MM-DD`        | `AngDrew/opencode-openspec@2026-02-01`                                                                 |

Parsing rules:

- Split each value on `,`; trim whitespace per segment.
- `name@version`: split on the LAST `@` —
  `entry.slice(0, entry.lastIndexOf("@"))` is the name,
  `entry.slice(entry.lastIndexOf("@") + 1)` the version — because
  scoped names contain `@` themselves
  (`@moyaspace/openspec-superpowers-opencode@1.1.1` → name
  `@moyaspace/openspec-superpowers-opencode`, version `1.1.1`).
- `ABSENT_PACKAGES` segments are whole package names — no `@` split;
  a scoped absent name would be valid as-is. Validation is non-empty
  only, keeping the script simple.
- `SINGLE_COMMIT_REPO`: the same last-`@` split; the left side must be
  `owner/repo` (exactly two non-empty segments), the right side must
  match `\d{4}-\d{2}-\d{2}` (format check only, no calendar
  validation).
- No self-package entry: `@alexeyco/opencode-openspec`'s version is
  machine-owned by the vendor-sync mirror and out of scope.

Validation errors — each is an UNAVAILABLE finding naming the
variable and, where one exists, the offending entry (the same loudness
principle the retired README parser carried, new source); never a
silent skip:

- a variable unset or empty in check mode;
- a package entry without `@`, or with an empty name or version
  segment (an empty segment from a doubled or trailing comma counts);
- an `owner/repo` side that is not two non-empty segments, or a bad
  date.

The exact values are drift-maintenance data, not spec: resolving a
drift finding means updating BOTH the README table and these env lines
(the dual-update rule, pinned user decision); the next monthly run
re-verifies the pair against the live sources.

## Drift classification

Pinned precedence: UNAVAILABLE beats DRIFT for the exit code — a run
that could not reach its sources cannot vouch for the table; both
finding lists still print, and on exit 2 the workflow leaves the issue
untouched.

| Source                                                                 | Signal                                                                                           | Class                                                                 |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| registry GET, `EXPECT_PACKAGES` entry                                  | 200, `dist-tags.latest` equals the entry's version                                               | clean                                                                 |
| registry GET, `EXPECT_PACKAGES` entry                                  | 200, `latest` differs; or 404 (package gone)                                                     | DRIFT                                                                 |
| registry GET, `ABSENT_PACKAGES` entry                                  | 404                                                                                              | clean                                                                 |
| registry GET, `ABSENT_PACKAGES` entry                                  | 200 (package got published)                                                                      | DRIFT                                                                 |
| commits GET, `SINGLE_COMMIT_REPO` entry                                | length 1 and `commit.committer.date[:10]` equals the entry's date                                | clean                                                                 |
| commits GET                                                            | length ≠ 1, or date differs                                                                      | DRIFT                                                                 |
| non-npm HEAD                                                           | final 2xx (redirects followed)                                                                   | alive                                                                 |
| non-npm HEAD                                                           | final 404                                                                                        | DRIFT (dead link)                                                     |
| non-npm HEAD                                                           | 403 challenge or any other 4xx; 5xx after the retry                                              | UNAVAILABLE                                                           |
| npm-mapped GET (`www.npmjs.com/package/<x>`, `registry.npmjs.org/<x>`) | 200 or 404                                                                                       | alive — the registry answered; version truth belongs to class 1       |
| npm-mapped GET                                                         | any other status after the retry                                                                 | UNAVAILABLE                                                           |
| any fetch                                                              | transport error or timeout after the single retry                                                | UNAVAILABLE                                                           |
| env contract                                                           | variable unset or empty; entry without `@`; empty name/version segment; bad `owner/repo` or date | UNAVAILABLE (names the variable and entry)                            |
| README presence (substring search, no network)                         | every pinned substring found — the version pair on one line                                      | clean                                                                 |
| README presence                                                        | a pinned substring missing                                                                       | DRIFT (`README claim not found for <entry>`, source: the README path) |

Finding subjects name the env source, not a table cell:
`EXPECT_PACKAGES <pkg>`, `ABSENT_PACKAGES <pkg>`,
`SINGLE_COMMIT_REPO <owner>/<repo>`, and the raw entry for validation
findings; presence findings read
`README claim not found for <VARIABLE> <entry>` with the README path as
source; every other finding's source stays the live URL. Registry GETs
are deduplicated per package across classes 1 and 3 (one request per
package per run); with the single `SINGLE_COMMIT_REPO` entry the
commits call happens exactly once, so the old footnote-dedupe cache is
deleted.

Retry policy: `AbortSignal.timeout(10_000)` per attempt; exactly one
retry after 2000 ms on transport error, 429, or 5xx; every other
status is final (a 403 challenge is not retried and not GET-fallbacked
— pinned user decision).

Registry payload: send `Accept:
application/vnd.npm.install-v1+json` (abbreviated packument — probed
2026-10-17: `curl -s -H "Accept: application/vnd.npm.install-v1+json"
https://registry.npmjs.org/@lininn/openflow` →
`"dist-tags":{"beta":"0.4.6-beta.0","latest":"0.5.2"}` at a fraction
of the full document's size).

## URL extraction

The README contributes exactly two things to the run, both from one
read: the liveness URL set —
``matchAll(/https?:\/\/[^\s)"'`<>]+/g)`` over the whole file,
deduplicated (17 unique URLs as of 2026-10-17; the pattern excludes
the markdown-link closing paren) — and the text the presence checks
search (next section). The `https?:` superset exists so offline
fixtures can point liveness URLs at the local `http://127.0.0.1`
server; the committed README has no `http:` URLs, so the live set is
unchanged. The comparison table's structure — rows, columns, cell
shapes, footnote grammar — is never parsed; every expected value comes
from the env contract above. An unreadable `--readme` file stays an
environment failure: prefixed line, exit 2.

## README presence contract

Each env expectation must also appear in the README — a pure substring
search over the text already read for URL extraction: one read, no
network, no parser, case-sensitive exact matches. Pinned substring
table:

| Env source                             | README must contain                                       | Scope                                                           |
| -------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| `EXPECT_PACKAGES` entry `name@version` | `www.npmjs.com/package/<name>` and the token `v<version>` | both on ONE line (newline-split; scoped names appear literally) |
| `ABSENT_PACKAGES` entry `name`         | `Not published` and `registry.npmjs.org/<name>`           | each anywhere — two independent checks                          |
| `SINGLE_COMMIT_REPO` `owner/repo@date` | `single commit (<date>` and `github.com/<owner>/<repo>`   | each anywhere — two independent checks                          |

Rules and edges:

- DRIFT, never UNAVAILABLE: the file was readable, the claim is
  absent. UNAVAILABLE stays reserved for an unreadable README and
  env-format problems.
- Finding shape: class `readme-claim`, subject
  `README claim not found for <VARIABLE> <entry>`, expected lists the
  searched substring(s), found states the miss (`no line carrying
both` / `substring absent`), source is the README path.
- Reformatting tolerance: the version pair is line-scoped, not
  cell-scoped or position-scoped — spacing, cell boundaries, and
  column order may change freely as long as one line carries both
  tokens. The absent/commit pairs are file-scoped on purpose: the
  table cell carries `Not published`, the footnote carries the
  registry URL and the commit date — requiring one shared line would
  re-introduce the layout coupling the revision deleted.
- Substring semantics, deliberately dumb: `v0.1.4` is found inside
  `v0.1.40`, so a longer version containing the expected token passes
  presence — harmless, because class 1 judges version truth against
  the live registry and presence only asserts the claim exists.
- This is what catches README table typos: the table reading `v0.5.3`
  while env and live registry say `0.5.2` leaves no line with
  `www.npmjs.com/package/@lininn/openflow` + `v0.5.2` → DRIFT.
- The committed README satisfies the contract today: the `npm package`
  row (`README.md:76`) carries all three URL+`v<version>` pairs on one
  line plus `Not published — registry 404[^14]`; the footnotes
  (`README.md:61,78`) carry `registry.npmjs.org/opencode-openspec`,
  `single commit (2026-02-01`, and
  `github.com/AngDrew/opencode-openspec`.

## Audit summary

`--summary <path>` appends a markdown audit report after the checks
run — ALWAYS: clean, drift, and unavailable runs alike write it,
because the trail exists exactly for the clean runs that file no issue
and whose run logs expire with retention. Actions injects
`$GITHUB_STEP_SUMMARY` per step and renders the file as the job's
summary in the run UI; the flag is only passed by the workflow, the
path need not exist beforehand (append creates it), and the script
never reads `GITHUB_STEP_SUMMARY` from the environment itself — the
workflow's shell expands it into the argument. Append, not overwrite
(`appendFileSync` joins the `node:fs` import): `$GITHUB_STEP_SUMMARY`
is an accumulation channel in Actions, and the script must not clobber
content any other step wrote. Issue mode ignores the flag, consistent
with `--readme`/`--report` already being ignored there — no new
argument-combination validation.

Data seam: findings alone cannot feed the tables — a clean check
returns `[]` today and leaves no trace — so every per-item check also
records a result row `{ table, item, expected, found, verdict }` while
it runs. Findings stay the stdout / exit-code / `--report` surface
unchanged; the rows feed only the summary. Verdicts: `ok` / `drift` /
`unavailable` for the registry and commits rows, `yes` / `no` for
presence rows, `alive` / `drift` / `unavailable` for liveness rows.
Presence rows sit at finding granularity: one row per `EXPECT_PACKAGES`
entry (the combined one-line pair is one check) and one row per
searched substring for `ABSENT_PACKAGES` and `SINGLE_COMMIT_REPO`.
Liveness rows show the effective final status — the registry GET's
status suffixed `(registry GET)` for npm-mapped URLs, the
final-after-redirects status for HEADs, `fetch failed (<code>)` for
transport errors. Env-validation findings get no row of their own —
their entry was dropped before any check ran — so they surface through
the expectations-as-given section (the malformed value verbatim,
`(unset)` when unset), a no-checks-ran line under any table left
without rows, and the classification counts.

Content shape — headings, column names, and the classification line
are pinned; cells are illustrative:

```markdown
# comparison-check — run summary

Checked at: 2026-11-01T06:00:12.345Z

Expectations as given:

- `EXPECT_PACKAGES`: opencode-plugin-openspec@0.1.4
- `ABSENT_PACKAGES`: opencode-openspec
- `SINGLE_COMMIT_REPO`: AngDrew/opencode-openspec@2026-02-01

## Registry checks

| Package                  | Expected            | Found | Verdict |
| ------------------------ | ------------------- | ----- | ------- |
| opencode-plugin-openspec | 0.1.4               | 0.1.4 | ok      |
| opencode-openspec        | 404 (not published) | 404   | ok      |

## GitHub commits check

| Repo                      | Expected                            | Found                | Verdict |
| ------------------------- | ----------------------------------- | -------------------- | ------- |
| AngDrew/opencode-openspec | 1 commit, committer date 2026-02-01 | 1 commit, 2026-02-01 | ok      |

## README presence

| Entry                                                   | Substring(s) searched                                                             | Found |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- | ----- |
| EXPECT_PACKAGES opencode-plugin-openspec@0.1.4          | one line containing "www.npmjs.com/package/opencode-plugin-openspec" and "v0.1.4" | yes   |
| ABSENT_PACKAGES opencode-openspec                       | Not published                                                                     | yes   |
| ABSENT_PACKAGES opencode-openspec                       | registry.npmjs.org/opencode-openspec                                              | yes   |
| SINGLE_COMMIT_REPO AngDrew/opencode-openspec@2026-02-01 | single commit (2026-02-01                                                         | yes   |
| SINGLE_COMMIT_REPO AngDrew/opencode-openspec@2026-02-01 | github.com/AngDrew/opencode-openspec                                              | yes   |

## Link liveness

| URL                                                    | Final status       | Verdict |
| ------------------------------------------------------ | ------------------ | ------- |
| https://www.npmjs.com/package/opencode-plugin-openspec | 200 (registry GET) | alive   |
| https://nodejs.org                                     | 200                | alive   |

Classification: clean — 10 checks, 0 drift, 0 unavailable
```

Rules:

- Always-on: the summary is rendered from the check findings and
  written BEFORE the exit-code decision, including on the clean
  early-exit path, which must write before it says `comparison-check:
ok` and exits 0. A successful write prints nothing to stdout and
  changes no exit code.
- The unreadable-`--readme` branch — exit 2 before any check ran —
  writes its summary before the prefixed line and exit 2: the same
  header, `Checked at:` line, and expectations-as-given entries, `_No
checks ran._` under all four class headings, and the classification
  `unavailable — 0 checks, 0 drift, 1 unavailable` (the read failure
  itself is the one unavailable); a failed write there changes nothing
  — the original exit 2 stands, no recursion.
- Write failure pushes an UNAVAILABLE finding — class `summary`,
  subject the path, expected `a writable summary file`, found the
  error message, source the path — which forces exit 2 through the
  existing dominance rule. The file's own classification line was
  rendered before the attempt, so stdout counts and summary counts can
  only diverge when no summary file exists at all.
- Classification line: `Classification: clean — <N> checks, 0 drift, 0
unavailable` / `drift — <N> checks, <D> drift, 0 unavailable` /
  `unavailable — <N> checks, <D> drift, <U> unavailable`. `<N>` counts
  result rows across the four tables; `<D>`/`<U>` count findings by
  severity, env-validation findings included; the word follows the
  exit code's dominance rule.
- Secret exclusion: the renderer's only environment reads are the
  three expectation variables by name — `process.env` is never
  iterated — so `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, and anything else
  exported cannot leak into the file. Fetch error messages carry no
  request headers, so the `Authorization: Bearer` value cannot ride a
  `found` cell either. The fake-token test (tasks 2.6) pins this.
- The summary is not an alarm: the issue body still comes from
  `--report` alone, and the summary files nothing.

## Issue mechanics

Fixed title `README comparison drift`; label `comparison-drift`
(probed absent on 2026-10-17 → auto-created by the first POST; see the
proposal's ASSUMPTION). Body (the finding table and timestamp are
written by `--report`; `--report-issue` replaces the plain `GitHub run`
number with the run URL built from `GITHUB_SERVER_URL`,
`GITHUB_REPOSITORY`, and `GITHUB_RUN_ID` when those env vars are
present — always in the workflow, never locally):

```markdown
The monthly comparison-freshness check found drift in the README
`## Comparison` section (run 2026-11-01T06:00:12Z, GitHub run 123456).

| Class        | Expectation / link                                                | Expected                                                                  | Found        | Source                                              |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------ | --------------------------------------------------- |
| version      | EXPECT_PACKAGES opencode-plugin-openspec                          | 0.1.4                                                                     | 0.2.0        | https://registry.npmjs.org/opencode-plugin-openspec |
| readme-claim | README claim not found for EXPECT_PACKAGES @lininn/openflow@0.5.2 | one line containing "www.npmjs.com/package/@lininn/openflow" and "v0.5.2" | no such line | README.md                                           |

Fix: update the README table and the workflow env lines (and the
checked-date line), then close this issue — the next monthly run
re-files if drift persists.
```

Against the landed shape, two body details change with the contract:
the subject column header reads `Expectation / link` (was `Cell /
link`) and the Fix line directs the dual update — README table plus
workflow env lines. Title, label, intro sentence, timestamp/run-URL
rewrite, dedup, and the REST flow are unchanged:

1. `GET /repos/{owner}/{repo}/issues?labels=comparison-drift&state=open`
2. hit → `PATCH /repos/{owner}/{repo}/issues/{number}` (body only; the
   title stays fixed) · miss → `POST /repos/{owner}/{repo}/issues`
   (title, `labels: ["comparison-drift"]`, body)

every call with `Authorization: Bearer $GITHUB_TOKEN`,
`Accept: application/vnd.github+json`,
`X-GitHub-Api-Version: 2022-11-28`. Non-2xx on any call → prefixed
`comparison-check:` line and exit 2 (the alarm failing to fire is an
environment failure, red run).

## Workflow decisions

- No `npm ci` and no `cache: npm` — the script imports builtins only;
  `actions/setup-node@v7` with `node-version: 22` matches `ci.yml` and
  `vendor-sync.yml`.
- Green-on-drift is wired by capturing the exit code inside the step
  (`set +e` … `code=$?` … `echo "code=$code" >> "$GITHUB_OUTPUT"` …
  `exit 0`), then a conditional issue step (`code == '1'`) and a
  conditional fail step (`code == '2'`, `run: exit 1` with an
  explanatory stderr line).
- Unknown-exit-code guard: immediately after `code=$?`, the check step
  runs `case "$code" in 0|1|2) ;; *) echo "comparison-check: unknown
exit code $code" >&2; exit "$code";; esac` — a code outside
  {0, 1, 2} (127 when `node` is missing, 137 when the process is
  killed) reddens the run at the check step itself, and since both
  conditional steps key on the exact codes `'1'`/`'2'`, neither runs:
  no issue is filed on an unknown code. (The earlier draft's
  `[[ 0 1 2 =~ $code ]]` is rejected by bash's parser — the `=~`
  left operand must be a single word — and its quoted workaround
  `[[ "0 1 2" =~ $code ]]` matches by substring, misclassifying e.g.
  137 as known; the `case` form is exact membership, verified on
  0/1/2 → pass, 12/127/137 → reddens.)
- Top-level `concurrency: group: comparison-freshness` with
  `cancel-in-progress: false` — serializes a `workflow_dispatch` run
  against the scheduled one. The single-issue guarantee is race-free
  only under serialization: two concurrent runs could both see zero
  open `comparison-drift` issues in the dedup GET and both POST.
- Top-level `permissions: contents: read / issues: write` — no
  existing workflow declares `issues: write`; `vendor-sync.yml:10-12`
  is the precedent for explicit top-level permissions.
- The job-level `env:` block on the single job carries the whole
  contract: `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` — GitHub
  Actions does **not** export the token as an environment variable
  automatically, and the repo's precedent for explicit secret-to-env
  mapping is `publish.yml:27-28`
  (`NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`) — plus the three
  expectation variables at the pinned Env-contract values, with a
  comment marking them and the README table as the dual-update pair.
  `GITHUB_TOKEN` sits at job level, not step level, because both
  consumers need it — the check step's commits call (authenticated
  5000/h instead of the shared-runner-IP anonymous 60/h) and the issue
  step's REST calls; the expectation variables are consumed by the
  check step alone, and keeping the whole contract in one block is
  simpler than splitting it.
- The env block was the env-contract revision's only diff against the
  landed yaml: cron `"0 6 1 * *"` (06:00 UTC on day 1, monthly — it
  shares the 06 hour with vendor-sync's daily `"17 6 * * *"`
  (`vendor-sync.yml:4-7`) but differs in minute and day-of-month, so
  the two never fire in the same minute), `workflow_dispatch`,
  `concurrency`, `permissions`, steps, and both guards stay exactly as
  landed. The audit-summary revision's only yaml diff is the check
  step's run line (plus one comment line): guards, env block,
  `concurrency`, `permissions`, cron, dispatch, and the issue and fail
  steps all stay as landed.
- The check step runs `node scripts/check-comparison.mjs --report
drift-report.md --summary "$GITHUB_STEP_SUMMARY"` at the checkout
  root; `drift-report.md` is an untracked run artifact and is never
  committed. Actions sets `GITHUB_STEP_SUMMARY` in every step and
  renders whatever the step appends to it as the job summary in the
  run UI, so every run — clean ones included — leaves its audit
  tables there; the variable does not exist locally, which is why the
  flag is only ever passed by the workflow. Were it somehow empty, the
  script's argument validation (`--summary requires a path`) exits 2
  loudly instead of skipping the audit silently.

## Trade-offs decided

- Env-hardcoded expectations instead of README parsing (pinned user
  decision, reversing the original parse-the-README design): the
  structural parse coupling to the sibling change's table format is
  gone — a reworded cell, a renumbered footnote, or a changed self
  column can no longer break the gate — and the table parser, the
  self-column rule, and the footnote grammar are deleted from the
  script. The env-only draft's cost — a README typo going uncaught —
  is CLOSED by the presence class ("README presence contract" above,
  user-requested): every env expectation must also appear in the
  README as a pinned substring, so a table reading `v0.5.3` while env
  and live sources say `0.5.2` drifts loudly. Residual hole, accepted:
  presence is token-shaped — the README must keep the literal shapes
  `www.npmjs.com/package/<name>` + `v<X.Y.Z>` on one line,
  `Not published`, `registry.npmjs.org/<name>`,
  `single commit (<YYYY-MM-DD>`, `github.com/<owner>/<repo>` — and a
  correct claim elsewhere in the file can mask a wrong table cell
  (the one-line rule for version pairs bounds but does not eliminate
  this). A sibling rewording that drops a pinned shape fires a loud
  false-positive drift, never a silent pass. The dual-update rule
  stands: drift resolution updates BOTH the README and the env lines
  (see the proposal's Risks).
- An unset or empty expectation variable is UNAVAILABLE, not a
  links-only run: a green run that silently checked nothing is worse
  than a red one.
- UNAVAILABLE dominates DRIFT (exit 2, issue untouched): red is loud,
  and half-reachable sources could file a misleading issue.
- A 404 from a registry-mapped URL is alive, not a dead link: the
  README's own footnotes cite `registry.npmjs.org/opencode-openspec`
  as 404 evidence — flagging that URL as dead would contradict the
  table's own claim. The `ABSENT_PACKAGES` check alone judges the 404.
- HEAD-only liveness with no GET fallback (pinned user decision);
  a 403 from a non-npm domain is UNAVAILABLE, never DRIFT.
- `commit.committer.date` is the date field (probed equal to the
  author date on the single-commit repo: `2026-02-01T05:47:42Z`).
- Issue mode lives in the same script, not a second file: one
  `comparison-check:` output surface, one prettier target, and the
  repo has no scripts/lib import precedent.
- Tests spawn the script as a subprocess (`spawn(process.execPath, …)`
  — asynchronously, so the fixture server stays responsive while the
  child fetches) instead of importing it: the contract under test is
  the exit code and printed lines, and spawning keeps the script free
  of export-shape constraints.
