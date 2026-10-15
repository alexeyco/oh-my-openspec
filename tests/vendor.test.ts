// Tests for core/vendor.ts — manifest loading from fixtures.

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadVendorManifest, listVendoredSkillIds } from "../core/vendor.ts";

let tempDir: string;

before(() => {
  tempDir = mkdtempSync(join(tmpdir(), "o-opos-vendor-"));
});

after(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function makeVendor(dir: string, manifest: unknown, skillIds: string[]): void {
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest));
  for (const id of skillIds) {
    const skillDir = join(dir, "skills", id);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), "---\nname: x\n---\nbody\n");
  }
}

describe("loadVendorManifest", () => {
  it("accepts a complete manifest", () => {
    const dir = mkdtempSync(join(tempDir, "ok-"));
    makeVendor(
      dir,
      {
        package: "@fission-ai/openspec",
        version: "1.14.2",
        generatedBy: "1.14.2",
        skills: ["openspec-propose"],
      },
      ["openspec-propose"],
    );
    const m = loadVendorManifest(dir);
    assert.equal(m.version, "1.14.2");
    assert.deepEqual(m.skills, ["openspec-propose"]);
  });

  it("rejects missing or wrong-typed fields", () => {
    const dir = mkdtempSync(join(tempDir, "bad-"));
    assert.throws(
      () => loadVendorManifest(makePartial(dir, { version: "1" })),
      /missing string 'package'/,
    );
    assert.throws(
      () =>
        loadVendorManifest(
          makePartial(dir, {
            package: "p",
            version: "1",
            generatedBy: "1",
            skills: "nope",
          }),
        ),
      /array of strings/,
    );
  });

  function makePartial(dir: string, manifest: unknown): string {
    const sub = mkdtempSync(join(dir, "part-"));
    writeFileSync(join(sub, "manifest.json"), JSON.stringify(manifest));
    return sub;
  }
});

describe("listVendoredSkillIds", () => {
  it("returns sorted directories containing SKILL.md only", () => {
    const dir = mkdtempSync(join(tempDir, "list-"));
    makeVendor(dir, {}, ["openspec-b", "openspec-a"]);
    mkdirSync(join(dir, "skills", "openspec-empty"), { recursive: true });
    assert.deepEqual(listVendoredSkillIds(dir), ["openspec-a", "openspec-b"]);
  });
});
