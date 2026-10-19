// Tests for core/openspec.ts — validation report parsing/formatting and the
// CLI gate against a stub binary on PATH.

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  formatValidation,
  parseValidation,
  runOpenspec,
  validateProject,
  type ValidationItem,
} from "../core/openspec.ts";

const VALID_JSON = JSON.stringify({
  items: [{ id: "add-dark-mode", type: "change", valid: true, issues: [] }],
  summary: { totals: { items: 1, passed: 1, failed: 0 } },
});

const INVALID_JSON = JSON.stringify({
  items: [
    {
      id: "add-dark-mode",
      type: "change",
      valid: false,
      issues: [
        {
          level: "ERROR",
          path: "file",
          message: "Change must have at least one delta.",
        },
      ],
    },
  ],
  summary: { totals: { items: 1, passed: 0, failed: 1 } },
});

describe("parseValidation", () => {
  it("reads a passing report", () => {
    const { items, failed } = parseValidation(VALID_JSON);
    assert.equal(items.length, 1);
    assert.equal(items[0]!.valid, true);
    assert.equal(failed, 0);
  });

  it("reads a failing report with issues", () => {
    const { items, failed } = parseValidation(INVALID_JSON);
    assert.equal(failed, 1);
    assert.equal(
      items[0]!.issues[0]!.message,
      "Change must have at least one delta.",
    );
  });

  it("returns failed=-1 on unparseable output", () => {
    const { items, failed } = parseValidation("not json");
    assert.equal(items.length, 0);
    assert.equal(failed, -1);
  });

  it("falls back to counting when summary is absent", () => {
    const { failed } = parseValidation(
      JSON.stringify({
        items: [{ id: "x", type: "change", valid: false, issues: [] }],
      }),
    );
    assert.equal(failed, 1);
  });
});

describe("formatValidation", () => {
  it("reports VALID", () => {
    const { items, failed } = parseValidation(VALID_JSON);
    assert.match(formatValidation(items, failed), /^VALID: 1 item\(s\) passed/);
  });

  it("numbers violations in INVALID reports", () => {
    const { items, failed } = parseValidation(INVALID_JSON);
    const report = formatValidation(items, failed);
    assert.match(report, /^INVALID: 1 of 1 item\(s\) failed/);
    assert.match(
      report,
      /1\. \[change add-dark-mode\] ERROR file: Change must have at least one delta\./,
    );
  });

  it("flags invalid items without issue details", () => {
    const item: ValidationItem = {
      id: "x",
      type: "spec",
      valid: false,
      issues: [],
    };
    assert.match(formatValidation([item], 1), /invalid without details/);
  });

  it("treats an empty project as valid nothing", () => {
    assert.match(formatValidation([], 0), /nothing to validate/);
  });
});

describe("validateProject with a stub CLI", () => {
  let bin: string;
  let proj: string;
  let savedPath: string | undefined;

  before(() => {
    bin = mkdtempSync(join(tmpdir(), "o-omos-bin-"));
    proj = mkdtempSync(join(tmpdir(), "o-omos-proj-"));
    savedPath = process.env.PATH;
  });

  after(() => {
    process.env.PATH = savedPath;
    rmSync(bin, { recursive: true, force: true });
    rmSync(proj, { recursive: true, force: true });
  });

  function stubOpenspec(stdout: string, code: number): void {
    const script = join(bin, "openspec");
    writeFileSync(
      script,
      `#!/bin/sh\nprintf '%s' '${stdout.replace(/'/g, "'\\''")}'\nexit ${code}\n`,
    );
    chmodSync(script, 0o755);
    process.env.PATH = `${bin}:${savedPath}`;
  }

  it("VALID report from exit-0 CLI", async () => {
    stubOpenspec(VALID_JSON, 0);
    const report = await validateProject(proj);
    assert.match(report, /^VALID: 1 item\(s\) passed/);
  });

  it("INVALID report when CLI exits non-zero", async () => {
    stubOpenspec(INVALID_JSON, 1);
    const report = await validateProject(proj, "add-dark-mode");
    assert.match(report, /^INVALID/);
  });

  it("surfaces CLI errors verbatim when no report is parseable", async () => {
    stubOpenspec("", 3);
    const report = await validateProject(proj, "no-such-change");
    assert.match(
      report,
      /^ERROR: openspec validate no-such-change --json failed/,
    );
  });

  it("UNAVAILABLE with install hint when the CLI is missing", async () => {
    process.env.PATH = bin; // empty bin dir, no openspec anywhere
    rmSync(join(bin, "openspec"), { force: true });
    const report = await validateProject(proj);
    assert.match(report, /^UNAVAILABLE: openspec CLI not found/);
    assert.match(report, /npm install -g @fission-ai\/openspec/);
  });

  it("runOpenspec marks missing binary", async () => {
    process.env.PATH = bin;
    const result = await runOpenspec(proj, ["--version"]);
    assert.equal(result.missing, true);
    assert.match(result.stderr, /not found in PATH/);
  });
});
