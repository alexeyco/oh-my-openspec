// Tests for scripts/check-comparison.mjs — offline, subprocess-level,
// against the env contract. Every case sets the three expectation
// variables in the child env: EXPECT_PACKAGES / ABSENT_PACKAGES /
// SINGLE_COMMIT_REPO — a key missing from the case's override takes the
// base fixture value, an explicit undefined unsets the variable (the
// unset-variable cases), a string pins it per case.
//
// One node:http server on 127.0.0.1 plays every live source: the npm
// registry and GitHub API seams (COMPARISON_NPM_REGISTRY /
// COMPARISON_GITHUB_API) plus the README's own liveness URLs, through
// per-test route tables with a request log that records request bodies
// too. Repeated entries for one method+url answer successive requests
// in order, the last repeating forever — the retry cases' 429-then-200
// shape. The unreachable case points the registry seam at a port that
// was bound and then closed.
//
// Fixture READMEs are tiny documents with no table markup — layout is
// never parsed. One line per EXPECT_PACKAGES entry carries
// www.npmjs.com/package/<name> and v<version>, the absent entry gets
// `Not published` and registry.npmjs.org/<name>, the commit entry gets
// `single commit (<date>` and github.com/<owner>/<repo>. npmjs and
// registry.npmjs.org/<name>, the commit entry gets
// `single commit (<date>` and github.com/<owner>/<repo>. npmjs and
// registry URLs stay real-shaped because the script maps them to the
// registry seam; every other link points at the fixture server. Each
// case spawns the script as a child process (asynchronously, so the
// fixture server stays responsive while the child fetches) and asserts
// the exit status, stdout, and report file; the --summary cases also
// assert the audit file's four tables and classification line; issue
// mode feeds --report-issue a report that a real drift run wrote.

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = "scripts/check-comparison.mjs";
const COMMITS_URL = "/repos/AngDrew/opencode-openspec/commits?per_page=2";
const ISSUE_SEARCH_URL =
  "/repos/owner/repo/issues?labels=comparison-drift&state=open";
const ISSUE_CREATE_URL = "/repos/owner/repo/issues";
const ISSUE_UPDATE_URL = "/repos/owner/repo/issues/7";

// The env contract every case inherits unless it overrides one of the
// three variables; the fixture routes answer exactly these values.
const BASE_EXPECT = "opencode-plugin-openspec@0.1.4";
const BASE_ABSENT = "opencode-openspec";
const BASE_COMMIT = "AngDrew/opencode-openspec@2026-02-01";
const SCOPED_EXPECT = "@lininn/openflow@0.5.2";

type Route = { method: string; url: string; status: number; body?: string };
type Request = {
  method: string;
  url: string;
  status: number;
  body?: string;
  authorization?: string;
};
type RunResult = { status: number; stdout: string; stderr: string };

let tempDir: string;
let server: Server;
let port = 0;
let closedPort = 0;
let routes: Route[] = [];
const requests: Request[] = [];

// Route entries repeated for the same method+url answer successive
// requests to that pair in order, the last entry repeating forever —
// the retry cases need 429-then-200 and 429-429. Request bodies (issue
// mode's POST/PATCH payloads) are recorded so tests can assert them;
// GETs and HEADs carry none. The Authorization header is recorded too
// so the token-bearing commits GET is provable.
function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  const matches = routes.filter(
    (r) => r.method === req.method && r.url === req.url,
  );
  const prior = requests.filter(
    (r) => r.method === req.method && r.url === req.url,
  ).length;
  const route = matches[Math.min(prior, matches.length - 1)];
  const status = route?.status ?? 404;
  let requestBody: string | undefined;
  req.setEncoding("utf-8");
  req.on("data", (chunk: string) => {
    requestBody = (requestBody ?? "") + chunk;
  });
  req.on("end", () => {
    requests.push({
      method: req.method ?? "?",
      url: req.url ?? "?",
      status,
      body: requestBody,
      authorization: req.headers.authorization,
    });
    res.statusCode = status;
    if (route?.body !== undefined && req.method !== "HEAD") {
      res.setHeader("content-type", "application/json");
      res.end(route.body);
    } else {
      res.end();
    }
  });
}

function listen(target: Server): Promise<void> {
  return new Promise((resolveListen, rejectListen) => {
    target.once("error", rejectListen);
    target.listen(0, "127.0.0.1", () => resolveListen());
  });
}

function close(target: Server): Promise<void> {
  return new Promise((resolveClose) => {
    target.close(() => resolveClose());
  });
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "o-opos-comparison-"));
  server = createServer(handleRequest);
  await listen(server);
  port = (server.address() as AddressInfo).port;
  // Bind the throwaway server only after the fixture server is up, so
  // the kernel cannot hand the same port to both; closing it leaves a
  // port that answers every connection with ECONNREFUSED.
  const throwaway = createServer();
  await listen(throwaway);
  closedPort = (throwaway.address() as AddressInfo).port;
  await close(throwaway);
});

after(async () => {
  await close(server);
  rmSync(tempDir, { recursive: true, force: true });
});

function serve(routeTable: Route[]): void {
  routes = routeTable;
  requests.length = 0;
}

function writeFixture(name: string, readme: string): string {
  const path = join(tempDir, name);
  writeFileSync(path, readme);
  return path;
}

function reportPath(name: string): string {
  return join(tempDir, name);
}

function registryBase(): string {
  return `http://127.0.0.1:${port}`;
}

function countRequests(url: string): number {
  return requests.filter((r) => r.url === url).length;
}

// A markdown-table row matcher tolerant of the summary renderer's
// column padding: string cells match exactly (escaped), RegExp cells
// match loosely — the unavailable cases leave the fetch-error code
// open.
function summaryRow(...cells: (string | RegExp)[]): RegExp {
  const parts = cells.map((cell) =>
    typeof cell === "string"
      ? cell.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      : `(?:${cell.source})`,
  );
  return new RegExp(`^\\| ${parts.join(" +\\| ")} +\\|$`, "m");
}

function assertSummaryRow(
  content: string,
  ...cells: (string | RegExp)[]
): void {
  const re = summaryRow(...cells);
  assert.ok(re.test(content), `missing summary row ${re} in:\n${content}`);
}

// Overrides for the three expectation variables in the child env, plus
// any other variable a case needs (the fake-token case sets
// GITHUB_TOKEN/GITHUB_REPOSITORY here).
type CheckEnv = {
  EXPECT_PACKAGES?: string;
  ABSENT_PACKAGES?: string;
  SINGLE_COMMIT_REPO?: string;
  [key: string]: string | undefined;
};

function runCheck(
  readme: string,
  report: string,
  env: CheckEnv = {},
  registry: string = registryBase(),
  summary?: string,
): Promise<RunResult> {
  return new Promise((resolveRun, rejectRun) => {
    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      COMPARISON_NPM_REGISTRY: registry,
      COMPARISON_GITHUB_API: registryBase(),
      EXPECT_PACKAGES: BASE_EXPECT,
      ABSENT_PACKAGES: BASE_ABSENT,
      SINGLE_COMMIT_REPO: BASE_COMMIT,
      ...env,
    };
    // An explicit undefined override unsets the variable in the child.
    for (const key of Object.keys(childEnv)) {
      if (childEnv[key] === undefined) delete childEnv[key];
    }
    const args = [SCRIPT, "--readme", readme, "--report", report];
    if (summary !== undefined) {
      args.push("--summary", summary);
    }
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      env: childEnv,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf-8");
    child.stderr?.setEncoding("utf-8");
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", rejectRun);
    child.once("close", (code) => {
      resolveRun({ status: code ?? -1, stdout, stderr });
    });
  });
}

function packument(latest: string): string {
  return JSON.stringify({ "dist-tags": { latest } });
}

function commits(dates: string[]): string {
  return JSON.stringify(
    dates.map((date) => ({ commit: { committer: { date } } })),
  );
}

// Everything the base fixture expects, answered locally: the matching
// packument, the unpublished 404, one clean commit, and the alive
// non-npm liveness link.
function cleanRoutes(): Route[] {
  return [
    {
      method: "GET",
      url: "/opencode-plugin-openspec",
      status: 200,
      body: packument("0.1.4"),
    },
    { method: "GET", url: "/opencode-openspec", status: 404 },
    {
      method: "GET",
      url: COMMITS_URL,
      status: 200,
      body: commits(["2026-02-01T05:47:42Z"]),
    },
    { method: "HEAD", url: "/gh", status: 200 },
  ];
}

// Routes for the scoped @lininn/openflow entry plus the base absent and
// commit expectations.
function scopedRoutes(): Route[] {
  return [
    {
      method: "GET",
      url: "/@lininn/openflow",
      status: 200,
      body: packument("0.5.2"),
    },
    ...cleanRoutes().filter((r) => r.url !== "/opencode-plugin-openspec"),
  ];
}

// A presence-satisfying fixture README — no table markup, because
// layout is never parsed. Defaults mirror the base env contract; an
// explicit [] / null empties that section. Tweaks mutate single
// presence tokens for the readme-claim drift cases.
type FixtureEnv = {
  expect?: string[];
  absent?: string[];
  commit?: string | null;
};

type FixtureTweaks = {
  // The version token shown on the expect line (wrong-digit drift).
  expectVersion?: string;
  // Drop the `Not published` phrase from the absent line (drift).
  dropNotPublished?: boolean;
  // Put the absent pair's two substrings on separate lines (pass).
  splitAbsent?: boolean;
  // Put the commit pair's two substrings on separate lines (pass).
  splitCommit?: boolean;
  // The date shown in the commit line (moved README date drift).
  commitDate?: string;
  // Reformat the expect line as a table row with extra spacing and
  // moved cell boundaries around the same two tokens (pass).
  reformatExpect?: boolean;
};

function fixtureReadme(
  env: FixtureEnv = {},
  tweaks: FixtureTweaks = {},
): string {
  const expect = env.expect ?? [BASE_EXPECT];
  const absent = env.absent ?? [BASE_ABSENT];
  const commit = env.commit === undefined ? BASE_COMMIT : env.commit;
  const lines: string[] = ["# Fixture README", "", "## Comparison", ""];
  for (const raw of expect) {
    const name = raw.slice(0, raw.lastIndexOf("@"));
    const version = tweaks.expectVersion ?? raw.slice(raw.lastIndexOf("@") + 1);
    const npmjs = `https://www.npmjs.com/package/${name}`;
    lines.push(
      tweaks.reformatExpect
        ? `| package |  ${name}  |  v${version} — ${npmjs}  |  note |`
        : `- [${name} v${version}](${npmjs})`,
    );
  }
  for (const name of absent) {
    const registry = `https://registry.npmjs.org/${name}`;
    const claim = tweaks.dropNotPublished
      ? "Gone from the registry"
      : "Not published";
    if (tweaks.splitAbsent) {
      lines.push(`- ${claim} — the registry answers 404.`);
      lines.push(`- [registry.npmjs.org/${name}](${registry})`);
    } else {
      lines.push(`- ${claim} — [registry.npmjs.org/${name}](${registry})`);
    }
  }
  if (commit !== null) {
    const repo = commit.slice(0, repoAt(commit));
    const date = tweaks.commitDate ?? commit.slice(repoAt(commit) + 1);
    const github = `github.com/${repo}`;
    if (tweaks.splitCommit) {
      lines.push(`- [${github}](${registryBase()}/gh) — see below.`);
      lines.push(`- that repository has a single commit (${date})`);
    } else {
      lines.push(
        `- [${github}](${registryBase()}/gh) has a single commit (${date})`,
      );
    }
  }
  lines.push("");
  return lines.join("\n");
}

// The last-@ split the script itself uses — scoped names contain @.
function repoAt(entry: string): number {
  return entry.lastIndexOf("@");
}

// Issue mode is driven through the GitHub API seam only: the fake REST
// endpoint is the fixture server, and the report body is asserted from
// the recorded request payloads.
function runIssue(
  report: string,
  env: Record<string, string | undefined>,
): Promise<RunResult> {
  return new Promise((resolveRun, rejectRun) => {
    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      // Issue mode never reads the registry, but pointing both seams
      // at the fixture keeps any accidental fetch on 127.0.0.1.
      COMPARISON_NPM_REGISTRY: registryBase(),
      COMPARISON_GITHUB_API: registryBase(),
      // Never set locally; with both present issue mode rewrites the
      // report's plain "GitHub run <n>" into a URL, changing the body.
      GITHUB_SERVER_URL: "",
      GITHUB_RUN_ID: "",
      ...env,
    };
    for (const key of Object.keys(childEnv)) {
      if (childEnv[key] === undefined) delete childEnv[key];
    }
    const child = spawn(process.execPath, [SCRIPT, "--report-issue", report], {
      cwd: ROOT,
      env: childEnv,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf-8");
    child.stderr?.setEncoding("utf-8");
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", rejectRun);
    child.once("close", (code) => {
      resolveRun({ status: code ?? -1, stdout, stderr });
    });
  });
}

// Produce a real drift report for the issue-mode cases: run check mode
// with a drift env first, then hand the file --report wrote to
// --report-issue, so payload assertions compare against actual output.
async function writeDriftReport(name: string): Promise<string> {
  serve(cleanRoutes());
  const readme = writeFixture(
    `${name}.md`,
    fixtureReadme({ expect: ["opencode-plugin-openspec@9.9.9"] }),
  );
  const report = reportPath(`${name}.report.md`);
  const run = await runCheck(readme, report, {
    EXPECT_PACKAGES: "opencode-plugin-openspec@9.9.9",
  });
  assert.equal(run.status, 1, `stdout: ${run.stdout}`);
  const body = readFileSync(report, "utf-8");
  // The env-surface report shape: the renamed column header, an
  // env-entry subject row, and the dual-update Fix line.
  assert.ok(body.includes("Expectation / link"), body);
  assert.ok(body.includes("EXPECT_PACKAGES opencode-plugin-openspec"), body);
  assert.ok(
    body.includes("update the README table and the workflow env lines"),
    body,
  );
  return report;
}

describe("comparison check: core cases", () => {
  it(
    "exits zero with a final ok line on a clean fixture",
    { timeout: 20_000 },
    async () => {
      serve(cleanRoutes());
      const readme = writeFixture("clean.md", fixtureReadme());
      const run = await runCheck(readme, reportPath("clean.report.md"));
      assert.equal(run.status, 0);
      assert.ok(
        run.stdout.endsWith("comparison-check: ok\n"),
        `stdout: ${run.stdout}`,
      );
      for (const line of run.stdout.split("\n")) {
        if (line !== "") {
          assert.ok(
            line.startsWith("comparison-check:"),
            `unprefixed line: ${line}`,
          );
        }
      }
    },
  );

  it(
    "flags version drift with its env entry, expected, found, and source",
    { timeout: 20_000 },
    async () => {
      serve(cleanRoutes());
      const readme = writeFixture(
        "drift.md",
        fixtureReadme({ expect: ["opencode-plugin-openspec@9.9.9"] }),
      );
      const report = reportPath("drift.report.md");
      const run = await runCheck(readme, report, {
        EXPECT_PACKAGES: "opencode-plugin-openspec@9.9.9",
      });
      assert.equal(run.status, 1);
      assert.ok(
        run.stdout.includes(
          `✗ version EXPECT_PACKAGES opencode-plugin-openspec: expected 9.9.9, found 0.1.4 (${registryBase()}/opencode-plugin-openspec)`,
        ),
        `stdout: ${run.stdout}`,
      );
      const body = readFileSync(report, "utf-8");
      assert.ok(
        body.includes("EXPECT_PACKAGES opencode-plugin-openspec"),
        body,
      );
      assert.ok(body.includes("9.9.9"), body);
      assert.ok(body.includes("0.1.4"), body);
      assert.ok(
        body.includes(`${registryBase()}/opencode-plugin-openspec`),
        body,
      );
    },
  );

  it("splits a scoped entry on the last @", { timeout: 20_000 }, async () => {
    serve(scopedRoutes());
    const readme = writeFixture(
      "scoped.md",
      fixtureReadme({ expect: [SCOPED_EXPECT] }),
    );
    const run = await runCheck(readme, reportPath("scoped.report.md"), {
      EXPECT_PACKAGES: SCOPED_EXPECT,
    });
    assert.equal(run.status, 0);
    assert.ok(
      run.stdout.endsWith("comparison-check: ok\n"),
      `stdout: ${run.stdout}`,
    );
    // The whole name — leading @ included — is the registry path.
    const hits = requests.filter((r) => r.url === "/@lininn/openflow");
    assert.equal(hits.length, 1);
    assert.equal(hits[0]?.method, "GET");
  });

  it(
    "verifies the absent entry's 404 expectation cleanly",
    { timeout: 20_000 },
    async () => {
      serve(cleanRoutes());
      const readme = writeFixture("unpublished.md", fixtureReadme());
      const run = await runCheck(readme, reportPath("unpublished.report.md"));
      assert.equal(run.status, 0);
      assert.ok(!run.stdout.includes("✗"), `stdout: ${run.stdout}`);
      // The registry answered the expected 404 and produced no finding.
      const hits = requests.filter((r) => r.url === "/opencode-openspec");
      assert.equal(hits.length, 1);
      assert.equal(hits[0]?.method, "GET");
      assert.equal(hits[0]?.status, 404);
    },
  );

  it(
    "flags malformed env entries loudly, never silently",
    { timeout: 20_000 },
    async () => {
      serve(cleanRoutes());
      const readme = writeFixture(
        "malformed.md",
        fixtureReadme({ expect: [], commit: null }),
      );
      const report = reportPath("malformed.report.md");
      const run = await runCheck(readme, report, {
        EXPECT_PACKAGES: "opencode-plugin-openspec",
        SINGLE_COMMIT_REPO: "",
      });
      assert.equal(run.status, 2);
      assert.ok(
        run.stdout.includes(
          "✗ env EXPECT_PACKAGES opencode-plugin-openspec: expected a name@version entry, found no @ in the entry (EXPECT_PACKAGES)",
        ),
        `stdout: ${run.stdout}`,
      );
      assert.ok(
        run.stdout.includes(
          "✗ env SINGLE_COMMIT_REPO: expected an owner/repo@YYYY-MM-DD entry, found unset or empty (SINGLE_COMMIT_REPO)",
        ),
        `stdout: ${run.stdout}`,
      );
      assert.ok(!existsSync(report));
    },
  );

  it(
    "flags a bad SINGLE_COMMIT_REPO date as an env finding",
    { timeout: 20_000 },
    async () => {
      serve(cleanRoutes());
      const readme = writeFixture(
        "bad-date.md",
        fixtureReadme({ commit: null }),
      );
      const run = await runCheck(readme, reportPath("bad-date.report.md"), {
        SINGLE_COMMIT_REPO: "AngDrew/opencode-openspec@02-2026",
      });
      assert.equal(run.status, 2);
      assert.ok(
        run.stdout.includes(
          '✗ env SINGLE_COMMIT_REPO AngDrew/opencode-openspec@02-2026: expected an owner/repo@YYYY-MM-DD entry, found date "02-2026" is not YYYY-MM-DD (SINGLE_COMMIT_REPO)',
        ),
        `stdout: ${run.stdout}`,
      );
      // The malformed entry was dropped — no commits request was made.
      assert.equal(countRequests(COMMITS_URL), 0);
    },
  );

  it(
    "exits two naming an unset expectation variable",
    { timeout: 20_000 },
    async () => {
      serve(cleanRoutes());
      const readme = writeFixture("unset.md", fixtureReadme({ absent: [] }));
      const run = await runCheck(readme, reportPath("unset.report.md"), {
        ABSENT_PACKAGES: undefined,
      });
      assert.equal(run.status, 2);
      assert.ok(
        run.stdout.includes(
          "✗ env ABSENT_PACKAGES: expected a comma-separated package name list, found unset or empty (ABSENT_PACKAGES)",
        ),
        `stdout: ${run.stdout}`,
      );
    },
  );

  it(
    "passes presence on a reformatted version line",
    { timeout: 20_000 },
    async () => {
      serve(cleanRoutes());
      const readme = writeFixture(
        "reformatted.md",
        fixtureReadme({}, { reformatExpect: true }),
      );
      const run = await runCheck(readme, reportPath("reformatted.report.md"));
      assert.equal(run.status, 0);
      assert.ok(
        run.stdout.endsWith("comparison-check: ok\n"),
        `stdout: ${run.stdout}`,
      );
    },
  );

  it(
    "exits two when the registry base is unreachable",
    { timeout: 20_000 },
    async () => {
      serve(cleanRoutes());
      const readme = writeFixture("unreachable.md", fixtureReadme());
      const run = await runCheck(
        readme,
        reportPath("unreachable.report.md"),
        {},
        `http://127.0.0.1:${closedPort}`,
      );
      assert.equal(run.status, 2);
      assert.ok(
        run.stdout.includes(
          "✗ unavailable EXPECT_PACKAGES opencode-plugin-openspec: expected dist-tags.latest = 0.1.4, found fetch failed",
        ),
        `stdout: ${run.stdout}`,
      );
      assert.ok(
        run.stdout.includes(
          `(http://127.0.0.1:${closedPort}/opencode-plugin-openspec)`,
        ),
        `stdout: ${run.stdout}`,
      );
    },
  );

  it(
    "exits two printing both drift and unavailable findings",
    { timeout: 20_000 },
    async () => {
      serve(
        cleanRoutes().map((r) => (r.url === "/gh" ? { ...r, status: 403 } : r)),
      );
      const readme = writeFixture(
        "mixed.md",
        fixtureReadme({ expect: ["opencode-plugin-openspec@9.9.9"] }),
      );
      const report = reportPath("mixed.report.md");
      const run = await runCheck(readme, report, {
        EXPECT_PACKAGES: "opencode-plugin-openspec@9.9.9",
      });
      assert.equal(run.status, 2);
      assert.ok(run.stdout.includes("2 problem(s):"), run.stdout);
      assert.ok(
        run.stdout.includes(
          "✗ version EXPECT_PACKAGES opencode-plugin-openspec: expected 9.9.9, found 0.1.4",
        ),
        `stdout: ${run.stdout}`,
      );
      assert.ok(
        run.stdout.includes(
          `✗ unavailable ${registryBase()}/gh: expected alive (2xx), found 403`,
        ),
        `stdout: ${run.stdout}`,
      );
      // The report carries drift only; the unavailable link stays out.
      const body = readFileSync(report, "utf-8");
      assert.ok(body.includes("9.9.9"), body);
      assert.ok(!body.includes("/gh"), body);
    },
  );
});

describe("comparison check: class cases", () => {
  it("flags a second commit as drift", { timeout: 20_000 }, async () => {
    serve(
      cleanRoutes().map((r) =>
        r.url === COMMITS_URL
          ? {
              ...r,
              body: commits(["2026-02-01T05:47:42Z", "2026-03-15T00:00:00Z"]),
            }
          : r,
      ),
    );
    const readme = writeFixture("two-commits.md", fixtureReadme());
    const report = reportPath("two-commits.report.md");
    const run = await runCheck(readme, report);
    assert.equal(run.status, 1);
    assert.ok(
      run.stdout.includes(
        "✗ commit SINGLE_COMMIT_REPO AngDrew/opencode-openspec: expected 1 commit, found 2 commits",
      ),
      `stdout: ${run.stdout}`,
    );
    assert.ok(readFileSync(report, "utf-8").includes("2 commits"));
  });

  it("flags a moved commits date as drift", { timeout: 20_000 }, async () => {
    serve(
      cleanRoutes().map((r) =>
        r.url === COMMITS_URL
          ? { ...r, body: commits(["2026-03-15T00:00:00Z"]) }
          : r,
      ),
    );
    const readme = writeFixture("moved-date.md", fixtureReadme());
    const run = await runCheck(readme, reportPath("moved-date.report.md"));
    assert.equal(run.status, 1);
    assert.ok(
      run.stdout.includes(
        "✗ commit SINGLE_COMMIT_REPO AngDrew/opencode-openspec: expected 2026-02-01, found 2026-03-15",
      ),
      `stdout: ${run.stdout}`,
    );
  });

  it("makes exactly one GitHub call per run", { timeout: 20_000 }, async () => {
    serve(cleanRoutes());
    const readme = writeFixture("one-github-call.md", fixtureReadme());
    const run = await runCheck(readme, reportPath("one-github-call.report.md"));
    assert.equal(run.status, 0);
    // The single SINGLE_COMMIT_REPO entry means one commits GET; the
    // README's github.com link text carries no scheme and is never
    // fetched.
    const githubCalls = requests.filter((r) => r.url.startsWith("/repos/"));
    assert.equal(githubCalls.length, 1);
    assert.equal(githubCalls[0]?.method, "GET");
    assert.equal(githubCalls[0]?.url, COMMITS_URL);
  });

  it("flags a dead non-npm link as drift", { timeout: 20_000 }, async () => {
    serve(
      cleanRoutes().map((r) => (r.url === "/gh" ? { ...r, status: 404 } : r)),
    );
    const readme = writeFixture("dead-link.md", fixtureReadme());
    const report = reportPath("dead-link.report.md");
    const run = await runCheck(readme, report);
    assert.equal(run.status, 1);
    assert.ok(
      run.stdout.includes(
        `✗ dead-link ${registryBase()}/gh: expected alive (2xx), found 404`,
      ),
      `stdout: ${run.stdout}`,
    );
    assert.ok(readFileSync(report, "utf-8").includes("/gh"));
  });

  it(
    "treats a 403 challenge as unavailable, not drift",
    { timeout: 20_000 },
    async () => {
      serve(
        cleanRoutes().map((r) => (r.url === "/gh" ? { ...r, status: 403 } : r)),
      );
      const readme = writeFixture("forbidden.md", fixtureReadme());
      const report = reportPath("forbidden.report.md");
      const run = await runCheck(readme, report);
      assert.equal(run.status, 2);
      assert.ok(
        run.stdout.includes(
          `✗ unavailable ${registryBase()}/gh: expected alive (2xx), found 403`,
        ),
        `stdout: ${run.stdout}`,
      );
      assert.ok(!run.stdout.includes("dead-link"), run.stdout);
      assert.ok(!existsSync(report));
    },
  );

  it(
    "does not flag a registry 404 as a dead link",
    { timeout: 20_000 },
    async () => {
      serve(cleanRoutes());
      const readme = writeFixture("registry-404.md", fixtureReadme());
      const run = await runCheck(readme, reportPath("registry-404.report.md"));
      assert.equal(run.status, 0);
      assert.ok(!run.stdout.includes("dead-link"), run.stdout);
      // The README's registry.npmjs.org URL got its 404 and stayed
      // alive — through the same GET as the ABSENT_PACKAGES expectation.
      const hits = requests.filter((r) => r.url === "/opencode-openspec");
      assert.equal(hits.length, 1);
      assert.equal(hits[0]?.status, 404);
    },
  );

  it(
    "checks npmjs.com package pages through the registry",
    { timeout: 20_000 },
    async () => {
      serve(scopedRoutes());
      const readme = writeFixture(
        "npmjs-page.md",
        fixtureReadme({ expect: [SCOPED_EXPECT] }),
      );
      const run = await runCheck(readme, reportPath("npmjs-page.report.md"), {
        EXPECT_PACKAGES: SCOPED_EXPECT,
      });
      assert.equal(run.status, 0);
      // The version expectation and the README's npmjs.com link share
      // one registry GET; no request ever carries an npmjs.com page
      // path.
      assert.equal(countRequests("/@lininn/openflow"), 1);
      assert.ok(
        requests.every(
          (r) => !r.url.startsWith("/package/") && !r.url.includes("npmjs.com"),
        ),
        JSON.stringify(requests),
      );
    },
  );

  it(
    "passes version claims present on one line",
    { timeout: 20_000 },
    async () => {
      serve([
        ...scopedRoutes(),
        {
          method: "GET",
          url: "/opencode-plugin-openspec",
          status: 200,
          body: packument("0.1.4"),
        },
        {
          method: "GET",
          url: "/@moyaspace/openspec-superpowers-opencode",
          status: 200,
          body: packument("1.1.1"),
        },
      ]);
      const readme = writeFixture(
        "presence-pass.md",
        fixtureReadme({
          expect: [
            "opencode-plugin-openspec@0.1.4",
            "@moyaspace/openspec-superpowers-opencode@1.1.1",
            SCOPED_EXPECT,
          ],
        }),
      );
      const run = await runCheck(
        readme,
        reportPath("presence-pass.report.md"),
        {
          EXPECT_PACKAGES:
            "opencode-plugin-openspec@0.1.4,@moyaspace/openspec-superpowers-opencode@1.1.1,@lininn/openflow@0.5.2",
        },
      );
      assert.equal(run.status, 0);
      assert.ok(!run.stdout.includes("readme-claim"), run.stdout);
      assert.ok(
        run.stdout.endsWith("comparison-check: ok\n"),
        `stdout: ${run.stdout}`,
      );
    },
  );

  it(
    "flags a wrong version digit in the README as drift",
    { timeout: 20_000 },
    async () => {
      serve(scopedRoutes());
      const readme = writeFixture(
        "wrong-digit.md",
        fixtureReadme({ expect: [SCOPED_EXPECT] }, { expectVersion: "0.5.3" }),
      );
      const report = reportPath("wrong-digit.report.md");
      const run = await runCheck(readme, report, {
        EXPECT_PACKAGES: SCOPED_EXPECT,
      });
      assert.equal(run.status, 1);
      assert.ok(
        run.stdout.includes(
          "✗ readme-claim README claim not found for EXPECT_PACKAGES @lininn/openflow@0.5.2",
        ),
        `stdout: ${run.stdout}`,
      );
      assert.ok(
        run.stdout.includes(
          'one line containing "www.npmjs.com/package/@lininn/openflow" and "v0.5.2"',
        ),
        `stdout: ${run.stdout}`,
      );
      // The README path is the finding's source, even though the env
      // entry and the served packument agree.
      assert.ok(run.stdout.includes(`(${readme})`), `stdout: ${run.stdout}`);
      const body = readFileSync(report, "utf-8");
      assert.ok(
        body.includes(
          "README claim not found for EXPECT_PACKAGES @lininn/openflow@0.5.2",
        ),
        body,
      );
    },
  );

  it(
    "passes absent-claim substrings split across lines",
    { timeout: 20_000 },
    async () => {
      serve(cleanRoutes());
      const readme = writeFixture(
        "absent-split.md",
        fixtureReadme({}, { splitAbsent: true }),
      );
      const run = await runCheck(readme, reportPath("absent-split.report.md"));
      assert.equal(run.status, 0);
      assert.ok(!run.stdout.includes("readme-claim"), run.stdout);
    },
  );

  it(
    "flags a dropped Not published claim as drift",
    { timeout: 20_000 },
    async () => {
      serve(cleanRoutes());
      const readme = writeFixture(
        "not-published-dropped.md",
        fixtureReadme({}, { dropNotPublished: true }),
      );
      const run = await runCheck(
        readme,
        reportPath("not-published-dropped.report.md"),
      );
      assert.equal(run.status, 1);
      assert.ok(
        run.stdout.includes(
          "✗ readme-claim README claim not found for ABSENT_PACKAGES opencode-openspec: expected Not published, found substring absent",
        ),
        `stdout: ${run.stdout}`,
      );
      assert.ok(run.stdout.includes(`(${readme})`), `stdout: ${run.stdout}`);
    },
  );

  it(
    "passes commit-claim substrings split across lines",
    { timeout: 20_000 },
    async () => {
      serve(cleanRoutes());
      const readme = writeFixture(
        "commit-split.md",
        fixtureReadme({}, { splitCommit: true }),
      );
      const run = await runCheck(readme, reportPath("commit-split.report.md"));
      assert.equal(run.status, 0);
      assert.ok(!run.stdout.includes("readme-claim"), run.stdout);
    },
  );

  it(
    "flags a moved README commit date as a missing claim",
    { timeout: 20_000 },
    async () => {
      serve(cleanRoutes());
      const readme = writeFixture(
        "moved-readme-date.md",
        fixtureReadme({}, { commitDate: "2026-03-15" }),
      );
      const run = await runCheck(
        readme,
        reportPath("moved-readme-date.report.md"),
      );
      assert.equal(run.status, 1);
      assert.ok(
        run.stdout.includes(
          "✗ readme-claim README claim not found for SINGLE_COMMIT_REPO AngDrew/opencode-openspec@2026-02-01: expected single commit (2026-02-01, found substring absent",
        ),
        `stdout: ${run.stdout}`,
      );
      assert.ok(run.stdout.includes(`(${readme})`), `stdout: ${run.stdout}`);
    },
  );

  it(
    "passes reformatted spacing around the tokens",
    { timeout: 20_000 },
    async () => {
      serve(scopedRoutes());
      const readme = writeFixture(
        "reformat-tokens.md",
        fixtureReadme({ expect: [SCOPED_EXPECT] }, { reformatExpect: true }),
      );
      const run = await runCheck(
        readme,
        reportPath("reformat-tokens.report.md"),
        {
          EXPECT_PACKAGES: SCOPED_EXPECT,
        },
      );
      assert.equal(run.status, 0);
      assert.ok(!run.stdout.includes("readme-claim"), run.stdout);
    },
  );
});

describe("comparison check: retry policy", () => {
  it(
    "recovers from one 429 through the single retry",
    { timeout: 20_000 },
    async () => {
      // The EXPECT_PACKAGES package is answered 429 once, then the
      // expected packument: only the one retry after 2000 ms makes
      // the run clean.
      serve([
        { method: "GET", url: "/opencode-plugin-openspec", status: 429 },
        {
          method: "GET",
          url: "/opencode-plugin-openspec",
          status: 200,
          body: packument("0.1.4"),
        },
        ...cleanRoutes().filter((r) => r.url !== "/opencode-plugin-openspec"),
      ]);
      const readme = writeFixture("retry-once.md", fixtureReadme());
      const run = await runCheck(readme, reportPath("retry-once.report.md"));
      assert.equal(run.status, 0);
      assert.ok(
        run.stdout.endsWith("comparison-check: ok\n"),
        `stdout: ${run.stdout}`,
      );
      assert.equal(countRequests("/opencode-plugin-openspec"), 2);
    },
  );

  it(
    "classifies a second 429 as unavailable after the single retry",
    { timeout: 20_000 },
    async () => {
      serve([
        { method: "GET", url: "/opencode-plugin-openspec", status: 429 },
        { method: "GET", url: "/opencode-plugin-openspec", status: 429 },
        ...cleanRoutes().filter((r) => r.url !== "/opencode-plugin-openspec"),
      ]);
      const readme = writeFixture("retry-exhausted.md", fixtureReadme());
      const run = await runCheck(
        readme,
        reportPath("retry-exhausted.report.md"),
      );
      assert.equal(run.status, 2);
      assert.ok(
        run.stdout.includes(
          `✗ unavailable EXPECT_PACKAGES opencode-plugin-openspec: expected dist-tags.latest = 0.1.4, found HTTP 429 (${registryBase()}/opencode-plugin-openspec)`,
        ),
        `stdout: ${run.stdout}`,
      );
      // Retry exhaustion stops at two attempts — no third request.
      assert.equal(countRequests("/opencode-plugin-openspec"), 2);
    },
  );
});

describe("comparison check: issue mode", () => {
  it(
    "files one new issue when the dedup search is empty",
    { timeout: 20_000 },
    async () => {
      const report = await writeDriftReport("issue-create");
      serve([
        { method: "GET", url: ISSUE_SEARCH_URL, status: 200, body: "[]" },
        {
          method: "POST",
          url: ISSUE_CREATE_URL,
          status: 201,
          body: '{"number": 42}',
        },
      ]);
      const run = await runIssue(report, {
        GITHUB_TOKEN: "test-token",
        GITHUB_REPOSITORY: "owner/repo",
      });
      assert.equal(run.status, 0);
      assert.ok(
        run.stdout.includes("comparison-check: created issue #42"),
        `stdout: ${run.stdout}`,
      );
      const posts = requests.filter(
        (r) => r.method === "POST" && r.url === ISSUE_CREATE_URL,
      );
      assert.equal(posts.length, 1);
      assert.deepEqual(JSON.parse(posts[0]?.body ?? ""), {
        title: "README comparison drift",
        labels: ["comparison-drift"],
        body: readFileSync(report, "utf-8"),
      });
      assert.equal(countRequests(ISSUE_SEARCH_URL), 1);
      assert.ok(
        requests.every((r) => r.method !== "PATCH"),
        JSON.stringify(requests),
      );
    },
  );

  it(
    "updates the existing issue and posts nothing on a dedup hit",
    { timeout: 20_000 },
    async () => {
      const report = await writeDriftReport("issue-update");
      serve([
        {
          method: "GET",
          url: ISSUE_SEARCH_URL,
          status: 200,
          body: '[{"number": 7}]',
        },
        { method: "PATCH", url: ISSUE_UPDATE_URL, status: 200, body: "{}" },
      ]);
      const run = await runIssue(report, {
        GITHUB_TOKEN: "test-token",
        GITHUB_REPOSITORY: "owner/repo",
      });
      assert.equal(run.status, 0);
      assert.ok(
        run.stdout.includes("comparison-check: updated issue #7"),
        `stdout: ${run.stdout}`,
      );
      const patches = requests.filter(
        (r) => r.method === "PATCH" && r.url === ISSUE_UPDATE_URL,
      );
      assert.equal(patches.length, 1);
      assert.deepEqual(JSON.parse(patches[0]?.body ?? ""), {
        body: readFileSync(report, "utf-8"),
      });
      assert.ok(
        requests.every((r) => r.method !== "POST"),
        JSON.stringify(requests),
      );
    },
  );

  it(
    "exits two without any HTTP request when GITHUB_TOKEN is unset",
    { timeout: 20_000 },
    async () => {
      const report = await writeDriftReport("issue-missing-token");
      serve([]);
      const run = await runIssue(report, {
        GITHUB_TOKEN: undefined,
        GITHUB_REPOSITORY: "owner/repo",
      });
      assert.equal(run.status, 2);
      assert.ok(
        run.stdout.includes(
          "comparison-check: GITHUB_TOKEN not set — required for --report-issue",
        ),
        `stdout: ${run.stdout}`,
      );
      assert.equal(requests.length, 0);
    },
  );
});

describe("comparison check: audit summary", () => {
  it(
    "lists every check with verdicts on a clean run",
    { timeout: 20_000 },
    async () => {
      serve(cleanRoutes());
      const readme = writeFixture("summary-clean.md", fixtureReadme());
      const summary = join(tempDir, "summary-clean.summary.md");
      const run = await runCheck(
        readme,
        reportPath("summary-clean.report.md"),
        {},
        registryBase(),
        summary,
      );
      assert.equal(run.status, 0, `stdout: ${run.stdout}`);
      assert.ok(
        run.stdout.endsWith("comparison-check: ok\n"),
        `stdout: ${run.stdout}`,
      );
      assert.ok(existsSync(summary), "the summary file was not written");
      const content = readFileSync(summary, "utf-8");
      assert.ok(
        content.startsWith("# comparison-check — run summary\n"),
        content,
      );
      assert.match(
        content,
        /^Checked at: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/m,
        "no Checked at UTC timestamp",
      );
      assert.ok(content.includes("Expectations as given:"), content);
      assert.ok(
        content.includes("- `EXPECT_PACKAGES`: opencode-plugin-openspec@0.1.4"),
        content,
      );
      assert.ok(
        content.includes("- `ABSENT_PACKAGES`: opencode-openspec"),
        content,
      );
      assert.ok(
        content.includes(
          "- `SINGLE_COMMIT_REPO`: AngDrew/opencode-openspec@2026-02-01",
        ),
        content,
      );
      for (const heading of [
        "## Registry checks",
        "## GitHub commits check",
        "## README presence",
        "## Link liveness",
      ]) {
        assert.ok(content.includes(heading), `missing heading: ${heading}`);
      }
      // Every per-item row: two registry, one commits, five presence,
      // three liveness — clean runs leave the full audit trail.
      assertSummaryRow(
        content,
        "opencode-plugin-openspec",
        "0.1.4",
        "0.1.4",
        "ok",
      );
      assertSummaryRow(
        content,
        "opencode-openspec",
        "404 (not published)",
        "404",
        "ok",
      );
      assertSummaryRow(
        content,
        "AngDrew/opencode-openspec",
        "1 commit, committer date 2026-02-01",
        "1 commit, 2026-02-01",
        "ok",
      );
      assertSummaryRow(
        content,
        "EXPECT_PACKAGES opencode-plugin-openspec@0.1.4",
        'one line containing "www.npmjs.com/package/opencode-plugin-openspec" and "v0.1.4"',
        "yes",
      );
      assertSummaryRow(
        content,
        "ABSENT_PACKAGES opencode-openspec",
        "Not published",
        "yes",
      );
      assertSummaryRow(
        content,
        "ABSENT_PACKAGES opencode-openspec",
        "registry.npmjs.org/opencode-openspec",
        "yes",
      );
      assertSummaryRow(
        content,
        "SINGLE_COMMIT_REPO AngDrew/opencode-openspec@2026-02-01",
        "single commit (2026-02-01",
        "yes",
      );
      assertSummaryRow(
        content,
        "SINGLE_COMMIT_REPO AngDrew/opencode-openspec@2026-02-01",
        "github.com/AngDrew/opencode-openspec",
        "yes",
      );
      assertSummaryRow(
        content,
        "https://www.npmjs.com/package/opencode-plugin-openspec",
        "200 (registry GET)",
        "alive",
      );
      assertSummaryRow(
        content,
        "https://registry.npmjs.org/opencode-openspec",
        "404 (registry GET)",
        "alive",
      );
      assertSummaryRow(content, `${registryBase()}/gh`, "200", "alive");
      assert.ok(
        content.includes(
          "Classification: clean — 11 checks, 0 drift, 0 unavailable",
        ),
        content,
      );
    },
  );

  it(
    "names the failing rows on a drift run while the report stays the only alarm",
    { timeout: 20_000 },
    async () => {
      serve(cleanRoutes());
      const readme = writeFixture(
        "summary-drift.md",
        fixtureReadme({ expect: ["opencode-plugin-openspec@9.9.9"] }),
      );
      const report = reportPath("summary-drift.report.md");
      const summary = join(tempDir, "summary-drift.summary.md");
      const run = await runCheck(
        readme,
        report,
        { EXPECT_PACKAGES: "opencode-plugin-openspec@9.9.9" },
        registryBase(),
        summary,
      );
      assert.equal(run.status, 1, `stdout: ${run.stdout}`);
      const content = readFileSync(summary, "utf-8");
      assertSummaryRow(
        content,
        "opencode-plugin-openspec",
        "9.9.9",
        "0.1.4",
        "drift",
      );
      assert.ok(
        content.includes(
          "Classification: drift — 11 checks, 1 drift, 0 unavailable",
        ),
        content,
      );
      // The outward alarm stays the --report issue body, unchanged by
      // the flag: the summary files nothing.
      const body = readFileSync(report, "utf-8");
      assert.ok(body.includes("Expectation / link"), body);
      assert.ok(
        body.includes("EXPECT_PACKAGES opencode-plugin-openspec"),
        body,
      );
      assert.ok(body.includes("9.9.9"), body);
      assert.ok(body.includes("0.1.4"), body);
      assert.ok(
        body.includes(`${registryBase()}/opencode-plugin-openspec`),
        body,
      );
      assert.ok(
        body.includes("update the README table and the workflow env lines"),
        body,
      );
    },
  );

  it(
    "still writes the audit summary on an unavailable run",
    { timeout: 20_000 },
    async () => {
      // Network branch: the registry seam at the closed port. The
      // npm-mapped liveness URLs share the failed GETs through the
      // registry cache, so both registry rows and two liveness rows
      // carry the fetch error.
      serve(cleanRoutes());
      const readmeNet = writeFixture("summary-unreachable.md", fixtureReadme());
      const summaryNet = join(tempDir, "summary-unreachable.summary.md");
      const runNet = await runCheck(
        readmeNet,
        reportPath("summary-unreachable.report.md"),
        {},
        `http://127.0.0.1:${closedPort}`,
        summaryNet,
      );
      assert.equal(runNet.status, 2, `stdout: ${runNet.stdout}`);
      assert.ok(existsSync(summaryNet), "the summary file was not written");
      const net = readFileSync(summaryNet, "utf-8");
      const fetchFailed = /fetch failed \(\w+\)/;
      assertSummaryRow(
        net,
        "opencode-plugin-openspec",
        "0.1.4",
        fetchFailed,
        "unavailable",
      );
      assertSummaryRow(
        net,
        "opencode-openspec",
        "404 (not published)",
        fetchFailed,
        "unavailable",
      );
      assertSummaryRow(
        net,
        "https://www.npmjs.com/package/opencode-plugin-openspec",
        fetchFailed,
        "unavailable",
      );
      assert.ok(
        net.includes(
          "Classification: unavailable — 11 checks, 0 drift, 4 unavailable",
        ),
        net,
      );

      // Env branch: the landed malformed-env fixture — the malformed
      // expectation shows as given, the commits table its
      // no-checks-ran line.
      serve(cleanRoutes());
      const readmeEnv = writeFixture(
        "summary-malformed.md",
        fixtureReadme({ expect: [], commit: null }),
      );
      const summaryEnv = join(tempDir, "summary-malformed.summary.md");
      const runEnv = await runCheck(
        readmeEnv,
        reportPath("summary-malformed.report.md"),
        {
          EXPECT_PACKAGES: "opencode-plugin-openspec",
          SINGLE_COMMIT_REPO: "",
        },
        registryBase(),
        summaryEnv,
      );
      assert.equal(runEnv.status, 2, `stdout: ${runEnv.stdout}`);
      assert.ok(existsSync(summaryEnv), "the summary file was not written");
      const envSummary = readFileSync(summaryEnv, "utf-8");
      assert.ok(
        envSummary.includes("- `EXPECT_PACKAGES`: opencode-plugin-openspec"),
        envSummary,
      );
      assert.ok(
        envSummary.includes("- `SINGLE_COMMIT_REPO`: (unset)"),
        envSummary,
      );
      assert.match(
        envSummary,
        /## GitHub commits check\n\n_No checks ran\._/,
        "no no-checks-ran line under the commits heading",
      );
      assert.ok(
        envSummary.includes(
          "Classification: unavailable — 4 checks, 0 drift, 2 unavailable",
        ),
        envSummary,
      );
    },
  );

  it(
    "writes the audit summary even when the README is unreadable",
    { timeout: 20_000 },
    async () => {
      serve(cleanRoutes());
      // The path is never written, so the run exits 2 before any
      // check ran — and the audit trail still covers that
      // classification: no rows, the read failure the one
      // unavailable.
      const readme = join(tempDir, "no-such-readme.md");
      const summary = join(tempDir, "summary-unreadable.summary.md");
      const run = await runCheck(
        readme,
        reportPath("summary-unreadable.report.md"),
        {},
        registryBase(),
        summary,
      );
      assert.equal(run.status, 2, `stdout: ${run.stdout}`);
      // The branch's own environment-failure line stays the stdout
      // contract — the summary write adds no output.
      assert.ok(
        run.stdout.includes(`comparison-check: cannot read ${readme}:`),
        `stdout: ${run.stdout}`,
      );
      assert.ok(existsSync(summary), "the summary file was not written");
      const content = readFileSync(summary, "utf-8");
      assert.ok(
        content.startsWith("# comparison-check — run summary\n"),
        content,
      );
      assert.match(
        content,
        /^Checked at: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/m,
        "no Checked at UTC timestamp",
      );
      assert.ok(content.includes("Expectations as given:"), content);
      for (const line of [
        "- `EXPECT_PACKAGES`: opencode-plugin-openspec@0.1.4",
        "- `ABSENT_PACKAGES`: opencode-openspec",
        "- `SINGLE_COMMIT_REPO`: AngDrew/opencode-openspec@2026-02-01",
      ]) {
        assert.ok(content.includes(line), `missing line: ${line}`);
      }
      for (const re of [
        /## Registry checks\n\n_No checks ran\._/,
        /## GitHub commits check\n\n_No checks ran\._/,
        /## README presence\n\n_No checks ran\._/,
        /## Link liveness\n\n_No checks ran\._/,
      ]) {
        assert.match(content, re, `no no-checks-ran line for ${re}`);
      }
      assert.ok(
        content.includes(
          "Classification: unavailable — 0 checks, 0 drift, 1 unavailable",
        ),
        content,
      );
    },
  );

  it(
    "never contains credentials even though the token was really used",
    { timeout: 20_000 },
    async () => {
      serve(cleanRoutes());
      const readme = writeFixture("summary-secrets.md", fixtureReadme());
      const summary = join(tempDir, "summary-secrets.summary.md");
      const run = await runCheck(
        readme,
        reportPath("summary-secrets.report.md"),
        {
          GITHUB_TOKEN: "s3cr3t-fake-token",
          GITHUB_REPOSITORY: "alexeyco/opencode-openspec",
        },
        registryBase(),
        summary,
      );
      assert.equal(run.status, 0, `stdout: ${run.stdout}`);
      // The token env was present during a real run: the fixture
      // served the commits GET and saw the Authorization header.
      const commitsCalls = requests.filter((r) => r.url === COMMITS_URL);
      assert.equal(commitsCalls.length, 1);
      assert.equal(
        commitsCalls[0]?.authorization,
        "Bearer s3cr3t-fake-token",
        "the commits GET did not carry the fake token",
      );
      const content = readFileSync(summary, "utf-8");
      assert.ok(!content.includes("s3cr3t-fake-token"), content);
      assert.ok(!content.includes("GITHUB_TOKEN"), content);
      assert.ok(!content.includes("GITHUB_REPOSITORY"), content);
      assert.ok(!content.includes("alexeyco/opencode-openspec"), content);
      for (const value of [BASE_EXPECT, BASE_ABSENT, BASE_COMMIT]) {
        assert.ok(content.includes(value), `missing value: ${value}`);
      }
    },
  );

  it(
    "writes nothing and changes nothing without the flag",
    { timeout: 20_000 },
    async () => {
      serve(cleanRoutes());
      const readme = writeFixture("summary-off.md", fixtureReadme());
      const summary = join(tempDir, "summary-off.summary.md");
      const run = await runCheck(readme, reportPath("summary-off.report.md"));
      assert.equal(run.status, 0);
      // Byte-identical to the landed clean case: the single ok line,
      // and no summary path anywhere.
      assert.equal(run.stdout, "comparison-check: ok\n");
      assert.ok(!existsSync(summary), "a summary file was written anyway");
    },
  );
});
