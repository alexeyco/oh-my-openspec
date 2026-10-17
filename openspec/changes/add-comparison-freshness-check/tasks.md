# Tasks

## 1. Freshness script

- [x] 1.1 Rewrite the expectation source of `scripts/check-comparison.mjs`
      (landed untracked file from the first implementation pass) to the
      env contract of design.md "Env contract": DELETE the README
      table/footnote parser — `splitTableRow`, `stripMarkdownLinks`,
      `findNpmPackageRow`, `findTableHeader`, `parseNpmCell`,
      `parseCommitFootnote`, the self-column rule, and the footnote
      expectations all go — the presence-substring search added in
      1.2 (d) is NOT a return of this parser: pinned literal
      substrings only, no row/column/footnote grammar. README reading
      reduces to ONE read feeding two consumers: the deduplicated
      URL-set extraction ``matchAll(/https?:\/\/[^\s)"'`<>]+/g)`` per
      design.md "URL extraction" — the regex stays `https?:` with the
      same rationale note (offline fixtures need `http://127.0.0.1`) —
      and the presence-substring search of 1.2 (d);
      an unreadable `--readme` file remains an environment failure
      (prefixed line, exit 2). Add env-contract parsing: split each of
      `EXPECT_PACKAGES`, `ABSENT_PACKAGES`, `SINGLE_COMMIT_REPO` on
      commas with per-segment trim; `name@version` and
      `owner/repo@YYYY-MM-DD` split on the LAST `@`
      (`lastIndexOf("@")` — scoped names contain `@`); validate per
      design.md (entry without `@`, empty name/version segment, bad
      `owner/repo` shape, date not matching `\d{4}-\d{2}-\d{2}`, and
      any of the three variables unset or empty in check mode → an
      UNAVAILABLE finding naming the variable and entry, never a
      silent skip). Update the header comment (usage, two modes, exit
      codes, env seams) to the new contract. The deleted parser
      functions are module-local — the test file spawns the script as
      a subprocess and imports nothing — so after this task
      `grep -rn "findNpmPackageRow\|parseNpmCell\|parseCommitFootnote\|splitTableRow\|stripMarkdownLinks\|findTableHeader" scripts tests`
      returns no matches. Covers scenarios "Env version entry yields
      registry expectation", "Scoped names split on the last @", "Env
      absent entry yields 404 expectation", "Env commit entry yields
      single-commit expectation", "Malformed env entry is loud, never
      skipped", "Presence checks are substring, not structural"
      (structure-is-never-parsed side; search mechanics in 1.2, exit
      behavior in 1.3).
- [x] 1.2 Implement the four check classes against the env
      expectations per design.md "Drift classification" and "README
      presence contract": (a) registry
      GET with header `Accept: application/vnd.npm.install-v1+json`
      per `EXPECT_PACKAGES` entry, compare `.["dist-tags"].latest`
      against the entry's version; per `ABSENT_PACKAGES` entry, expect
      status 404; keep the per-package registry GET cache so class (a)
      and the liveness npm-mapping share one request per package per
      run; (b) exactly one commits GET
      `<github-api>/repos/<owner>/<repo>/commits?per_page=2` for the
      `SINGLE_COMMIT_REPO` entry, compare array length 1 and
      `commit.committer.date` first 10 chars, add
      `Authorization: Bearer $GITHUB_TOKEN` when the env var is set —
      the old footnote-dedupe cache is deleted; (c) liveness unchanged
      — map `www.npmjs.com/package/<x>` and `registry.npmjs.org/<x>`
      to the registry GET where 200 and 404 both mean alive,
      HEAD-with-followed-redirects for every other URL (final 2xx
      alive, final 404 DRIFT, 403/other statuses UNAVAILABLE), no GET
      fallback; (d) README claim presence — a pure case-sensitive
      substring search over the README text already read for (c)'s
      URL set, no network, no parser, per the pinned substring table:
      `EXPECT_PACKAGES` entry `name@version` → ONE line (newline
      split) containing both `www.npmjs.com/package/<name>` and the
      token `v<version>`; `ABSENT_PACKAGES` entry `name` →
      `Not published` anywhere AND `registry.npmjs.org/<name>`
      anywhere (two independent checks); `SINGLE_COMMIT_REPO`
      `owner/repo@date` → `single commit (<date>` anywhere AND
      `github.com/<owner>/<repo>` anywhere. A miss is DRIFT — never
      UNAVAILABLE, which stays reserved for an unreadable README and
      env-format problems — finding class `readme-claim`, subject
      `README claim not found for <VARIABLE> <entry>`, expected lists
      the searched substring(s), source is the README path. Per
      attempt `AbortSignal.timeout(10_000)`; exactly one
      retry after 2000 ms on transport error, 429, or 5xx
      (`fetchWithRetry` survives the rewrite unchanged). Finding
      subjects become the env entries (`EXPECT_PACKAGES <pkg>`,
      `ABSENT_PACKAGES <pkg>`, `SINGLE_COMMIT_REPO <owner>/<repo>`)
      plus the live source URL. Covers scenarios "Version drift is
      flagged with its env entry", "A matching 404 claim verifies
      clean", "A second commit is drift", "A moved commit date is
      drift", "One GitHub call per run", "A dead non-npm link is
      drift", "A registry 404 is not a dead link", "npmjs.com pages
      are checked via the registry", "A 403 challenge is unavailable,
      not drift" (classifier side), "Presence checks are substring,
      not structural" (search side), "Version claim present on one
      line passes", "A wrong digit in the README is drift",
      "Absent-claim substrings pass anywhere, missing is drift",
      "Commit-claim substrings present pass, a moved README date is
      drift".
- [x] 1.3 Update output and report content to the env surface: every
      line stays prefixed `comparison-check:`; the finding line keeps
      the list style of `scripts/check.mjs:233-236` with the subject
      slot now reading `  ✗ <class> <env entry, README claim, or
link>: expected <e>, found <f> (<source url or README path>)`; exit 0
      with final line
      `comparison-check: ok` when clean, exit 1 on drift-only, exit 2
      when any UNAVAILABLE finding exists (dominates; both lists
      print; sync-vendor-style environment-failure lines, no stack
      dumps) — the exit semantics themselves are unchanged landed
      behavior. In `renderReport`, rename the subject column header
      `Cell / link` → `Expectation / link` and replace the Fix line's
      "update the README cells and footnotes" with the dual-update
      direction ("update the README table and the workflow env lines
      (and the checked-date line)") per design.md "Issue mechanics";
      intro sentence, title, label, timestamp/run-URL handling
      unchanged. With `--report <path>` and DRIFT findings, the
      issue-body markdown still goes to `<path>`. Covers scenarios
      "Clean run exits zero", "Drift-only run exits one", "Unreachable
      source exits two", "Mixed findings exit two".
- [x] 1.4 Implement `--report-issue <path>` mode: require
      `GITHUB_TOKEN` and `GITHUB_REPOSITORY` (missing → prefixed
      line, exit 2); dedup `GET
/repos/{owner}/{repo}/issues?labels=comparison-drift&state=open`
      with headers `Accept: application/vnd.github+json` and
      `X-GitHub-Api-Version: 2022-11-28`; on a hit `PATCH` that
      issue's body, on a miss `POST` a new issue titled `README
comparison drift` with `labels: ["comparison-drift"]` and the
      report as body; any non-2xx → prefixed line, exit 2. No `gh`
      invocation anywhere. Covers scenarios "Drift files one issue
      and the run stays green" (script side), "Repeat drift updates
      the same issue" (script side). (Unchanged by the env-contract
      revision: issue mode reads the report file verbatim and never
      touches the expectation variables.)
- [x] 1.5 Format and smoke: `npx --yes prettier@3 --write
scripts/check-comparison.mjs`, then `npx --yes prettier@3
--check scripts/check-comparison.mjs` → no diff; `node
scripts/check.mjs` → `check: ok`. Expected state after group 1
      alone: `scripts/check-comparison.mjs` rewritten in place (still
      one untracked file, no tracked file modified by this change);
      `npm test` is RED at this point — the landed
      `tests/comparison.test.ts` still targets the deleted parser
      surface and exits 2 on the missing env variables — and group 2
      restores it; `make check` gates 1–3 stay green.

- [x] 1.6 Add the `--summary <path>` job-summary audit trail to
      `scripts/check-comparison.mjs` per design.md "Audit summary":
      extend `parseArgs` and `USAGE` with `--summary <path>` (check
      mode only — issue mode ignores it, as it already ignores
      `--readme`/`--report`; no new combination validation) and
      update the header comment (usage lines, the summary
      description, and the note that a summary write failure is
      UNAVAILABLE). Record a per-item result row
      `{ table, item, expected, found, verdict }` for EVERY check
      including clean ones — a clean check returns `[]` today and
      leaves no trace: registry rows per `EXPECT_PACKAGES` /
      `ABSENT_PACKAGES` entry (package, expected version or
      `404 (not published)`, actual `dist-tags.latest` / status code
      / `fetch failed (<code>)`, verdict `ok`/`drift`/`unavailable`);
      one commits row (repo, expected
      `1 commit, committer date <date>`, actual, same verdicts);
      presence rows at finding granularity — one row per
      `EXPECT_PACKAGES` entry (the combined one-line pair is one
      check) and one per searched substring for `ABSENT_PACKAGES`
      and `SINGLE_COMMIT_REPO` (entry, substring, found
      `yes`/`no`); liveness rows per deduplicated-set URL (URL,
      effective final status — the registry GET's status suffixed
      `(registry GET)` for npm-mapped URLs, the
      final-after-redirects status for HEADs, `fetch failed
(<code>)` for transport errors — verdict
      `alive`/`drift`/`unavailable`). Findings stay the stdout /
      exit-code / `--report` surface unchanged. Add
      `renderSummary(rows, envValues, findings)`: title
      `# comparison-check — run summary`, `Checked at: <new
Date().toISOString()>`, the three env values as given in an
      `Expectations as given:` list (`(unset)` when unset), the four
      tables under the pinned headings `## Registry checks` /
      `## GitHub commits check` / `## README presence` /
      `## Link liveness` (a class left without rows by env
      validation shows a no-checks-ran line instead), and the
      classification line
      `Classification: clean — <N> checks, 0 drift, 0 unavailable` /
      `drift — <N> checks, <D> drift, 0 unavailable` /
      `unavailable — <N> checks, <D> drift, <U> unavailable`
      (`<N>` counts result rows; `<D>`/`<U>` count findings by
      severity, env findings included; the word follows the
      dominance rule). The renderer's only environment reads are the
      three expectation variables by name — `process.env` is never
      iterated — so `GITHUB_TOKEN` and `GITHUB_REPOSITORY` cannot
      leak. Write with `appendFileSync` (joins the `node:fs`
      import) after the findings are computed and BEFORE the
      exit-code decision — ALWAYS when the flag is passed,
      including on the clean early-exit path, which must write the
      summary before it says `comparison-check: ok` and exits 0; a
      successful write prints nothing to stdout; a failed write
      pushes the finding
      `finding("unavailable", "summary", <path>, "a writable summary
file", <err.message>, <path>)`,
      which forces exit 2 through the dominance rule. Covers
      scenarios "A clean run's summary lists every check with
      verdicts", "A drift run's summary names the failing rows, the
      issue stays the only alarm", "An unavailable run still writes
      its audit summary", "The summary never contains credentials",
      "Without --summary nothing changes" (script side; test-backed
      in 2.6, workflow wiring in 3.5). Expected state after 1.6
      alone: the script extended in place (still one untracked
      file, zero tracked files modified); flagless behavior is
      byte-identical, so the landed 2.1–2.5 cases pass unchanged —
      `npm test` green, `node scripts/check.mjs` → `check: ok`.

## 2. Offline fixture tests

- [x] 2.1 Rewrite the harness and core cases of
      `tests/comparison.test.ts` to the env surface (file style
      unchanged: node:test `describe`/`it` + `before`/`after`,
      `node:assert/strict`, one `node:http` fixture server on
      127.0.0.1 with per-test route tables and a request log, closed
      port for the unreachable case, `mkdtempSync` tmpdir fixtures
      removed in `after`, script spawned via `spawn(process.execPath,
…)`). Harness changes: `runCheck` passes `EXPECT_PACKAGES`,
      `ABSENT_PACKAGES`, `SINGLE_COMMIT_REPO` in the child env
      (per-case values pointing at fixture-served packages); fixture
      READMEs shrink to tiny documents carrying the liveness URLs
      plus the presence substrings for the case's env values — a
      one-line `www.npmjs.com/package/<pkg>` + `v<version>` pair per
      `EXPECT_PACKAGES` entry, `Not published` +
      `registry.npmjs.org/<pkg>` for the absent entry,
      `single commit (<date>` + `github.com/<owner>/<repo>` for the
      commit entry — with no table structure (layout is never
      parsed); the table-shaped helpers (`versionCell`, the old table
      scaffold in `fixtureReadme`) are deleted and replaced by a
      presence-satisfying `fixtureReadme(env)` helper so every
      non-presence case isolates the class under test. Core cases:
      clean env + clean routes → exit 0 +
      `comparison-check: ok` + every stdout line prefixed (scenario
      "Clean run exits zero"); env `opencode-plugin-openspec@9.9.9`
      vs served `"dist-tags":{"latest":"0.1.4"}` → exit 1 and the
      report contains `EXPECT_PACKAGES opencode-plugin-openspec`,
      expected, found, source URL (scenarios "Version drift is
      flagged with its env entry", "Drift-only run exits one", "Env
      version entry yields registry expectation"); scoped entry
      `@lininn/openflow@0.5.2` → the request log shows the GET at
      `/@lininn/openflow` (scenario "Scoped names split on the last
      @"); `ABSENT_PACKAGES=opencode-openspec` served 404 → no
      finding (scenarios "Env absent entry yields 404 expectation",
      "A matching 404 claim verifies clean"); malformed entries —
      `EXPECT_PACKAGES=opencode-plugin-openspec` (no `@`) and an
      empty `SINGLE_COMMIT_REPO` → exit 2 naming the variable and
      entry (scenario "Malformed env entry is loud, never skipped");
      fixture README whose version line is reformatted — extra
      spacing, moved cell boundaries — but keeps
      `www.npmjs.com/package/opencode-plugin-openspec` and `v0.1.4`
      on one line while env expects `opencode-plugin-openspec@0.1.4`
      → presence passes, exit 0 (scenario "Presence checks are
      substring, not structural");
      registry base at the closed port → exit 2 (scenario
      "Unreachable source exits two"); one drift + one unavailable in
      a single run → exit 2 printing both classes (scenario "Mixed
      findings exit two").
- [x] 2.2 Add the remaining class cases to `tests/comparison.test.ts`:
      commits array of length 2 → exit 1 (scenario "A second commit
      is drift"); single commit dated `2026-03-15T00:00:00Z` vs
      `SINGLE_COMMIT_REPO=…@2026-02-01` → exit 1 (scenario "A moved
      commit date is drift"); run with `SINGLE_COMMIT_REPO` set →
      the request log shows exactly one commits GET (scenarios "One
      GitHub call per run", "Env commit entry yields single-commit
      expectation"); tiny fixture README with a non-npm link served a
      final 404 → exit 1 dead-link finding (scenario "A dead non-npm
      link is drift"); non-npm fixture link served 403 → exit 2
      (scenario "A 403 challenge is unavailable, not drift"); fixture
      README containing a `registry.npmjs.org/<absent pkg>` URL
      served 404 while `ABSENT_PACKAGES` expects the 404 → zero
      liveness findings and one shared registry GET (scenario "A
      registry 404 is not a dead link"); fixture README containing a
      `www.npmjs.com/package/<pkg>` URL whose `<pkg>` also appears in
      `EXPECT_PACKAGES` → the request log records no npmjs.com-page
      request and exactly one registry GET for the mapped package
      (scenario "npmjs.com pages are checked via the registry").
      Presence class cases (fixtures via 2.1's helper): right tokens
      on one line → zero `readme-claim` findings (scenario "Version
      claim present on one line passes"); README version digit wrong —
      the URL line reads `v0.5.3` while env and the served packument
      say `0.5.2` → exit 1 with `README claim not found for
EXPECT_PACKAGES @lininn/openflow@0.5.2`, the searched pair
      printed, README path as source (scenario "A wrong digit in the
      README is drift"); absent-claim substrings split across two
      lines → pass, and dropping `Not published` from the fixture →
      exit 1 naming the `ABSENT_PACKAGES` entry (scenario
      "Absent-claim substrings pass anywhere, missing is drift");
      commit substrings present → pass, and a README edited to
      `single commit (2026-03-15` while env and the served API stay
      `2026-02-01` → exit 1 naming the `SINGLE_COMMIT_REPO` entry
      (scenario "Commit-claim substrings present pass, a moved README
      date is drift"); reformatted spacing around the tokens → still
      passes (scenario "Presence checks are substring, not
      structural", fixture side).
- [x] 2.3 `npm test` → every suite passes including the rewritten file
      (all cases offline — the only sockets are 127.0.0.1 locals); `npx
--yes prettier@3 --write tests/comparison.test.ts` then
      `--check` → no diff. Expected state after group 2 alone: script
      and tests agree on the env contract (both files modified in
      place, still untracked), no tracked file modified by this
      change, `make check` green end to end (the rewritten tests ride
      the existing `npm test` glob inside gate 4); the workflow yaml
      still lacks the expectation env block — a dispatch at this
      point would exit 2 on the unset variables, and 3.4 closes that
      gap.
- [x] 2.4 Adapt the retry-policy cases in `tests/comparison.test.ts` to
      the env harness (2.1's presence-satisfying fixtures, so the
      retry cases isolate the status branch), proving the
      one-retry-after-2000 ms STATUS
      branch of `fetchWithRetry` in `scripts/check-comparison.mjs`
      (function unchanged by the rewrite; referenced by name — the old
      line anchors moved): the fixture server answers 429 once, then
      the 200 packument matching the `EXPECT_PACKAGES` entry → exit 0
      with `comparison-check: ok` and the request log shows exactly 2
      requests for that URL (scenario "Clean run exits zero"); the
      fixture answers 429 twice → exit 2 with an UNAVAILABLE finding
      naming the env entry and URL, request log stopping at two
      attempts (scenario "Unreachable source exits two" — retry
      exhaustion classifies UNAVAILABLE exactly like the
      transport-error path).
- [x] 2.5 Adapt the issue-mode cases in `tests/comparison.test.ts` —
      the REST logic under test is unchanged (issue mode never reads
      the expectation variables), but the `ISSUE_REPORT` fixture text
      is updated to the new report shape of 1.3: column header
      `Expectation / link`, an env-entry subject row (e.g.
      `EXPECT_PACKAGES opencode-plugin-openspec`), and the dual-update
      Fix line — so the recorded-payload assertions compare against
      the body `--report` actually writes. Cases: running
      `--report-issue <report>` with `COMPARISON_GITHUB_API` pointed
      at the local fixture server as the fake GitHub REST endpoint
      (`GITHUB_TOKEN=test-token`, `GITHUB_REPOSITORY=owner/repo`):
      dedup GET answering `[]` → the request log shows one
      `POST /repos/owner/repo/issues` whose recorded payload carries
      title `README comparison drift`, labels `["comparison-drift"]`,
      and the report file's body (scenario "Drift files one issue and
      the run stays green" — script side, test-backed); dedup GET
      answering `[{"number": 7}]` → the log shows
      `PATCH /repos/owner/repo/issues/7` with the fresh body and no
      POST (scenario "Repeat drift updates the same issue" — script
      side, test-backed); `GITHUB_TOKEN` unset → exit 2 with the
      prefixed line `GITHUB_TOKEN not set — required for
--report-issue` and zero HTTP requests recorded
      (environment-failure path of the same requirement).

- [x] 2.6 Add the summary cases to `tests/comparison.test.ts`
      (harness style unchanged — the script still spawns as a child
      against the 127.0.0.1 fixture server): extend `runCheck` with
      an optional summary-path argument and optional extra env
      overrides, then five cases:
      (a) clean fixture + `--summary <tmp path>` → exit 0, stdout
      still ends `comparison-check: ok`, and the file exists holding
      the `Checked at:` UTC timestamp, the three env values as
      given, all four pinned table headings with per-item rows —
      the registry rows showing expected versions and
      `404 (not published)` with the actual `0.1.4` / `404`, the
      commits row, the presence rows found `yes`, the liveness rows
      with final statuses — and the classification line reading
      `clean` with zero drift and zero unavailable counts
      (scenario "A clean run's summary lists every check with
      verdicts");
      (b) drift fixture (`opencode-plugin-openspec@9.9.9` vs served
      `0.1.4`) with BOTH `--report` and `--summary` → exit 1; the
      summary shows the mismatching registry row with verdict
      `drift`, expected and found versions, and the classification
      reading `drift` with counts; the report file still passes the
      landed issue-body assertions — the summary files nothing and
      leaves the report unchanged (scenario "A drift run's summary
      names the failing rows, the issue stays the only alarm");
      (c) unavailable runs + `--summary`: the registry seam at the
      closed port → exit 2 and the file exists showing the affected
      registry rows with `fetch failed` and verdict `unavailable`
      and the classification reading `unavailable`; AND the landed
      malformed-env fixture (no-`@` `EXPECT_PACKAGES` entry + empty
      `SINGLE_COMMIT_REPO`) + `--summary` → exit 2 and the file
      still written — the expectations section shows the malformed
      values as given and the commits table its no-checks-ran line
      (scenario "An unavailable run still writes its audit
      summary" — the audit survives the red run on both the network
      and the env branch);
      (d) clean run with `GITHUB_TOKEN: "s3cr3t-fake-token"` in the
      child env + `--summary` → exit 0, the fixture request log
      shows the commits GET ran (the token env was present during a
      real run), and the file contains neither
      `s3cr3t-fake-token` nor the strings `GITHUB_TOKEN` /
      `GITHUB_REPOSITORY`, while it does contain the three
      expectation values (scenario "The summary never contains
      credentials");
      (e) clean run WITHOUT the flag → the summary temp path does
      not exist (`existsSync` false) and stdout plus exit code
      match the landed clean case (scenario "Without --summary
      nothing changes").
      Then `npm test` → every suite green (still fully offline —
      the only sockets are 127.0.0.1 locals); `npx --yes
prettier@3 --write tests/comparison.test.ts` then `--check` → no
      diff. Expected state after 2.6 alone: script and tests agree
      on the summary contract, both files still untracked, zero
      tracked files modified; `make check` green end to end; the
      workflow yaml still lacks the flag — a dispatch at this point
      would run the check without a summary, and 3.5 closes that
      gap.

## 3. Workflow

- [x] 3.1 Create `.github/workflows/comparison-freshness.yml` exactly
      per design.md "Workflow decisions": `name:
comparison-freshness`; `on: schedule: - cron: "0 6 1 * *"` plus
      `workflow_dispatch`; top-level `permissions: contents: read`
      and `issues: write`; one job on `ubuntu-latest` with job-level
      `env: GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` — GitHub
      Actions does not export the token as an environment variable
      automatically (repo precedent for explicit secret-to-env
      mapping: `publish.yml:27-28`), and job level rather than step
      level because both the check step's authenticated commits call
      (5000/h vs the shared-runner-IP anonymous 60/h) and the issue
      step's REST calls need it — and steps
      `actions/checkout@v7`, `actions/setup-node@v7` (`node-version:
22`, no `cache` key), a check step (`id: check`) running `set
+e; node scripts/check-comparison.mjs --report drift-report.md;
code=$?; echo "code=$code" >> "$GITHUB_OUTPUT"; exit 0`, an
      issue step `if: steps.check.outputs.code == '1'` running `node
scripts/check-comparison.mjs --report-issue drift-report.md`,
      and a fail step `if: steps.check.outputs.code == '2'` printing
      an explanatory stderr line and `exit 1`. No `npm ci` step, no
      `gh` usage. Covers scenarios "Drift files one issue and the run
      stays green" (wiring), "Repeat drift updates the same issue"
      (wiring), "Unavailable run goes red without touching issues" —
      verified statically here (yaml read-through); runtime acceptance
      is task 5.1.
- [x] 3.2 Verify isolation: `npx --yes prettier@3 --write
.github/workflows/comparison-freshness.yml` then `--check` → no
      diff; `grep -n "npm ci\|gh \|prettier"
.github/workflows/comparison-freshness.yml` → no matches; `git
diff --stat Makefile .github/workflows/ci.yml
.github/workflows/publish.yml .github/workflows/vendor-sync.yml`
      → empty; `node scripts/check.mjs` → `check: ok`. Expected state
      after group 3 alone: three new untracked files, zero tracked
      files modified.
- [x] 3.3 Apply the two workflow guards to the landed
      `.github/workflows/comparison-freshness.yml`: (a) top-level
      `concurrency: group: comparison-freshness` with
      `cancel-in-progress: false` — serializes dispatch vs schedule so
      two runs cannot race two POSTs against the single-issue
      guarantee; (b) in the check step's run block, immediately after
      `code=$?`, insert `case "$code" in 0|1|2) ;; *) echo
"comparison-check: unknown exit code $code" >&2; exit "$code";;
esac` — a code outside {0, 1, 2} (127 missing `node`, 137 killed)
      reddens the run at the check step and matches neither
      conditional step, so no issue is filed. Then `npx --yes
prettier@3 --write` + `--check` on the yaml → no diff; static
      read-through confirms both guards, the job-level `GITHUB_TOKEN`
      env, and the continued absence of `npm ci`/`gh`. Covers scenario
      "Unknown exit code fails the run". Expected state after 3.3:
      only the workflow yaml differs from the landed state; `node
scripts/check.mjs` → `check: ok`.
- [x] 3.4 Add the three expectation variables to the job-level `env:`
      block of `.github/workflows/comparison-freshness.yml`, alongside
      the existing `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` line —
      the revision's only diff against the landed yaml — with the
      values pinned verbatim (2026-10-17 table values; plain YAML
      scalars, no quoting needed — `@` is mid-scalar):
      `EXPECT_PACKAGES: opencode-plugin-openspec@0.1.4,@moyaspace/openspec-superpowers-opencode@1.1.1,@lininn/openflow@0.5.2`,
      `ABSENT_PACKAGES: opencode-openspec`,
      `SINGLE_COMMIT_REPO: AngDrew/opencode-openspec@2026-02-01`,
      plus a short comment marking these lines and the README table as
      the dual-update pair fixed together on drift (no self-package
      entry — this package's version is machine-owned). Everything
      else in the yaml stays as landed: guards (`case` exit-code
      guard, `concurrency`), steps, `permissions`, cron,
      `workflow_dispatch`. Then `npx --yes prettier@3 --write` +
      `--check` on the yaml → no diff; static read-through confirms
      the env block, the untouched guards, and the continued absence
      of `npm ci`/`gh`; `node scripts/check.mjs` → `check: ok`.
      Covers scenario "The workflow job env block carries the three
      variables" (wiring; runtime acceptance is task 5.1) and the
      production supply side of "Env version entry yields registry
      expectation", "Env absent entry yields 404 expectation", "Env
      commit entry yields single-commit expectation". Expected state
      after group 3: the workflow yaml differs from its landed state
      only in the job env block; a `workflow_dispatch` run now
      exercises the full env contract.

- [x] 3.5 Add the summary flag to the check step of
      `.github/workflows/comparison-freshness.yml`: the run block's
      node line becomes exactly
      `node scripts/check-comparison.mjs --report drift-report.md --summary "$GITHUB_STEP_SUMMARY"`
      — Actions injects `GITHUB_STEP_SUMMARY` in every step and
      renders the appended markdown as the job summary in the run
      UI; the variable does not exist locally, so only the workflow
      passes the flag — and the step's comment gains one line
      stating that every run, clean ones included, leaves a
      job-summary audit trail. Everything else stays as landed:
      `set +e`, `code=$?`, the `case "$code" in 0|1|2)` guard, the
      `$GITHUB_OUTPUT` line, `exit 0`, the job env block with the
      three expectation variables and `GITHUB_TOKEN`,
      `concurrency`, `permissions`, cron, `workflow_dispatch`, the
      issue step, and the fail step. Then `npx --yes prettier@3
--write` + `--check` on the yaml → no diff; static read-through
      confirms the run line and the untouched guards; `node
scripts/check.mjs` → `check: ok`. Covers the workflow-wiring side
      of "A clean run's summary lists every check with verdicts",
      "A drift run's summary names the failing rows, the issue
      stays the only alarm", and "An unavailable run still writes
      its audit summary" (runtime acceptance is task 5.1).
      Expected state after 3.5 alone: the yaml differs from its
      landed state only in the check step's run line and that one
      comment line; zero tracked files modified by this change.

## 4. Live verification (same day as implementation)

- [x] 4.1 Run the env-exported check against the committed README and
      the live endpoints:
      `EXPECT_PACKAGES='opencode-plugin-openspec@0.1.4,@moyaspace/openspec-superpowers-opencode@1.1.1,@lininn/openflow@0.5.2' ABSENT_PACKAGES='opencode-openspec' SINGLE_COMMIT_REPO='AngDrew/opencode-openspec@2026-02-01' node scripts/check-comparison.mjs`
      → exit 0, final line `comparison-check: ok`. Live-endpoint
      baseline probed 2026-10-17: abbreviated packuments'
      `dist-tags.latest` match the three entries (`@lininn/openflow` →
      `"latest":"0.5.2"` quoted in design.md);
      `registry.npmjs.org/opencode-openspec` → 404; commits API → one
      element, `2026-02-01T05:47:42Z`; all 17 unique README URLs
      alive (nodejs.org and openspec.dev via one redirect each,
      `formulae.brew.sh` HEAD 200). The same run proves the committed
      README satisfies the presence contract with the pinned values:
      `README.md:76` carries all three `www.npmjs.com/package/<name>` + `v<version>` pairs on one line plus `Not published — registry
404[^14]`; `README.md:61,78` carry
      `registry.npmjs.org/opencode-openspec`, `single commit
(2026-02-01`, and `github.com/AngDrew/opencode-openspec`.
      Covers scenarios "Clean run exits
      zero" and "A matching 404 claim verifies clean" against the
      live endpoints, and the pass side of "Version claim present on
      one line passes", "Absent-claim substrings pass anywhere,
      missing is drift", "Commit-claim substrings present pass, a
      moved README date is drift" against the real README
      (publish-time-equivalent; the fixture tests are
      the in-change mechanical evidence).
- [x] 4.2 `openspec validate add-comparison-freshness-check` → VALID.
- [x] 4.3 `make check` → all four gates green including the new
      offline tests; `git diff Makefile` → empty; `grep -c
check-comparison Makefile .github/workflows/ci.yml` → 0 matches
      in both. Covers scenario "make check still runs exactly four
      gates". Expected state after group 4: working tree holds only
      the three new files plus this change's artifacts under
      `openspec/changes/`; no tracked file modified anywhere in the
      change.
- [x] 4.4 Re-verify after the env-contract and summary revisions:
      `npm test` → every suite green including the rewritten 2.x
      cases and the new 2.6 summary cases (still fully offline —
      the only sockets are 127.0.0.1 locals); the 4.1
      env-exported live run → exit 0 with final line
      `comparison-check: ok`; the same env-exported live run again
      WITH `--summary` to a temp path (e.g. `--summary
"$TMPDIR/comparison-summary.md"`) → exit 0 and the file lists all
      four class tables — registry, commits, presence, liveness —
      with per-item verdict rows and the classification line
      reading `clean`, the three expectation values present and no
      other environment value printed (the token env is unset
      locally); `make check` → all four gates green;
      `git diff Makefile` → empty (gate isolation re-confirmed).
      Covers scenarios "Clean run exits zero" and "make check still
      runs exactly four gates" (re-confirmation on the revised
      tree), plus the live-sources side of "A clean run's summary
      lists every check with verdicts".
      Expected state after group 4: this change's footprint is the
      three untracked files (script, tests, workflow yaml — all
      rewritten or extended in place) plus its artifacts under
      `openspec/changes/`; no tracked file modified by this change.

## 5. Manual acceptance (user-confirmed)

- [ ] 5.1 After merge to the default branch (a newly added workflow
      appears in the Actions tab only once its file is on the default
      branch), the user triggers one `workflow_dispatch` run
      of `comparison-freshness` and confirms: the run
      is green and no
      issue was created (the README is drift-free today), AND —
      reading the run's job summary in the Actions UI — the job
      summary lists the four classes with verdicts: the registry
      table carrying a row per `EXPECT_PACKAGES` version and the
      `ABSENT_PACKAGES` 404, the commits table with the
      single-commit verdict, the presence table with every searched
      pair found, the liveness table with every README URL and its
      final status, and the classification line reading `clean`
      with zero drift and zero unavailable counts. This is the
      single manual eyeball gate; the live issue-POST/PATCH path is
      deliberately not exercised by this change — a clean dispatch
      cannot fire it — so it rests on the fixture-proven report
      content (2.1), the REST logic (1.4), and the proposal's
      label-auto-creation ASSUMPTION, with the first real drift (or a
      user-chosen rehearsal) filing the first live issue. Complete
      this task only on the user's explicit confirmation of the
      dispatch run. Covers scenarios "Drift files one issue and the
      run stays green" and "Repeat drift updates the same issue" at
      acceptance level (workflow runtime), the workflow-runtime
      acceptance of "A clean run's summary lists every check with
      verdicts", and re-confirms
      "Unavailable run goes red without touching issues" wiring by
      yaml inspection.
