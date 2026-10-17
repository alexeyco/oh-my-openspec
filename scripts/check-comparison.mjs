#!/usr/bin/env node
// Check the README `## Comparison` table for freshness against live sources.
//
// Usage:
//   node scripts/check-comparison.mjs [--readme <path>] [--report <path>]
//                                     [--summary <path>]
//   node scripts/check-comparison.mjs --report-issue <path>
//
// Two modes. Check mode (the default) takes every expected value from the
// env contract — EXPECT_PACKAGES, ABSENT_PACKAGES, SINGLE_COMMIT_REPO —
// never from the README's text, and verifies four fact classes: npm
// registry expectations (EXPECT_PACKAGES versions against dist-tags,
// ABSENT_PACKAGES names against registry 404s), the SINGLE_COMMIT_REPO
// single-commit listing, every URL in the README for liveness, and README
// claim presence. The README is read exactly once — for the liveness URL
// set and the claim-presence substrings — and never parsed for structure.
// Issue mode reads the drift report written by `--report` and creates or
// updates the single `comparison-drift` issue through the GitHub REST API.
//
// `--summary <path>` (check mode only — issue mode ignores it, as it
// already ignores `--readme`/`--report`) appends a markdown audit trail
// to <path> on EVERY run, clean ones included: per-item result rows for
// all four fact classes plus a classification line. A summary write
// failure is an UNAVAILABLE finding (exit 2) — except in the
// unreadable-README branch, where the pending exit 2 stands. The
// renderer reads only the three expectation variables by name, so no
// other environment value can leak into the file.
//
// Exit codes (check mode): 0 clean · 1 DRIFT only (README facts are
// stale) · 2 any UNAVAILABLE finding — a source could not be reached, or
// the env contract is unset or malformed. UNAVAILABLE dominates because
// a run that could not reach its sources cannot vouch for the table.
// Issue mode exits 0 on success and 2 on any REST or environment failure.
//
// Environment seams (defaults and the env contract pinned in
// openspec/changes/add-comparison-freshness-check/design.md):
//   EXPECT_PACKAGES         comma-separated name@version list (required in check mode)
//   ABSENT_PACKAGES         comma-separated names expected to 404 (required in check mode)
//   SINGLE_COMMIT_REPO      owner/repo@YYYY-MM-DD entry (required in check mode)
//   COMPARISON_NPM_REGISTRY npm registry base (default https://registry.npmjs.org)
//   COMPARISON_GITHUB_API   GitHub API base (default https://api.github.com)
//   GITHUB_TOKEN            Bearer auth for GitHub API calls (required in issue mode)
//   GITHUB_REPOSITORY       owner/repo (required in issue mode)

import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PREFIX = "comparison-check:";
const USAGE =
  "node scripts/check-comparison.mjs [--readme <path>] [--report <path>]" +
  " [--summary <path>] | --report-issue <path>";
const ATTEMPT_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 2_000;
const ISSUE_TITLE = "README comparison drift";
const ISSUE_LABEL = "comparison-drift";

const REGISTRY_BASE = (
  process.env.COMPARISON_NPM_REGISTRY ?? "https://registry.npmjs.org"
).replace(/\/+$/, "");
const GITHUB_API = (
  process.env.COMPARISON_GITHUB_API ?? "https://api.github.com"
).replace(/\/+$/, "");
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

function say(line) {
  console.log(`${PREFIX} ${line}`);
}

function finding(severity, cls, subject, expected, found, source) {
  return { severity, cls, subject, expected, found, source };
}

// Every executed check records a result row — clean ones included —
// feeding only the `--summary` audit trail; findings stay the stdout /
// exit-code / `--report` surface unchanged.
function recordRow(rows, table, item, expected, found, verdict) {
  rows.push({ table, item, expected, found, verdict });
}

// ── Network helpers ─────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

// One retry after RETRY_DELAY_MS on transport error, 429, or 5xx; every
// other status is final (a 403 challenge is neither retried nor
// GET-fallbacked — pinned user decision).
async function fetchWithRetry(url, init = {}) {
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      });
    } catch (err) {
      if (attempt === 1) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw err;
    }
    if (attempt === 1 && (res.status === 429 || res.status >= 500)) {
      await sleep(RETRY_DELAY_MS);
      continue;
    }
    return res;
  }
}

function errorMessage(err) {
  const name = err?.name ?? err?.cause?.name;
  if (name === "TimeoutError") return "timeout";
  const code = err?.cause?.code ?? err?.code;
  if (typeof code === "string") return code;
  if (typeof name === "string") return name;
  return err?.message ?? "unknown error";
}

// Registry GETs are deduplicated per package: class 1 (version / 404
// expectations) and class 3 liveness (npmjs.com pages and registry links
// map to the same GET) share one request per run.
const registryCache = new Map();

function registryGet(pkg) {
  if (!registryCache.has(pkg)) {
    registryCache.set(pkg, doRegistryGet(pkg));
  }
  return registryCache.get(pkg);
}

async function doRegistryGet(pkg) {
  const url = `${REGISTRY_BASE}/${pkg}`;
  try {
    const res = await fetchWithRetry(url, {
      headers: { Accept: "application/vnd.npm.install-v1+json" },
    });
    let latest;
    if (res.status === 200) {
      try {
        latest = (await res.json())?.["dist-tags"]?.latest;
      } catch {
        latest = undefined;
      }
    }
    return { url, status: res.status, latest, error: null };
  } catch (err) {
    return { url, status: null, latest: undefined, error: err };
  }
}

function githubHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return headers;
}

// One commits GET per run: SINGLE_COMMIT_REPO holds a single entry, so
// the old footnote-dedupe cache is gone — checkCommits calls this
// directly and the request happens exactly once.
async function doCommitsGet(owner, repo) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=2`;
  try {
    const res = await fetchWithRetry(url, { headers: githubHeaders() });
    if (!res.ok) {
      return { url, status: res.status, commits: null, error: null };
    }
    let body;
    try {
      body = await res.json();
    } catch {
      return { url, status: res.status, commits: null, error: null };
    }
    return {
      url,
      status: res.status,
      commits: Array.isArray(body) ? body : null,
      error: null,
    };
  } catch (err) {
    return { url, status: null, commits: null, error: err };
  }
}

// ── Env contract ────────────────────────────────────────────────────────────

// The three expectation variables have no script-level defaults: the
// workflow's job env block is their only production source, and an unset
// or empty variable is an UNAVAILABLE finding naming it — a run missing
// its expectations fails loudly instead of silently checking only links.
function envFinding(variable, entry, expected, found) {
  return finding(
    "unavailable",
    "env",
    entry === null ? variable : `${variable} ${entry}`,
    expected,
    found,
    variable,
  );
}

function requireEnv(name, format, findings) {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    findings.push(envFinding(name, null, format, "unset or empty"));
    return null;
  }
  return value;
}

// `name@version` and `owner/repo@YYYY-MM-DD` split on the LAST `@` —
// scoped package names contain `@` themselves
// (`@moyaspace/pkg@1.1.1` → name `@moyaspace/pkg`, version `1.1.1`).
function splitSegments(value) {
  return value.split(",").map((segment) => segment.trim());
}

// A malformed entry is dropped only after its UNAVAILABLE finding is
// recorded — never a silent skip. An empty segment (doubled or trailing
// comma) counts as malformed.
function parseExpectPackages(findings) {
  const value = requireEnv(
    "EXPECT_PACKAGES",
    "a comma-separated name@version list",
    findings,
  );
  if (value === null) return [];
  const entries = [];
  for (const raw of splitSegments(value)) {
    const label = raw === "" ? '""' : raw;
    const at = raw.lastIndexOf("@");
    if (at === -1) {
      findings.push(
        envFinding(
          "EXPECT_PACKAGES",
          label,
          "a name@version entry",
          raw === "" ? "empty entry" : "no @ in the entry",
        ),
      );
      continue;
    }
    const name = raw.slice(0, at);
    const version = raw.slice(at + 1);
    if (name === "" || version === "") {
      findings.push(
        envFinding(
          "EXPECT_PACKAGES",
          label,
          "a name@version entry",
          "empty name or version segment",
        ),
      );
      continue;
    }
    entries.push({ name, version, raw });
  }
  return entries;
}

// ABSENT_PACKAGES segments are whole package names — no `@` split;
// validation is non-empty only.
function parseAbsentPackages(findings) {
  const value = requireEnv(
    "ABSENT_PACKAGES",
    "a comma-separated package name list",
    findings,
  );
  if (value === null) return [];
  const entries = [];
  for (const raw of splitSegments(value)) {
    if (raw === "") {
      findings.push(
        envFinding("ABSENT_PACKAGES", '""', "a package name", "empty entry"),
      );
      continue;
    }
    entries.push({ name: raw, raw });
  }
  return entries;
}

function parseSingleCommitRepo(findings) {
  const value = requireEnv(
    "SINGLE_COMMIT_REPO",
    "an owner/repo@YYYY-MM-DD entry",
    findings,
  );
  if (value === null) return null;
  const raw = value.trim();
  const at = raw.lastIndexOf("@");
  if (at === -1) {
    findings.push(
      envFinding(
        "SINGLE_COMMIT_REPO",
        raw,
        "an owner/repo@YYYY-MM-DD entry",
        "no @ in the entry",
      ),
    );
    return null;
  }
  const repo = raw.slice(0, at);
  const date = raw.slice(at + 1);
  const parts = repo.split("/");
  if (parts.length !== 2 || parts.some((part) => part === "")) {
    findings.push(
      envFinding(
        "SINGLE_COMMIT_REPO",
        raw,
        "an owner/repo@YYYY-MM-DD entry",
        `owner/repo side "${repo}" is not two non-empty segments`,
      ),
    );
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    findings.push(
      envFinding(
        "SINGLE_COMMIT_REPO",
        raw,
        "an owner/repo@YYYY-MM-DD entry",
        `date "${date}" is not YYYY-MM-DD`,
      ),
    );
    return null;
  }
  return { owner: parts[0], repo: parts[1], date, raw };
}

// ── README reading ──────────────────────────────────────────────────────────

// One read feeding two consumers: the liveness URL set and the presence
// search text. The `https?:` superset exists so offline fixtures can
// point liveness URLs at a local http://127.0.0.1 server; the committed
// README has no http: URLs, so the live set is unchanged. The comparison
// table's structure — rows, columns, cell shapes, footnote grammar — is
// never parsed; every expected value comes from the env contract.
function readReadme(readmePath, summaryPath) {
  let text;
  try {
    text = readFileSync(readmePath, "utf-8");
  } catch (err) {
    // The audit trail covers every classification, this branch's
    // included: the run is UNAVAILABLE with zero checks ran, so the
    // summary is still written — every class heading carries its
    // no-checks-ran line, and this read failure is the one
    // unavailable in the classification count. A failed write here
    // changes nothing: exit 2 already stands, and nothing is printed
    // or re-summarized from this branch (no recursion).
    if (summaryPath) {
      appendSummary(summaryPath, [], summaryEnvValues(), [
        finding(
          "unavailable",
          "readme",
          readmePath,
          "a readable README file",
          err.message,
          readmePath,
        ),
      ]);
    }
    say(`cannot read ${readmePath}: ${err.message}`);
    process.exit(2);
  }
  const urls = [
    ...new Set([...text.matchAll(/https?:\/\/[^\s)"'`<>]+/g)].map((m) => m[0])),
  ];
  return { text, urls };
}

// ── README claim presence ───────────────────────────────────────────────────

// Pure case-sensitive substring search over the text already read for
// the URL set — no network, no parser. A miss is DRIFT (the file was
// readable, the claim is absent), never UNAVAILABLE, which stays
// reserved for an unreadable README and env-format problems.
function missingSubstring(variable, entry, substring, readmePath) {
  return finding(
    "drift",
    "readme-claim",
    `README claim not found for ${variable} ${entry}`,
    substring,
    "substring absent",
    readmePath,
  );
}

function checkPresence(
  expectEntries,
  absentEntries,
  commitEntry,
  readme,
  readmePath,
  rows,
) {
  const findings = [];
  const lines = readme.text.split(/\r?\n/);

  for (const entry of expectEntries) {
    const npmjsToken = `www.npmjs.com/package/${entry.name}`;
    const versionToken = `v${entry.version}`;
    const carriesBoth = lines.some(
      (line) => line.includes(npmjsToken) && line.includes(versionToken),
    );
    const searched = `one line containing "${npmjsToken}" and "${versionToken}"`;
    recordRow(
      rows,
      "presence",
      `EXPECT_PACKAGES ${entry.raw}`,
      searched,
      carriesBoth ? "yes" : "no",
      carriesBoth ? "yes" : "no",
    );
    if (!carriesBoth) {
      findings.push(
        finding(
          "drift",
          "readme-claim",
          `README claim not found for EXPECT_PACKAGES ${entry.raw}`,
          searched,
          "no line carrying both",
          readmePath,
        ),
      );
    }
  }

  for (const entry of absentEntries) {
    for (const substring of [
      "Not published",
      `registry.npmjs.org/${entry.name}`,
    ]) {
      const present = readme.text.includes(substring);
      recordRow(
        rows,
        "presence",
        `ABSENT_PACKAGES ${entry.raw}`,
        substring,
        present ? "yes" : "no",
        present ? "yes" : "no",
      );
      if (!present) {
        findings.push(
          missingSubstring("ABSENT_PACKAGES", entry.raw, substring, readmePath),
        );
      }
    }
  }

  if (commitEntry) {
    for (const substring of [
      `single commit (${commitEntry.date}`,
      `github.com/${commitEntry.owner}/${commitEntry.repo}`,
    ]) {
      const present = readme.text.includes(substring);
      recordRow(
        rows,
        "presence",
        `SINGLE_COMMIT_REPO ${commitEntry.raw}`,
        substring,
        present ? "yes" : "no",
        present ? "yes" : "no",
      );
      if (!present) {
        findings.push(
          missingSubstring(
            "SINGLE_COMMIT_REPO",
            commitEntry.raw,
            substring,
            readmePath,
          ),
        );
      }
    }
  }

  return findings;
}

// ── Check classes ───────────────────────────────────────────────────────────

async function checkVersionExpect(entry, rows) {
  const r = await registryGet(entry.name);
  const subject = `EXPECT_PACKAGES ${entry.name}`;
  const expected = `dist-tags.latest = ${entry.version}`;
  if (r.error) {
    recordRow(
      rows,
      "registry",
      entry.name,
      entry.version,
      `fetch failed (${errorMessage(r.error)})`,
      "unavailable",
    );
    return [
      finding(
        "unavailable",
        "unavailable",
        subject,
        expected,
        `fetch failed (${errorMessage(r.error)})`,
        r.url,
      ),
    ];
  }
  if (r.status === 200) {
    if (r.latest === undefined || r.latest === null) {
      recordRow(
        rows,
        "registry",
        entry.name,
        entry.version,
        "no dist-tags.latest in the packument",
        "unavailable",
      );
      return [
        finding(
          "unavailable",
          "unavailable",
          subject,
          expected,
          "no dist-tags.latest in the packument",
          r.url,
        ),
      ];
    }
    if (String(r.latest) !== entry.version) {
      recordRow(
        rows,
        "registry",
        entry.name,
        entry.version,
        String(r.latest),
        "drift",
      );
      return [
        finding(
          "drift",
          "version",
          subject,
          entry.version,
          String(r.latest),
          r.url,
        ),
      ];
    }
    recordRow(
      rows,
      "registry",
      entry.name,
      entry.version,
      String(r.latest),
      "ok",
    );
    return [];
  }
  if (r.status === 404) {
    recordRow(rows, "registry", entry.name, entry.version, "404", "drift");
    return [
      finding(
        "drift",
        "version",
        subject,
        entry.version,
        "404 (not published)",
        r.url,
      ),
    ];
  }
  recordRow(
    rows,
    "registry",
    entry.name,
    entry.version,
    `HTTP ${r.status}`,
    "unavailable",
  );
  return [
    finding(
      "unavailable",
      "unavailable",
      subject,
      expected,
      `HTTP ${r.status}`,
      r.url,
    ),
  ];
}

async function checkAbsentExpect(entry, rows) {
  const r = await registryGet(entry.name);
  const subject = `ABSENT_PACKAGES ${entry.name}`;
  const expected = "404 (not published)";
  if (r.error) {
    recordRow(
      rows,
      "registry",
      entry.name,
      expected,
      `fetch failed (${errorMessage(r.error)})`,
      "unavailable",
    );
    return [
      finding(
        "unavailable",
        "unavailable",
        subject,
        expected,
        `fetch failed (${errorMessage(r.error)})`,
        r.url,
      ),
    ];
  }
  if (r.status === 404) {
    recordRow(rows, "registry", entry.name, expected, "404", "ok");
    return [];
  }
  if (r.status === 200) {
    const found =
      r.latest === undefined || r.latest === null
        ? "200 (published)"
        : `${r.latest} (published)`;
    recordRow(rows, "registry", entry.name, expected, found, "drift");
    return [finding("drift", "version", subject, expected, found, r.url)];
  }
  recordRow(
    rows,
    "registry",
    entry.name,
    expected,
    `HTTP ${r.status}`,
    "unavailable",
  );
  return [
    finding(
      "unavailable",
      "unavailable",
      subject,
      expected,
      `HTTP ${r.status}`,
      r.url,
    ),
  ];
}

async function checkCommits(entry, rows) {
  const r = await doCommitsGet(entry.owner, entry.repo);
  const subject = `SINGLE_COMMIT_REPO ${entry.owner}/${entry.repo}`;
  const repoUrl = `https://github.com/${entry.owner}/${entry.repo}`;
  const item = `${entry.owner}/${entry.repo}`;
  const expected = `1 commit, committer date ${entry.date}`;
  if (r.error) {
    recordRow(
      rows,
      "commits",
      item,
      expected,
      `fetch failed (${errorMessage(r.error)})`,
      "unavailable",
    );
    return [
      finding(
        "unavailable",
        "unavailable",
        subject,
        "the commits listing",
        `fetch failed (${errorMessage(r.error)})`,
        r.url,
      ),
    ];
  }
  if (r.status !== 200) {
    recordRow(
      rows,
      "commits",
      item,
      expected,
      `HTTP ${r.status}`,
      "unavailable",
    );
    return [
      finding(
        "unavailable",
        "unavailable",
        subject,
        "the commits listing",
        `HTTP ${r.status}`,
        r.url,
      ),
    ];
  }
  if (r.commits === null) {
    recordRow(
      rows,
      "commits",
      item,
      expected,
      "no commits array in the response",
      "unavailable",
    );
    return [
      finding(
        "unavailable",
        "unavailable",
        subject,
        "the commits listing",
        "no commits array in the response",
        r.url,
      ),
    ];
  }
  if (r.commits.length !== 1) {
    recordRow(
      rows,
      "commits",
      item,
      expected,
      `${r.commits.length} commits`,
      "drift",
    );
    return [
      finding(
        "drift",
        "commit",
        subject,
        "1 commit",
        `${r.commits.length} commits`,
        repoUrl,
      ),
    ];
  }
  const date = r.commits[0]?.commit?.committer?.date;
  if (typeof date !== "string" || date.length < 10) {
    recordRow(
      rows,
      "commits",
      item,
      expected,
      "no commit.committer.date in the response",
      "unavailable",
    );
    return [
      finding(
        "unavailable",
        "unavailable",
        subject,
        `committer date ${entry.date}`,
        "no commit.committer.date in the response",
        r.url,
      ),
    ];
  }
  if (date.slice(0, 10) !== entry.date) {
    recordRow(
      rows,
      "commits",
      item,
      expected,
      `1 commit, ${date.slice(0, 10)}`,
      "drift",
    );
    return [
      finding(
        "drift",
        "commit",
        subject,
        entry.date,
        date.slice(0, 10),
        repoUrl,
      ),
    ];
  }
  recordRow(
    rows,
    "commits",
    item,
    expected,
    `1 commit, ${date.slice(0, 10)}`,
    "ok",
  );
  return [];
}

async function checkLiveness(url, rows) {
  // www.npmjs.com/package/<x> and registry.npmjs.org/<x> are never fetched
  // directly: each maps to the registry GET, where both 200 and 404 mean
  // the registry answered — alive. Version truth belongs to class 1.
  const npmjsPage = url.match(/^https?:\/\/www\.npmjs\.com\/package\/(.+)$/);
  const npmjsRegistry = url.match(/^https?:\/\/registry\.npmjs\.org\/(.+)$/);
  if (npmjsPage || npmjsRegistry) {
    const pkg = (npmjsPage ?? npmjsRegistry)[1];
    const expected = "registry 200 or 404";
    const r = await registryGet(pkg);
    if (r.error) {
      recordRow(
        rows,
        "liveness",
        url,
        expected,
        `fetch failed (${errorMessage(r.error)})`,
        "unavailable",
      );
      return [
        finding(
          "unavailable",
          "unavailable",
          url,
          expected,
          `fetch failed (${errorMessage(r.error)})`,
          r.url,
        ),
      ];
    }
    if (r.status === 200 || r.status === 404) {
      recordRow(
        rows,
        "liveness",
        url,
        expected,
        `${r.status} (registry GET)`,
        "alive",
      );
      return [];
    }
    recordRow(
      rows,
      "liveness",
      url,
      expected,
      `${r.status} (registry GET)`,
      "unavailable",
    );
    return [
      finding(
        "unavailable",
        "unavailable",
        url,
        expected,
        `HTTP ${r.status}`,
        r.url,
      ),
    ];
  }
  // Every other URL: one HEAD with redirects followed, no GET fallback.
  try {
    const res = await fetchWithRetry(url, { method: "HEAD" });
    if (res.ok) {
      recordRow(
        rows,
        "liveness",
        url,
        "alive (2xx)",
        String(res.status),
        "alive",
      );
      return [];
    }
    if (res.status === 404) {
      recordRow(rows, "liveness", url, "alive (2xx)", "404", "drift");
      return [finding("drift", "dead-link", url, "alive (2xx)", "404", url)];
    }
    recordRow(
      rows,
      "liveness",
      url,
      "alive (2xx)",
      String(res.status),
      "unavailable",
    );
    return [
      finding(
        "unavailable",
        "unavailable",
        url,
        "alive (2xx)",
        String(res.status),
        url,
      ),
    ];
  } catch (err) {
    recordRow(
      rows,
      "liveness",
      url,
      "alive (2xx)",
      `fetch failed (${errorMessage(err)})`,
      "unavailable",
    );
    return [
      finding(
        "unavailable",
        "unavailable",
        url,
        "alive (2xx)",
        `fetch failed (${errorMessage(err)})`,
        url,
      ),
    ];
  }
}

// ── Drift report and issue mode ─────────────────────────────────────────────

function markdownTable(rows) {
  const widths = rows[0].map((_, i) =>
    Math.max(...rows.map((row) => String(row[i]).length)),
  );
  const render = (cells) =>
    "| " +
    cells.map((cell, i) => String(cell).padEnd(widths[i])).join(" | ") +
    " |";
  const lines = [render(rows[0])];
  lines.push(
    "| " + widths.map((width) => "-".repeat(width)).join(" | ") + " |",
  );
  for (const row of rows.slice(1)) lines.push(render(row));
  return lines.join("\n");
}

function renderReport(drift) {
  const timestamp = new Date().toISOString();
  const runId = process.env.GITHUB_RUN_ID;
  const runClause = runId ? `, GitHub run ${runId}` : "";
  const table = markdownTable([
    ["Class", "Expectation / link", "Expected", "Found", "Source"],
    ...drift.map((f) => [f.cls, f.subject, f.expected, f.found, f.source]),
  ]);
  return [
    "The monthly comparison-freshness check found drift in the README",
    "`## Comparison` section (run " + timestamp + runClause + ").",
    "",
    table,
    "",
    "Fix: update the README table and the workflow env lines (and the",
    "checked-date line), then close this issue — the next monthly run re-files",
    "if drift persists.",
    "",
  ].join("\n");
}

// ── Audit summary ────────────────────────────────────────────────────────────

// Column layout per fact class; the headings are pinned. Liveness rows
// show the effective final status in `found`; presence rows carry the
// yes/no verdict in both `found` and `verdict` (the rendered Found
// column).
const SUMMARY_TABLES = [
  {
    key: "registry",
    heading: "## Registry checks",
    header: ["Package", "Expected", "Found", "Verdict"],
    cells: (row) => [row.item, row.expected, row.found, row.verdict],
  },
  {
    key: "commits",
    heading: "## GitHub commits check",
    header: ["Repo", "Expected", "Found", "Verdict"],
    cells: (row) => [row.item, row.expected, row.found, row.verdict],
  },
  {
    key: "presence",
    heading: "## README presence",
    header: ["Entry", "Substring(s) searched", "Found"],
    cells: (row) => [row.item, row.expected, row.found],
  },
  {
    key: "liveness",
    heading: "## Link liveness",
    header: ["URL", "Final status", "Verdict"],
    cells: (row) => [row.item, row.found, row.verdict],
  },
];

const SUMMARY_ENV_VARIABLES = [
  "EXPECT_PACKAGES",
  "ABSENT_PACKAGES",
  "SINGLE_COMMIT_REPO",
];

// The three expectation values as given; unset and empty — the same
// states requireEnv treats as "unset or empty" — both render as
// "(unset)".
function formatEnvValue(value) {
  return value === undefined || value === "" ? "(unset)" : value;
}

// The env values every summary renders, built in one place: both
// write sites — the post-check one and the unreadable-README one —
// read the three expectation variables by name, and process.env is
// never iterated, so no other environment value (token and
// repository included) can reach the file.
function summaryEnvValues() {
  return {
    EXPECT_PACKAGES: process.env.EXPECT_PACKAGES,
    ABSENT_PACKAGES: process.env.ABSENT_PACKAGES,
    SINGLE_COMMIT_REPO: process.env.SINGLE_COMMIT_REPO,
  };
}

// The renderer receives envValues as a parameter and never touches
// process.env itself; the caller builds it from the three expectation
// variables read by name, so no other environment value — token and
// repository included — can reach the file.
function renderSummary(rows, envValues, findings) {
  const drift = findings.filter((f) => f.severity === "drift").length;
  const unavailable = findings.filter(
    (f) => f.severity === "unavailable",
  ).length;
  const word = unavailable > 0 ? "unavailable" : drift > 0 ? "drift" : "clean";
  const lines = [
    "# comparison-check — run summary",
    "",
    `Checked at: ${new Date().toISOString()}`,
    "",
    "Expectations as given:",
    "",
    ...SUMMARY_ENV_VARIABLES.map(
      (name) => `- \`${name}\`: ${formatEnvValue(envValues[name])}`,
    ),
    "",
  ];
  for (const table of SUMMARY_TABLES) {
    const tableRows = rows.filter((row) => row.table === table.key);
    lines.push(table.heading, "");
    if (tableRows.length === 0) {
      // A class left without rows — its entries failed env validation
      // or none were configured — keeps its heading and says so.
      lines.push("_No checks ran._", "");
    } else {
      lines.push(
        markdownTable([table.header, ...tableRows.map(table.cells)]),
        "",
      );
    }
  }
  lines.push(
    `Classification: ${word} — ${rows.length} checks, ${drift} drift, ${unavailable} unavailable`,
    "",
  );
  return lines.join("\n");
}

// Appends the audit trail to <path> after the checks ran, before the
// exit-code decision. The classification line is rendered from the
// findings as they stand at this point; a failed write then pushes an
// UNAVAILABLE finding — which forces exit 2 through the dominance
// rule — so stdout counts and summary counts can only diverge when no
// summary file exists at all.
function appendSummary(summaryPath, rows, envValues, findings) {
  try {
    appendFileSync(summaryPath, renderSummary(rows, envValues, findings));
  } catch (err) {
    findings.push(
      finding(
        "unavailable",
        "summary",
        summaryPath,
        "a writable summary file",
        err?.message ?? String(err),
        summaryPath,
      ),
    );
  }
}

async function restCall(url, init) {
  try {
    return { res: await fetchWithRetry(url, init), error: null };
  } catch (err) {
    return { res: null, error: err };
  }
}

async function runIssueMode(reportPath) {
  const missing = [];
  if (!GITHUB_TOKEN) missing.push("GITHUB_TOKEN");
  if (!GITHUB_REPOSITORY) missing.push("GITHUB_REPOSITORY");
  if (missing.length > 0) {
    say(`${missing.join(" and ")} not set — required for --report-issue`);
    process.exit(2);
  }

  let body;
  try {
    body = readFileSync(reportPath, "utf-8");
  } catch (err) {
    say(`cannot read report ${reportPath}: ${err.message}`);
    process.exit(2);
  }

  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  if (!owner || !repo || repo.includes("/")) {
    say(`GITHUB_REPOSITORY must be owner/repo, got "${GITHUB_REPOSITORY}"`);
    process.exit(2);
  }

  // In the workflow, turn the plain "GitHub run <n>" into the run URL.
  const serverUrl = process.env.GITHUB_SERVER_URL;
  const runId = process.env.GITHUB_RUN_ID;
  if (serverUrl && runId) {
    const runUrl = `${serverUrl}/${GITHUB_REPOSITORY}/actions/runs/${runId}`;
    body = body.replace(/GitHub run (\d+)/, `GitHub run [$1](${runUrl})`);
  }

  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const api = `${GITHUB_API}/repos/${owner}/${repo}`;

  const search = await restCall(
    `${api}/issues?labels=${ISSUE_LABEL}&state=open`,
    {
      headers,
    },
  );
  if (search.error) {
    say(`issue search failed: fetch failed (${errorMessage(search.error)})`);
    process.exit(2);
  }
  if (!search.res.ok) {
    say(`issue search answered HTTP ${search.res.status}`);
    process.exit(2);
  }
  let issues;
  try {
    issues = await search.res.json();
  } catch {
    issues = null;
  }
  if (!Array.isArray(issues)) {
    say("issue search returned no issue array");
    process.exit(2);
  }

  let method;
  let endpoint;
  let payload;
  let description;
  if (issues.length > 0) {
    const number = issues[0]?.number;
    if (typeof number !== "number") {
      say("issue search returned an issue without a number");
      process.exit(2);
    }
    method = "PATCH";
    endpoint = `${api}/issues/${number}`;
    payload = { body };
    description = `updated issue #${number}`;
  } else {
    method = "POST";
    endpoint = `${api}/issues`;
    payload = { title: ISSUE_TITLE, labels: [ISSUE_LABEL], body };
    description = "created a new issue";
  }

  const write = await restCall(endpoint, {
    method,
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (write.error) {
    say(
      `issue ${method === "PATCH" ? "update" : "creation"} failed: fetch failed (${errorMessage(write.error)})`,
    );
    process.exit(2);
  }
  if (!write.res.ok) {
    say(
      `issue ${method === "PATCH" ? "update" : "creation"} answered HTTP ${write.res.status}`,
    );
    process.exit(2);
  }
  if (method === "POST") {
    let created;
    try {
      created = await write.res.json();
    } catch {
      created = null;
    }
    description = `created issue #${created?.number ?? "?"}`;
  }
  say(description);
  process.exit(0);
}

// ── Check mode ──────────────────────────────────────────────────────────────

async function runCheckMode(readmePath, reportPath, summaryPath) {
  const readme = readReadme(readmePath, summaryPath);

  const envFindings = [];
  const expectEntries = parseExpectPackages(envFindings);
  const absentEntries = parseAbsentPackages(envFindings);
  const commitEntry = parseSingleCommitRepo(envFindings);

  const rows = [];
  const tasks = [];
  for (const entry of expectEntries) {
    tasks.push(async () => checkVersionExpect(entry, rows));
  }
  for (const entry of absentEntries) {
    tasks.push(async () => checkAbsentExpect(entry, rows));
  }
  if (commitEntry) {
    tasks.push(async () => checkCommits(commitEntry, rows));
  }
  for (const url of readme.urls) {
    tasks.push(async () => checkLiveness(url, rows));
  }

  const results = await Promise.all(tasks.map((task) => task()));
  const findings = [
    ...envFindings,
    ...checkPresence(
      expectEntries,
      absentEntries,
      commitEntry,
      readme,
      readmePath,
      rows,
    ),
    ...results.flat(),
  ];

  if (summaryPath) {
    appendSummary(summaryPath, rows, summaryEnvValues(), findings);
  }

  if (findings.length === 0) {
    say("ok");
    process.exit(0);
  }
  say(`${findings.length} problem(s):`);
  for (const f of findings) {
    say(
      `  ✗ ${f.cls} ${f.subject}: expected ${f.expected}, found ${f.found} (${f.source})`,
    );
  }

  const drift = findings.filter((f) => f.severity === "drift");
  const hasUnavailable = findings.some((f) => f.severity === "unavailable");
  if (reportPath && drift.length > 0) {
    try {
      writeFileSync(reportPath, renderReport(drift));
    } catch (err) {
      say(`cannot write report ${reportPath}: ${err.message}`);
      process.exit(2);
    }
  }
  process.exit(hasUnavailable ? 2 : 1);
}

// ── Entry point ─────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const opts = {
    readme: join(ROOT, "README.md"),
    report: null,
    reportIssue: null,
    summary: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (
      arg !== "--readme" &&
      arg !== "--report" &&
      arg !== "--report-issue" &&
      arg !== "--summary"
    ) {
      say(`usage: unknown argument ${arg}`);
      say(`usage: ${USAGE}`);
      process.exit(2);
    }
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      say(`usage: ${arg} requires a path`);
      say(`usage: ${USAGE}`);
      process.exit(2);
    }
    if (arg === "--readme") opts.readme = value;
    else if (arg === "--report") opts.report = value;
    else if (arg === "--summary") opts.summary = value;
    else opts.reportIssue = value;
    i++;
  }
  return opts;
}

try {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.reportIssue) {
    await runIssueMode(opts.reportIssue);
  } else {
    await runCheckMode(opts.readme, opts.report, opts.summary);
  }
} catch (err) {
  say(`unexpected failure: ${err?.message ?? err}`);
  process.exit(2);
}
