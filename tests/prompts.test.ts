// Tests for core/prompts.ts — command instruction builders.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  APPLY_COMMAND_DESCRIPTION,
  ARCHIVE_COMMAND_DESCRIPTION,
  INIT_COMMAND_DESCRIPTION,
  PLAN_COMMAND_DESCRIPTION,
  RETRO_COMMAND_DESCRIPTION,
  SUBAGENT_CONTRACT,
  applyInstruction,
  archiveInstruction,
  archiveSkillId,
  initInstruction,
  planInstruction,
  retroInstruction,
} from "../core/prompts.ts";

describe("initInstruction", () => {
  it("names the skill and passes focus areas", () => {
    const text = initInstruction("http client, storage");
    assert.match(text, /omos-init/);
    assert.match(text, /Focus areas: http client, storage/);
  });

  it("falls back to codebase discovery", () => {
    assert.match(initInstruction("  "), /discover candidate capabilities/);
  });
});

describe("planInstruction", () => {
  it("names the skill and echoes the request", () => {
    const text = planInstruction("add dark mode");
    assert.match(text, /omos-plan/);
    assert.match(text, /User request: add dark mode/);
  });

  it("asks to elicit an empty request", () => {
    assert.match(planInstruction("   "), /elicit it/);
  });

  it("prefers an explicit skill path", () => {
    const text = planInstruction("x", "/abs/SKILL.md");
    assert.match(text, /Read the skill file \/abs\/SKILL\.md/);
    assert.doesNotMatch(text, /Load the omos-plan/);
  });
});

describe("applyInstruction", () => {
  it("passes a change id through", () => {
    const text = applyInstruction("add-dark-mode");
    assert.match(text, /omos-apply/);
    assert.match(text, /Change: add-dark-mode/);
  });

  it("falls back to selection from active changes", () => {
    assert.match(applyInstruction(""), /list active changes/);
  });
});

const GATE_LINE =
  "Validate first with the openspec_validate tool; stop on INVALID unless the user explicitly overrides.";
const ARCHIVE_STEPS = [
  "Use the delegated archive skill for its other checks. These plugin-mandated steps override any conflicting upstream sync or archive choices: do not ask whether to sync, and stop before archiving if required sync is blocked.",
  "Sync the selected change's specification deltas into the main specs before archiving; do not ask whether to sync.",
  "When sync creates a new openspec/specs/<capability>/spec.md, give it a readable top-level title derived from the capability's purpose or meaning. Preserve existing authored titles and machine-named capability paths.",
  "If required specification sync is blocked, stop without archiving and report the blocker.",
  "After archiving, validate the resulting specifications. Repair issues that are safely fixable within OpenSpec artifacts, then validate again.",
  "If a post-archive issue requires code changes or cannot be safely repaired within OpenSpec artifacts, stop and report it without claiming validation passed.",
];

describe("archiveInstruction", () => {
  it("pins the single-id output", () => {
    assert.equal(
      archiveInstruction("add-dark-mode"),
      [
        "Load the openspec-archive-change skill and follow it exactly.",
        "Change: add-dark-mode",
        GATE_LINE,
        ...ARCHIVE_STEPS,
      ].join("\n"),
    );
  });

  it("pins the bulk output", () => {
    assert.equal(
      archiveInstruction("add-a add-b"),
      [
        "Load the openspec-bulk-archive-change skill and follow it exactly.",
        "Changes: add-a, add-b",
        GATE_LINE,
        ...ARCHIVE_STEPS,
      ].join("\n"),
    );
  });

  it("trims and collapses ids, preserving order", () => {
    const text = archiveInstruction("  add-b   add-a  ");
    assert.equal(
      text.split("\n")[1],
      "Changes: add-b, add-a",
      "no stray spacing around commas",
    );
  });

  it("pins the empty fallback with no Change:/Changes: line", () => {
    const text = archiveInstruction("   ");
    assert.equal(
      text,
      [
        "Load the openspec-archive-change skill and follow it exactly.",
        "No change ids given — list active changes, confirm with the user which to archive.",
        GATE_LINE,
        ...ARCHIVE_STEPS,
      ].join("\n"),
    );
    assert.doesNotMatch(text, /^Change(s)?:/m);
  });

  it("keeps the initial gate, mandatory sync, blocker, repair and stop steps in every form", () => {
    for (const argText of ["add-dark-mode", "add-a add-b add-c", ""]) {
      const lines = archiveInstruction(argText).split("\n");
      assert.equal(lines[2], GATE_LINE, `initial gate for: ${argText}`);
      assert.deepEqual(
        lines.slice(3),
        ARCHIVE_STEPS,
        `archive steps: ${argText}`,
      );
    }
  });

  it("prefers an explicit skill path", () => {
    const text = archiveInstruction("add-dark-mode", "/abs/SKILL.md");
    assert.equal(
      text.split("\n")[0],
      "Read the skill file /abs/SKILL.md and follow it exactly.",
    );
    assert.doesNotMatch(text, /Load the openspec-archive-change/);
  });
});

describe("archiveSkillId", () => {
  it("binds the single skill for zero or one id", () => {
    for (const argText of ["", "  ", "add-dark-mode"]) {
      assert.equal(
        archiveSkillId(argText),
        "openspec-archive-change",
        `argText: ${JSON.stringify(argText)}`,
      );
    }
  });

  it("binds the bulk skill for two or more ids", () => {
    for (const argText of [
      "add-a add-b",
      "add-a add-b add-c",
      "  add-a   add-b  ",
      "  add-a  add-b   add-c ",
    ]) {
      assert.equal(
        archiveSkillId(argText),
        "openspec-bulk-archive-change",
        `argText: ${JSON.stringify(argText)}`,
      );
    }
  });
});

describe("retroInstruction", () => {
  it("names the skill and the bundle step", () => {
    const text = retroInstruction();
    assert.match(text, /omos-retro/);
    assert.match(text, /evidence bundle/);
  });

  it("prefers an explicit skill path", () => {
    const text = retroInstruction("/abs/SKILL.md");
    assert.match(text, /Read the skill file \/abs\/SKILL\.md/);
    assert.doesNotMatch(text, /Load the omos-retro/);
  });
});

describe("SUBAGENT_CONTRACT", () => {
  it("keeps git writes and artifacts bounded", () => {
    assert.match(SUBAGENT_CONTRACT, /never run git write commands/);
    assert.match(SUBAGENT_CONTRACT, /openspec\//);
    assert.match(SUBAGENT_CONTRACT, /UNVERIFIED/);
    assert.match(SUBAGENT_CONTRACT, /BLOCKED: <reason>/);
  });
});

describe("command descriptions", () => {
  it("are single sentences fit for the command palette", () => {
    for (const d of [
      INIT_COMMAND_DESCRIPTION,
      PLAN_COMMAND_DESCRIPTION,
      APPLY_COMMAND_DESCRIPTION,
      ARCHIVE_COMMAND_DESCRIPTION,
      RETRO_COMMAND_DESCRIPTION,
    ]) {
      assert.ok(d.length > 10 && !d.includes("\n"));
    }
  });
});
