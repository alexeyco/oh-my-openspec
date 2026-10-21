// Integration guard: verifies the real repo assets (agents/*.md, flow
// skills, vendored OpenSpec skills) satisfy the invariants the OpenCode
// adapter relies on.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { loadRoles, ROLE_IDS } from "../core/roles.ts";
import {
  parseMarkdown,
  validateRoleDoc,
  validateSkillDoc,
  vendoredGeneratedBy,
} from "../core/markdown.ts";
import {
  VENDOR_ROOT,
  listVendoredSkillIds,
  loadVendorManifest,
} from "../core/vendor.ts";
import { archiveInstruction } from "../core/prompts.ts";

const repoRoot = path.join(import.meta.dirname, "..");
const agentsDir = path.join(repoRoot, "agents");
const skillsRoot = path.join(repoRoot, "skills");
const vendorDir = path.join(repoRoot, VENDOR_ROOT);
const FLOW_SKILL_IDS = ["omos-init", "omos-plan", "omos-apply", "omos-retro"];

describe("roles assets", () => {
  it("agents/ contains exactly the ROLE_IDS", () => {
    const roles = loadRoles(agentsDir);
    assert.deepEqual(
      roles.map((r) => r.id),
      [...ROLE_IDS].sort(),
    );
  });

  it("every role has mode=subagent, description, and a non-empty body", () => {
    for (const role of loadRoles(agentsDir)) {
      assert.equal(role.mode, "subagent", `role ${role.id}`);
      assert.ok(role.description.length > 0, `role ${role.id} description`);
      assert.ok(role.body.trim().length > 0, `role ${role.id} body`);
    }
  });
});

describe("flow skills", () => {
  it("each flow skill parses and name equals directory name", () => {
    for (const id of FLOW_SKILL_IDS) {
      const raw = readFileSync(path.join(skillsRoot, id, "SKILL.md"), "utf8");
      const { frontmatter, body } = parseMarkdown<unknown>(raw);
      const doc = validateSkillDoc(frontmatter);
      assert.equal(doc.name, id, `skill ${id}: name must equal directory`);
      assert.ok(body.trim().length > 0, `skill ${id}: body must be non-empty`);
    }
  });

  it("flow skill bodies reference the roles and tools they dispatch", () => {
    const init = readFileSync(
      path.join(skillsRoot, "omos-init", "SKILL.md"),
      "utf8",
    );
    for (const ref of [
      "omos-researcher",
      "omos-planner",
      "omos-critic",
      "openspec_validate",
    ]) {
      assert.ok(init.includes(ref), `omos-init must reference ${ref}`);
    }
    const plan = readFileSync(
      path.join(skillsRoot, "omos-plan", "SKILL.md"),
      "utf8",
    );
    for (const ref of [
      "omos-researcher",
      "omos-planner",
      "omos-critic",
      "openspec_validate",
    ]) {
      assert.ok(plan.includes(ref), `omos-plan must reference ${ref}`);
    }
    const apply = readFileSync(
      path.join(skillsRoot, "omos-apply", "SKILL.md"),
      "utf8",
    );
    for (const ref of [
      "omos-planner",
      "omos-implementer",
      "omos-verifier",
      "omos-reviewer",
      "openspec_validate",
    ]) {
      assert.ok(apply.includes(ref), `omos-apply must reference ${ref}`);
    }
    assert.ok(
      apply.includes("archive with `/omos.archive <change-id>`"),
      "shared apply skill offers its host-neutral archive command",
    );
    const archiveContract = archiveInstruction("change-id");
    for (const behavior of [
      "Sync the selected change's specification deltas into the main specs before archiving; do not ask whether to sync.",
      "If required specification sync is blocked, stop without archiving and report the blocker.",
      "After archiving, validate the resulting specifications. Repair issues that are safely fixable within OpenSpec artifacts, then validate again.",
      "If a post-archive issue requires code changes or cannot be safely repaired within OpenSpec artifacts, stop and report it without claiming validation passed.",
    ]) {
      assert.ok(
        archiveContract.includes(behavior),
        `archive contract: ${behavior}`,
      );
    }
    const retro = readFileSync(
      path.join(skillsRoot, "omos-retro", "SKILL.md"),
      "utf8",
    );
    assert.ok(
      retro.includes("omos-retrospector"),
      "omos-retro must reference omos-retrospector",
    );
  });
});

describe("vendored OpenSpec skills", () => {
  const manifest = loadVendorManifest(vendorDir);

  it("manifest lists exactly the skill directories on disk", () => {
    const ids = listVendoredSkillIds(vendorDir);
    assert.deepEqual(ids, [...manifest.skills].sort());
    assert.ok(ids.length >= 12, "all upstream workflows vendored");
  });

  it("every vendored skill parses, name equals directory, version matches manifest", () => {
    for (const id of manifest.skills) {
      const file = path.join(vendorDir, "skills", id, "SKILL.md");
      assert.ok(existsSync(file), `missing ${file}`);
      const { frontmatter } = parseMarkdown<unknown>(
        readFileSync(file, "utf8"),
      );
      const doc = validateSkillDoc(frontmatter);
      assert.equal(doc.name, id, `vendored ${id}: name must equal directory`);
      assert.equal(
        vendoredGeneratedBy(frontmatter),
        manifest.generatedBy,
        `vendored ${id}: generatedBy must match manifest version`,
      );
    }
  });

  it("vendored ids never collide with flow skill or role ids", () => {
    const flow = new Set([...FLOW_SKILL_IDS, ...ROLE_IDS]);
    for (const id of manifest.skills) {
      assert.ok(!flow.has(id), `collision: ${id}`);
    }
  });
});
