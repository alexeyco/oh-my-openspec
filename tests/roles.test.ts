// Tests for core/roles.ts — loadRoles with fixture files in a tmpdir.

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadRoles, ROLE_IDS } from "../core/roles.ts";

let tempDir: string;

before(() => {
  tempDir = mkdtempSync(join(tmpdir(), "o-omos-roles-"));
});

after(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function writeRole(
  dir: string,
  filename: string,
  frontmatter: string,
  body = "Role body content",
): void {
  writeFileSync(
    join(dir, filename),
    `---\n${frontmatter}\n---\n${body}\n`,
    "utf-8",
  );
}

describe("loadRoles", () => {
  it("loads fixtures keyed by filename, sorted by id", () => {
    const dir = mkdtempSync(join(tempDir, "ok-"));
    writeRole(dir, "omos-verifier.md", 'description: "V"\nmode: subagent');
    writeRole(dir, "omos-researcher.md", 'description: "R"\nmode: subagent');
    writeFileSync(join(dir, "notes.txt"), "not a role", "utf-8");

    const roles = loadRoles(dir);
    assert.equal(roles.length, 2);
    assert.equal(roles[0]!.id, "omos-researcher");
    assert.equal(roles[1]!.id, "omos-verifier");
    assert.equal(roles[1]!.body.trim(), "Role body content");
  });

  it("fails loudly on a broken frontmatter", () => {
    const dir = mkdtempSync(join(tempDir, "bad-"));
    writeRole(dir, "omos-critic.md", "description: 42\nmode: subagent");
    assert.throws(() => loadRoles(dir), /missing string 'description'/);
  });

  it("rejects model pins", () => {
    const dir = mkdtempSync(join(tempDir, "pin-"));
    writeRole(
      dir,
      "omos-planner.md",
      'description: "P"\nmode: subagent\nmodel: openai/gpt',
    );
    assert.throws(() => loadRoles(dir), /inherit the session model/);
  });

  it("the repo's agents/ directory matches ROLE_IDS exactly", () => {
    const repoRoles = loadRoles(join(import.meta.dirname, "..", "agents"));
    const ids = repoRoles.map((r) => r.id).sort();
    assert.deepEqual(ids, [...ROLE_IDS].sort());
  });
});
