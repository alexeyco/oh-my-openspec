// Tests for codex/install-agents.mjs — the pure per-file install plan and
// the CLI contract from specs/codex-host-integration: "Existing user
// agent files are never clobbered" and "Reinstall after plugin upgrade
// updates managed files".

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  hasManagedMarker,
  meetsNodeFloor,
  planAgentInstalls,
} from "../codex/install-agents.mjs";

const scriptPath = join(
  import.meta.dirname,
  "..",
  "codex",
  "install-agents.mjs",
);

let tempRoot: string;

before(() => {
  tempRoot = mkdtempSync(join(tmpdir(), "o-omos-codex-install-"));
});

after(() => {
  rmSync(tempRoot, { recursive: true, force: true });
});

function makeDir(name: string): string {
  const dir = join(tempRoot, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeFiles(dir: string, files: Record<string, string>): void {
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content);
  }
}

interface CliRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runInstaller(args: string[]): CliRun {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

const PLANNER_SOURCE = 'name = "omos-planner"\ndescription = """Plan."""\n';
const PLANNER_USER = 'name = "omos-planner"\ndescription = """User."""\n';
const CRITIC_SOURCE = 'name = "omos-critic"\ndescription = """Critic."""\n';

// Managed-file fixtures: a fresh render carries the current plugin
// version's marker; a target previously installed by this installer (or
// an older plugin version) carries the same or an older marker with a
// stale body.
const MARKER_PREFIX = "# managed-by: oh-my-openspec@";
const PLANNER_RENDERED = `${MARKER_PREFIX}2.0.0\nname = "omos-planner"\ndescription = """Plan."""\n`;
const PLANNER_MANAGED_CURRENT = `${MARKER_PREFIX}2.0.0\nname = "omos-planner"\ndescription = """Stale edit."""\n`;
const PLANNER_MANAGED_OLDER = `${MARKER_PREFIX}1.0.0\nname = "omos-planner"\ndescription = """Old."""\n`;
const CRITIC_RENDERED = `${MARKER_PREFIX}2.0.0\nname = "omos-critic"\ndescription = """Critic."""\n`;
const CRITIC_MANAGED_CURRENT = `${MARKER_PREFIX}2.0.0\nname = "omos-critic"\ndescription = """Stale critic."""\n`;
const CRITIC_MANAGED_OLDER = `${MARKER_PREFIX}1.0.0\nname = "omos-critic"\ndescription = """Old critic."""\n`;
const VERIFIER_RENDERED = `${MARKER_PREFIX}2.0.0\nname = "omos-verifier"\ndescription = """Verifier."""\n`;

describe("planAgentInstalls", () => {
  it("plans a copy for every absent target (fresh)", () => {
    const source = makeDir("plan-fresh-src");
    const target = makeDir("plan-fresh-target");
    writeFiles(source, {
      "omos-planner.toml": PLANNER_SOURCE,
      "omos-critic.toml": CRITIC_SOURCE,
    });
    const result = planAgentInstalls(source, target);
    assert.deepEqual(
      result.plans.map((p) => [p.file, p.action]),
      [
        ["omos-critic.toml", "copy"],
        ["omos-planner.toml", "copy"],
      ],
    );
    assert.equal(result.status, 0);
  });

  it("plans a skip for a byte-identical target", () => {
    const source = makeDir("plan-skip-src");
    const target = makeDir("plan-skip-target");
    writeFiles(source, { "omos-critic.toml": CRITIC_SOURCE });
    writeFiles(target, { "omos-critic.toml": CRITIC_SOURCE });
    const result = planAgentInstalls(source, target);
    assert.equal(result.plans[0]!.action, "skip");
    assert.equal(result.status, 0);
  });

  it("plans a conflict for a differing target and reports non-zero status", () => {
    const source = makeDir("plan-conflict-src");
    const target = makeDir("plan-conflict-target");
    writeFiles(source, { "omos-planner.toml": PLANNER_SOURCE });
    writeFiles(target, { "omos-planner.toml": PLANNER_USER });
    const result = planAgentInstalls(source, target);
    assert.equal(result.plans[0]!.action, "conflict");
    assert.equal(result.status, 1);
  });

  it("turns the differing unmanaged target into an overwrite copy with force", () => {
    const source = makeDir("plan-force-src");
    const target = makeDir("plan-force-target");
    writeFiles(source, { "omos-planner.toml": PLANNER_SOURCE });
    writeFiles(target, { "omos-planner.toml": PLANNER_USER });
    const result = planAgentInstalls(source, target, { force: true });
    assert.equal(result.plans[0]!.action, "copy");
    assert.equal(result.status, 0);
  });

  it("plans an update for a differing managed target with the current marker version", () => {
    const source = makeDir("plan-update-current-src");
    const target = makeDir("plan-update-current-target");
    writeFiles(source, { "omos-planner.toml": PLANNER_RENDERED });
    writeFiles(target, { "omos-planner.toml": PLANNER_MANAGED_CURRENT });
    const result = planAgentInstalls(source, target);
    assert.equal(result.plans[0]!.action, "update");
    assert.equal(result.status, 0);
  });

  it("plans an update for a differing managed target with an older marker version", () => {
    const source = makeDir("plan-update-older-src");
    const target = makeDir("plan-update-older-target");
    writeFiles(source, { "omos-planner.toml": PLANNER_RENDERED });
    writeFiles(target, { "omos-planner.toml": PLANNER_MANAGED_OLDER });
    const result = planAgentInstalls(source, target);
    assert.equal(result.plans[0]!.action, "update");
    assert.equal(result.status, 0);
  });

  it("treats a marker outside the first line as unmanaged (conflict)", () => {
    const source = makeDir("plan-marker-line-src");
    const target = makeDir("plan-marker-line-target");
    writeFiles(source, { "omos-planner.toml": PLANNER_RENDERED });
    writeFiles(target, {
      "omos-planner.toml": `name = "omos-planner"\n${MARKER_PREFIX}1.0.0\ndescription = """User."""\n`,
    });
    const result = planAgentInstalls(source, target);
    assert.equal(result.plans[0]!.action, "conflict");
    assert.equal(result.status, 1);
  });

  it("still plans update for a differing managed target when force is set", () => {
    const source = makeDir("plan-update-force-src");
    const target = makeDir("plan-update-force-target");
    writeFiles(source, { "omos-planner.toml": PLANNER_RENDERED });
    writeFiles(target, { "omos-planner.toml": PLANNER_MANAGED_OLDER });
    const result = planAgentInstalls(source, target, { force: true });
    assert.equal(result.plans[0]!.action, "update");
    assert.equal(result.status, 0);
  });

  it("plans per file: update for the managed target, conflict for the unmanaged one", () => {
    const source = makeDir("plan-mixed-src");
    const target = makeDir("plan-mixed-target");
    writeFiles(source, {
      "omos-planner.toml": PLANNER_RENDERED,
      "omos-critic.toml": CRITIC_RENDERED,
    });
    writeFiles(target, {
      "omos-planner.toml": PLANNER_USER,
      "omos-critic.toml": CRITIC_MANAGED_OLDER,
    });
    const result = planAgentInstalls(source, target);
    assert.deepEqual(
      result.plans.map((p) => [p.file, p.action]),
      [
        ["omos-critic.toml", "update"],
        ["omos-planner.toml", "conflict"],
      ],
    );
    assert.equal(result.status, 1);
  });

  it("plans updates for differing managed targets and skips identical ones (reinstall after upgrade)", () => {
    const source = makeDir("plan-upgrade-src");
    const target = makeDir("plan-upgrade-target");
    writeFiles(source, {
      "omos-planner.toml": PLANNER_RENDERED,
      "omos-critic.toml": CRITIC_RENDERED,
      "omos-verifier.toml": VERIFIER_RENDERED,
    });
    writeFiles(target, {
      "omos-planner.toml": PLANNER_MANAGED_OLDER,
      "omos-critic.toml": CRITIC_MANAGED_CURRENT,
      "omos-verifier.toml": VERIFIER_RENDERED,
    });
    const result = planAgentInstalls(source, target);
    assert.deepEqual(
      result.plans.map((p) => [p.file, p.action]),
      [
        ["omos-critic.toml", "update"],
        ["omos-planner.toml", "update"],
        ["omos-verifier.toml", "skip"],
      ],
    );
    assert.equal(result.status, 0);
  });

  it("ignores non-TOML files in the source directory", () => {
    const source = makeDir("plan-filter-src");
    const target = makeDir("plan-filter-target");
    writeFiles(source, {
      "omos-planner.toml": PLANNER_SOURCE,
      "README.md": "not an agent",
    });
    const result = planAgentInstalls(source, target);
    assert.deepEqual(
      result.plans.map((p) => p.file),
      ["omos-planner.toml"],
    );
  });
});

describe("hasManagedMarker", () => {
  it("accepts any marker version on the first line", () => {
    assert.equal(hasManagedMarker(`${MARKER_PREFIX}2.0.0\nname = "x"\n`), true);
    assert.equal(hasManagedMarker(`${MARKER_PREFIX}0.0.1\nname = "x"\n`), true);
    assert.equal(hasManagedMarker(`${MARKER_PREFIX}2.0.0\r\nname = "x"`), true);
    assert.equal(hasManagedMarker(`${MARKER_PREFIX}2.0.0`), true);
  });

  it("rejects content whose first line lacks the marker", () => {
    assert.equal(
      hasManagedMarker(`name = "x"\n${MARKER_PREFIX}1.0.0\n`),
      false,
      "the marker must be on the first line",
    );
    assert.equal(hasManagedMarker('name = "x"\n'), false);
    assert.equal(
      hasManagedMarker("# managed-by: someone-else@1.0.0\n"),
      false,
      "foreign markers are not ours",
    );
    assert.equal(hasManagedMarker(""), false);
  });
});

describe("meetsNodeFloor", () => {
  it("accepts the floor, newer minors, and newer majors", () => {
    assert.equal(meetsNodeFloor("v22.18.0"), true);
    assert.equal(meetsNodeFloor("v22.18"), true);
    assert.equal(meetsNodeFloor("v22.19.1"), true);
    assert.equal(meetsNodeFloor("v23.0.0"), true);
    assert.equal(meetsNodeFloor(process.version), true);
  });

  it("rejects versions below v22.18", () => {
    assert.equal(meetsNodeFloor("v22.17.9"), false);
    assert.equal(meetsNodeFloor("v20.1.0"), false);
  });
});

describe("install-agents CLI", () => {
  it("copies fresh files byte-for-byte, creating the target, and prints the next steps", () => {
    const source = makeDir("cli-fresh-src");
    writeFiles(source, {
      "omos-planner.toml": PLANNER_SOURCE,
      "omos-critic.toml": CRITIC_SOURCE,
    });
    const target = join(tempRoot, "cli-fresh-target"); // deliberately absent
    const run = runInstaller(["--source", source, "--target", target]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(
      readFileSync(join(target, "omos-planner.toml"), "utf8"),
      PLANNER_SOURCE,
    );
    assert.equal(
      readFileSync(join(target, "omos-critic.toml"), "utf8"),
      CRITIC_SOURCE,
    );
    assert.match(run.stdout, /Copied 2 agent file\(s\)/);
    assert.match(run.stdout, /Skipped 0 identical file\(s\)/);
    assert.match(run.stdout, /Updated 0 managed file\(s\)/);
    assert.doesNotMatch(run.stdout, /hook/i);
    assert.match(run.stdout, /MCP server/);
    assert.match(run.stdout, /[Rr]estart/);
  });

  it("reports an all-skip second run (idempotent)", () => {
    const source = makeDir("cli-idem-src");
    writeFiles(source, { "omos-critic.toml": CRITIC_SOURCE });
    const target = makeDir("cli-idem-target");
    const first = runInstaller(["--source", source, "--target", target]);
    assert.equal(first.status, 0, first.stderr);
    const second = runInstaller(["--source", source, "--target", target]);
    assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /Copied 0 agent file\(s\)/);
    assert.match(second.stdout, /Skipped 1 identical file\(s\)/);
    assert.match(second.stdout, /Updated 0 managed file\(s\)/);
  });

  it("refuses a differing unmanaged target per file, skips the identical one, and exits 1", () => {
    const source = makeDir("cli-refuse-src");
    const target = makeDir("cli-refuse-target");
    writeFiles(source, {
      "omos-planner.toml": PLANNER_SOURCE,
      "omos-critic.toml": CRITIC_SOURCE,
    });
    writeFiles(target, {
      "omos-planner.toml": PLANNER_USER,
      "omos-critic.toml": CRITIC_SOURCE,
    });
    const run = runInstaller(["--source", source, "--target", target]);
    assert.equal(run.status, 1);
    assert.equal(
      readFileSync(join(target, "omos-planner.toml"), "utf8"),
      PLANNER_USER,
      "the differing user file must not be clobbered",
    );
    assert.match(run.stdout, /Refused 1 conflicting file\(s\)/);
    assert.match(run.stdout, /omos-planner\.toml/);
    assert.match(run.stdout, /Copied 0 agent file\(s\)/);
    assert.match(run.stdout, /Skipped 1 identical file\(s\)/);
    assert.match(run.stdout, /Updated 0 managed file\(s\)/);
  });

  it("overwrites the differing unmanaged target with --force", () => {
    const source = makeDir("cli-force-src");
    const target = makeDir("cli-force-target");
    writeFiles(source, {
      "omos-planner.toml": PLANNER_SOURCE,
      "omos-critic.toml": CRITIC_SOURCE,
    });
    writeFiles(target, {
      "omos-planner.toml": PLANNER_USER,
      "omos-critic.toml": CRITIC_SOURCE,
    });
    const run = runInstaller([
      "--source",
      source,
      "--target",
      target,
      "--force",
    ]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(
      readFileSync(join(target, "omos-planner.toml"), "utf8"),
      PLANNER_SOURCE,
      "--force must overwrite the differing target",
    );
    assert.match(run.stdout, /Copied 1 agent file\(s\)/);
    assert.match(run.stdout, /Skipped 1 identical file\(s\)/);
  });

  it("updates differing managed targets without --force (reinstall after upgrade)", () => {
    const source = makeDir("cli-update-src");
    const target = makeDir("cli-update-target");
    writeFiles(source, {
      "omos-planner.toml": PLANNER_RENDERED,
      "omos-critic.toml": CRITIC_RENDERED,
    });
    writeFiles(target, {
      "omos-planner.toml": PLANNER_MANAGED_OLDER,
      "omos-critic.toml": CRITIC_RENDERED,
    });
    const run = runInstaller(["--source", source, "--target", target]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(
      readFileSync(join(target, "omos-planner.toml"), "utf8"),
      PLANNER_RENDERED,
      "the differing managed file must be refreshed to the fresh render",
    );
    assert.equal(
      readFileSync(join(target, "omos-critic.toml"), "utf8"),
      CRITIC_RENDERED,
      "the identical file must stay untouched",
    );
    assert.match(run.stdout, /Copied 0 agent file\(s\)/);
    assert.match(run.stdout, /Skipped 1 identical file\(s\)/);
    assert.match(run.stdout, /Updated 1 managed file\(s\)/);
    assert.match(run.stdout, /omos-planner\.toml/);
    assert.doesNotMatch(run.stdout, /Refused/);
    assert.doesNotMatch(run.stdout, /--force/);
  });

  it("updates the managed file while refusing the unmanaged one in the same run", () => {
    const source = makeDir("cli-mixed-src");
    const target = makeDir("cli-mixed-target");
    writeFiles(source, {
      "omos-planner.toml": PLANNER_RENDERED,
      "omos-critic.toml": CRITIC_RENDERED,
    });
    writeFiles(target, {
      "omos-planner.toml": PLANNER_USER,
      "omos-critic.toml": CRITIC_MANAGED_OLDER,
    });
    const run = runInstaller(["--source", source, "--target", target]);
    assert.equal(run.status, 1);
    assert.equal(
      readFileSync(join(target, "omos-planner.toml"), "utf8"),
      PLANNER_USER,
      "the unmanaged user file must not be clobbered",
    );
    assert.equal(
      readFileSync(join(target, "omos-critic.toml"), "utf8"),
      CRITIC_RENDERED,
      "the managed file must be updated even though another file conflicts",
    );
    assert.match(run.stdout, /Refused 1 conflicting file\(s\)/);
    assert.match(run.stdout, /Updated 1 managed file\(s\)/);
  });

  it("fails with a usage error when the source directory is missing", () => {
    const target = makeDir("cli-nosource-target");
    const run = runInstaller([
      "--source",
      join(tempRoot, "does-not-exist"),
      "--target",
      target,
    ]);
    assert.equal(run.status, 2);
    assert.match(run.stderr, /source directory not found/);
  });

  it("defaults the source to ./agents next to the script", () => {
    const target = makeDir("cli-default-target");
    const run = runInstaller(["--target", target]);
    const defaultSource = join(import.meta.dirname, "..", "codex", "agents");
    assert.equal(run.status, 2);
    assert.ok(
      run.stderr.includes(defaultSource),
      `stderr must name the default source ${defaultSource}`,
    );
  });
});
