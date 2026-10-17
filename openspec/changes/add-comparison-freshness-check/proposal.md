# Add a monthly comparison-freshness alarm

## Why now

The README `## Comparison` section (landed by the still-open change
`add-positioning-comparison-and-package-metadata`) pins external facts:
competitor npm versions in the detailed table's `npm package` row
(`README.md:76` as of 2026-10-17), the AngDrew footnote — single commit
`2026-02-01`, registry 404 — duplicated as `[^13]`/`[^14]`
(`README.md:61,78`), and 17 unique external URLs across the whole
file. The line `All cells checked 2026-10-17 against the linked
public sources.` (`README.md:63`) is a one-off manual act; nothing
re-checks it. The prior run's retro flagged exactly this
(NO-REGRESSION-TEST): without an alarm the table rots silently as
competitors publish, links die, or the AngDrew repo grows. This change
adds the alarm — one script, one monthly workflow, one deduplicated
drift issue. Per pinned user decision, the expected facts are
hard-coded in the workflow's job env block: the gate verifies those
expectations against the live sources, verifies that the README still
contains each expectation as a pinned substring (presence, not
parsing), and checks every README URL for liveness; it never parses
the comparison table's structure. A clean run is invisible today —
the issue appears only on drift and run logs expire with retention —
so the script also writes a per-run job-summary audit trail that the
workflow renders in the Actions run UI (user-requested addendum).

## What changes

Exactly three new project files; no tracked file is modified by this change

1. **`scripts/check-comparison.mjs`** — verifies four fact classes
   whose expected values come from three environment variables pinned
   by the workflow (never from the table's text); the README is read
   exactly once — for the liveness URL set and the claim-presence
   substrings, never parsed for structure:

   1. _npm registry_: `EXPECT_PACKAGES` — comma-separated
      `name@version` entries split on the LAST `@`, because scoped
      names contain `@` — today `opencode-plugin-openspec@0.1.4`,
      `@moyaspace/openspec-superpowers-opencode@1.1.1`,
      `@lininn/openflow@0.5.2` (the three current table versions,
      2026-10-17; no self-package entry — this package's version is
      machine-owned by the vendor-sync mirror) — compared against
      each package's `.["dist-tags"].latest`; `ABSENT_PACKAGES` —
      today `opencode-openspec` — compared against GET
      `https://registry.npmjs.org/opencode-openspec` → 404 (probed
      2026-10-17: `curl -s -o /dev/null -w "%{http_code}" → 404`).
   2. _AngDrew single-commit fact_: `SINGLE_COMMIT_REPO` — today
      `AngDrew/opencode-openspec@2026-02-01` — drives GET
      `https://api.github.com/repos/AngDrew/opencode-openspec/commits?per_page=2`
      → array length 1, committer date `2026-02-01` (probed
      2026-10-17: `"date": "2026-02-01T05:47:42Z"`); exactly one
      commits call per run.
   3. _Link liveness_: every `https?:` URL in the whole README (17
      unique, 2026-10-17 inventory), extracted from the same single
      read as class 4. `www.npmjs.com/package/<x>` pages are never
      HTTP-fetched — www.npmjs.com answers Cloudflare 403 to
      datacenter IPs, which GitHub Actions runners are — they map to
      `registry.npmjs.org/<x>`, where 200 _or_ 404 proves the
      registry answered; version truth belongs to class 1. Every
      other domain gets an ordinary redirect-followed HEAD (probed:
      `curl -IL https://nodejs.org → HEAD 200, 1 redirect`;
      `https://formulae.brew.sh/formula/openspec → HEAD 200`).
   4. _README claim presence_: every env expectation must also appear
      in the README — a pure substring search over the already-read
      text, no network, no parser. Per `EXPECT_PACKAGES` entry, ONE
      line must contain both `www.npmjs.com/package/<name>` and the
      token `v<version>`; per `ABSENT_PACKAGES` entry, `Not published`
      and `registry.npmjs.org/<name>` must each appear somewhere (two
      independent checks); for `SINGLE_COMMIT_REPO`, `single commit
(<date>` and `github.com/<owner>/<repo>` must each appear. A
      miss is DRIFT — `README claim not found for <entry>`, searched
      substrings printed, README path as source — because a readable
      README lacking the claim is stale, not unreachable. This closes
      the table-typo hole: a README reading `v0.5.3` while env and
      registry say `0.5.2` files a drift issue like any other drift.

   A malformed env string — an entry without `@`, a bad date, a
   variable unset or empty in check mode — is an UNAVAILABLE finding
   naming the variable and entry, never a silent skip. Exit codes:
   0 clean · 1 DRIFT · 2 UNAVAILABLE (network errors, timeouts, rate
   limits, 403 challenges, an unreadable README, malformed env
   entries) — the `✗`-list
   style of `scripts/check.mjs`
   (`scripts/check.mjs:12-14,233-238`) and the exit-2
   environment-failure style of `scripts/sync-vendor.mjs:41-43`,
   every line prefixed `comparison-check:`. A `--report-issue` mode
   performs issue dedup/update/create over the GitHub REST API. A
   `--summary <path>` flag — passed only by the workflow, as
   `--summary "$GITHUB_STEP_SUMMARY"` — appends a markdown audit
   report to `<path>` after EVERY check-mode run (clean, drift, and
   unavailable alike): the checked-at UTC date, the three expectation
   values as given, one table per fact class with per-item verdict
   rows, and the classification line with counts; it prints no
   environment variable beyond the three expectation variables
   (`GITHUB_TOKEN`/`GITHUB_REPOSITORY` excluded explicitly), a failed
   summary write is an UNAVAILABLE finding, and flagless runs stay
   byte-identical. Node builtins only; global `fetch` is guaranteed by
   `engines: ">=22.18"`
   (probed: `node -e "fetch('https://nodejs.org',{method:'HEAD',…})" →
200 https://nodejs.org/en` on local Node v26.12.0).

2. **`tests/comparison.test.ts`** — offline fixture tests (node:test,
   tmpdir-inline fixtures in the style of `tests/vendor.test.ts`)
   covering all four classes on the env surface: expectations passed
   as child-process environment variables, tiny fixture READMEs
   carrying the liveness URLs plus the presence substrings for the
   case's env values (no table structure — layout is never parsed);
   injected-drift env entry → exit 1; a README version digit
   disagreeing with env → exit 1 naming the entry; reformatted spacing
   → still passes; a missing `Not published` claim → exit 1;
   unreachable-host and 403 fixtures → exit 2; malformed env entry →
   exit 2 naming it — plus the retry status branch (429 → 200 clean
   with exactly two requests; 429 twice → exit 2) and the issue-mode
   REST logic (dedup GET → POST / PATCH asserted on a local fake
   GitHub endpoint; missing `GITHUB_TOKEN` → exit 2 with zero HTTP) —
   plus the job-summary cases: clean/drift/unavailable summary table
   content, a fake `GITHUB_TOKEN` value proven absent from the written
   file, and the no-flag no-write case.
   The file joins the existing `npm test` glob (`tests/**/*.test.ts`),
   so it rides inside `make check`'s fourth gate without changing the
   gate's composition.
3. **`.github/workflows/comparison-freshness.yml`** — monthly
   (`cron: "0 6 1 * *"`) + `workflow_dispatch`,
   `permissions: contents: read / issues: write`, checkout + Node 22,
   no `npm ci` (builtins only). Its job-level `env` block pins the
   expectation contract — `EXPECT_PACKAGES`, `ABSENT_PACKAGES`,
   `SINGLE_COMMIT_REPO` at the values above — alongside the existing
   `GITHUB_TOKEN` mapping. Its check step runs the script with
   `--report drift-report.md --summary "$GITHUB_STEP_SUMMARY"` —
   Actions injects the step-summary path, so every run including
   clean ones renders its audit tables in the run UI. DRIFT → exactly
   one open issue labeled
   `comparison-drift` (fixed title, body = fresh DRIFT finding list;
   dedup via REST search, then PATCH or POST with `GITHUB_TOKEN` — no
   `gh` CLI, which the repo uses nowhere), and the run stays green.
   UNAVAILABLE → red run, issue untouched. An exit code outside
   {0, 1, 2} reddens the run without filing an issue, and a
   `concurrency` group (`cancel-in-progress: false`) serializes
   dispatch vs schedule so two runs cannot race two POSTs.

Success metric: run locally today with the three env variables
exported at their pinned values → exit 0 drift-free (the committed
README satisfies the presence contract — see Dependencies); the
fixture tests prove the drift/unavailable/malformed-env and
README-presence paths, the retry status branch, the issue-mode
REST logic, and the job-summary content offline; the issue path's
live firing is accepted by one manual `workflow_dispatch` after push
(task 5.1, user confirmation) — whose acceptance now also READS the
run's job summary and confirms the four class tables list their
verdicts and the classification reads clean.

## Impact on capabilities

- `comparison-freshness`: new capability — 5 ADDED requirements / 34
  scenarios (the workflow env as the single source of expected values,
  incl. the last-`@` split and loud malformed entries; the four check
  classes — three against live sources, incl. the npm-via-registry
  mapping and whole-README link liveness, plus the substring-level
  README claim presence that catches table typos; exit-code
  classification with malformed env = UNAVAILABLE and a missing claim
  = DRIFT; single-issue dedup with green-on-drift /
  red-on-unavailable workflow behavior on a monthly schedule, the
  unknown-exit-code guard, and concurrency serialization; the per-run
  job-summary audit trail — `--summary` always-on in check mode with
  four class tables plus the classification line, credentials
  excluded, the workflow passing `$GITHUB_STEP_SUMMARY`, and flagless
  behavior byte-identical).
  Live-endpoint scenarios are publish-time-equivalent: inside this
  change the mechanical evidence is the offline fixture tests (group 2)
  plus the one local live run (group 4).
- No other capability is touched. No delta on `public-positioning` —
  see Dependencies. No delta on `release-publishing`: `Makefile`,
  `ci.yml`, and `publish.yml` stay byte-identical, so the baseline
  requirement "make check composes the four repo gates"
  (`openspec/specs/release-publishing/spec.md:57-64`) holds unchanged.

## Dependencies and ordering

The change `add-positioning-comparison-and-package-metadata` is still
open/unarchived. Its implemented tasks already landed the
`## Comparison` section whose facts the workflow env block mirrors,
but the baseline capability `public-positioning` does not yet exist
under `openspec/specs/`. That change's table format PARTIALLY
constrains this script: the structural parse coupling is gone, but
the presence class pins a substring contract the sibling section's
format satisfies today — the `npm package` row keeps
`www.npmjs.com/package/<name>` links and `v<X.Y.Z>` version tokens on
one line and the text `Not published` (`README.md:76`), its footnotes
keep `registry.npmjs.org/opencode-openspec`, `single commit
(2026-02-01`, and `github.com/AngDrew/opencode-openspec`
(`README.md:61,78`). Rewordings that preserve these substrings —
spacing, cell boundaries, column order, footnote renumbering — cannot
break the gate; a wording change that drops one fires a loud presence
DRIFT (a false positive resolved by aligning wording or substrings),
never a silent pass. Ordering constraint: that change archives
independently (before or after this one); this change deliberately
adds **no** delta to `public-positioning` — wording reconciliation
between the section's spec and this alarm happens at that archive, not
here. The two changes' delta files do not intersect
(`specs/public-positioning` + `specs/release-publishing` vs
`specs/comparison-freshness`).

## Constraints honored

- `make check` stays exactly four gates; the new script runs only in
  the new workflow; the CI push/PR gates (`ci.yml`) are unchanged.
- Zero new dependencies — Node builtins only; `fetch` and
  `AbortSignal.timeout` exist on Node ≥ 22.18 (probed locally).
- No `gh` CLI; GitHub REST with `GITHUB_TOKEN` only — the token is read
  from the environment and never appears in code, printed output, or
  the job-summary audit file.
- `scripts/`, `tests/`, and `.github/` fall under `make fmt` (manual
  prettier, no CI format gate) — every new file is prettier-clean.
- All content in English (AGENTS.md).

## Out of scope

- Automatic edits of README cells, of the `All cells checked …` line,
  or of the workflow env lines — the alarm reports, a human fixes both
  sides of the pair (dual-update rule, see Risks).
- Semantic cell judgment (the ✅/⚠️/❌ axes, apply-model and
  plan-drafting prose) — the script reads the README only for its URL
  set and the pinned presence substrings; no cell semantics, no table
  structure.
- A fifth `make check` gate or any `ci.yml` integration.
- GitHub label pre-creation governance — the label rides the first
  issue creation (see ASSUMPTION below).
- Relative README links — already guarded by `scripts/check.mjs`
  group 5 (`scripts/check.mjs:199-218`).
- Exercising the live issue-creation path inside this change — task
  5.1's manual dispatch plus the ASSUMPTION lines are the acceptance.

## Assumptions

ASSUMPTION: env entries are the single source of truth for expectations; the README must contain each of them as a pinned substring (the presence class), and README table correctness is restored by human dual-update on drift — typo-catching is preserved at substring level, user-confirmed.
ASSUMPTION: the label `comparison-drift` is created implicitly by the first REST issue creation — probed `GET https://api.github.com/repos/alexeyco/opencode-openspec/labels/comparison-drift → 404` (absent today; the auto-creation itself untested — a first drift run answered 422 would disprove it, fallback is an explicit `POST /repos/{owner}/{repo}/labels` step in the workflow).
ASSUMPTION: schedule and `workflow_dispatch` runs execute on the default branch, so the script reads master's committed README (URL set) and master's workflow env block (expectations) — pinned by the trigger list in the yaml this change writes (no `pull_request` trigger); untested — a dispatch run reading PR-branch content would disprove it.
ASSUMPTION: a 3xx chain resolving to a final 2xx counts as link-alive for non-npm domains — tested `curl -IL https://nodejs.org → HEAD 200, 1 redirect, final https://nodejs.org/en`; the policy is pinned at script level.
ASSUMPTION: the three expectation variables are required in check mode — an unset or empty variable yields an UNAVAILABLE finding naming it, so a local run that forgot to export them fails loudly instead of silently checking links only (inferred from the never-skip principle, not spelled out in the pinned contract; untested — a user preference for optional variables would disprove it).

## Risks

The env-only draft's hole — a typo in the README comparison table
going uncaught — is CLOSED by the README claim presence class (What
changes, item 1.4): a table reading `v0.5.3` while the env lines and
the live registry say `0.5.2` leaves no line carrying
`www.npmjs.com/package/@lininn/openflow` + `v0.5.2`, so the run
drifts and files. Two residual limits, stated plainly and accepted:

- Presence is token-shaped. The README must keep the literal shapes
  `www.npmjs.com/package/<name>` + `v<X.Y.Z>` on one line,
  `Not published`, `registry.npmjs.org/<name>`,
  `single commit (<YYYY-MM-DD>`, `github.com/<owner>/<repo>`. A
  sibling-change rewording that drops one of these shapes fires a
  loud false-positive drift — it cannot pass silently — resolved by
  aligning the wording or the pinned substrings.
- A correct claim in the wrong place can mask a wrong table cell:
  presence searches the whole README, and the version pair only needs
  ONE shared line, so another line carrying the package URL and the
  right `v<X.Y.Z>` would satisfy the check even if the table cell
  itself reads a different version. Bounded by the one-line rule and
  accepted.

The dual-update rule stands: resolving any drift finding means
updating BOTH the README table and the yaml env lines.

REJECTED-RISK: none — the env-only draft's README-typo hole was proposed, then closed by the user's presence-check contract before any dismissal; the residual limits above are accepted, not dismissed.
