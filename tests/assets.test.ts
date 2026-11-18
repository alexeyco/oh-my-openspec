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
const FLOW_SKILL_IDS = [
  "omos-init",
  "omos-plan",
  "omos-quick",
  "omos-apply",
  "omos-retro",
];

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
    const quick = readFileSync(
      path.join(skillsRoot, "omos-quick", "SKILL.md"),
      "utf8",
    );
    for (const ref of [
      "omos-researcher",
      "omos-planner",
      "omos-critic",
      "openspec_validate",
      "one plan confirmation",
      "full project check suite",
      "/omos.archive <change-id>",
    ]) {
      assert.ok(quick.includes(ref), `omos-quick must reference ${ref}`);
    }
    const quickContracts = [
      [
        "eligible only for one behavior",
        "The request changes exactly one externally observable behavior in one\n  capability.",
      ],
      [
        "eligible request uses a short interview",
        "Keep this to one concise interview round.",
      ],
      [
        "eligible request uses focused research",
        "Research only the relevant capability and conventions.",
      ],
      [
        "eligible request skips the adversarial grill",
        "Do not run the multi-area research or adversarial grill",
      ],
      [
        "eligible request gets critic review and VALID before confirmation",
        "Dispatch `omos-critic`",
      ],
      [
        "eligible request is confirmed before project-code edits",
        "Ask for one\nconfirmation before editing project code.",
      ],
      [
        "declining the plan stops before project-code edits",
        "If the user declines, stop before project-code edits.",
      ],
      [
        "declining reports the change id and options",
        "Report the OpenSpec\nchange id and ask whether they want to revise the plan or stop.",
      ],
      [
        "confirmation applies approved tasks and verifies each scenario",
        "After confirmation, implement the approved tasks in this same run",
      ],
      [
        "confirmed apply runs full checks and reviews the cumulative diff",
        "run the full project check suite once after the final wave, and review\n  the cumulative diff",
      ],
      [
        "confirmed apply does not archive, commit, or push",
        "Never commit, push, or archive.",
      ],
      [
        "quick completion recommends archive separately",
        "Offer the host's archive command as a separate next\nstep",
      ],
      [
        "invalid validation blocks project-code edits",
        "If it is not `VALID`, do not edit project\ncode",
      ],
      [
        "invalid validation follows plan recovery and revalidation",
        "send the exact findings to the planner and revalidate after each\nrevision",
      ],
      [
        "broad and excluded requests use ordinary plan and apply gates",
        "If any condition is false or unclear, use the ordinary plan and apply gates",
      ],
      [
        "ordinary fallback retains full research and adversarial grill",
        "full coverage\ninterview, research, adversarial grill, confirmed playback",
      ],
    ] as const;
    const normalizedQuick = quick.replace(/\s+/g, " ");
    for (const [scenario, contract] of quickContracts) {
      assert.ok(
        normalizedQuick.includes(contract.replace(/\s+/g, " ")),
        `omos-quick must preserve ${scenario}: ${contract}`,
      );
    }
    for (const behavior of [
      "### 9. Mechanical validation and recovery",
      "After the critique path is complete and before approval, call",
      "`INVALID` → dispatch `omos-planner` with the exact numbered findings",
      "After each planner revision, run `openspec_validate`",
      "show the exact remaining findings and offer the user another",
      "This mechanical correction step does not consume the critique loop's",
      "report that mechanical validation could not run",
    ]) {
      assert.ok(
        plan.includes(behavior),
        `omos-plan must specify post-critique validation and recovery: ${behavior}`,
      );
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
    const generatedArchiveSkill = readFileSync(
      path.join(
        repoRoot,
        "plugins/oh-my-openspec/skills/omos-archive/SKILL.md",
      ),
      "utf8",
    );
    for (const behavior of [
      "Before syncing or archiving, review document-level title headings in every selected change artifact and each main specification affected by its deltas, plus Requirement headings in those specifications. Correct TBD placeholders and technical machine-name titles only when a readable title is clearly supported by the artifact content; preserve readable authored main-spec titles. If a title is ambiguous, ask the user to choose and wait before continuing.",
      "Keep MODIFIED requirement headings verbatim to the baseline merge key; express any requirement rename with exact FROM:/TO: entries under RENAMED Requirements. Do not inspect or edit historical archived changes or their specifications.",
      "Sync the selected change's specification deltas into the main specs before archiving; do not ask whether to sync.",
      "If required specification sync is blocked, stop without archiving and report the blocker.",
      "After archiving, validate the resulting specifications. Repair issues that are safely fixable within OpenSpec artifacts, then validate again.",
      "If validation remains INVALID or an issue cannot be safely repaired within OpenSpec artifacts, show the exact findings and proactively offer the user help resolving them. Stop without claiming validation passed.",
    ]) {
      assert.ok(
        archiveContract.includes(behavior),
        `archive contract: ${behavior}`,
      );
      assert.ok(
        generatedArchiveSkill.includes(behavior),
        `generated Codex archive skill carries shared guidance: ${behavior}`,
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

  it("every vendored skill parses and name equals directory", () => {
    for (const id of manifest.skills) {
      const file = path.join(vendorDir, "skills", id, "SKILL.md");
      assert.ok(existsSync(file), `missing ${file}`);
      const { frontmatter } = parseMarkdown<unknown>(
        readFileSync(file, "utf8"),
      );
      const doc = validateSkillDoc(frontmatter);
      assert.equal(doc.name, id, `vendored ${id}: name must equal directory`);
    }
  });

  it("vendored ids never collide with flow skill or role ids", () => {
    const flow = new Set([...FLOW_SKILL_IDS, ...ROLE_IDS]);
    for (const id of manifest.skills) {
      assert.ok(!flow.has(id), `collision: ${id}`);
    }
  });
});
