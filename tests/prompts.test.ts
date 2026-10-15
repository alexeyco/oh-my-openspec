// Tests for core/prompts.ts — command instruction builders.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  APPLY_COMMAND_DESCRIPTION,
  INIT_COMMAND_DESCRIPTION,
  PLAN_COMMAND_DESCRIPTION,
  RETRO_COMMAND_DESCRIPTION,
  SUBAGENT_CONTRACT,
  applyInstruction,
  initInstruction,
  planInstruction,
  retroInstruction,
} from "../core/prompts.ts";

describe("initInstruction", () => {
  it("names the skill and passes focus areas", () => {
    const text = initInstruction("http client, storage");
    assert.match(text, /openspec-init/);
    assert.match(text, /Focus areas: http client, storage/);
  });

  it("falls back to codebase discovery", () => {
    assert.match(initInstruction("  "), /discover candidate capabilities/);
  });
});

describe("planInstruction", () => {
  it("names the skill and echoes the request", () => {
    const text = planInstruction("add dark mode");
    assert.match(text, /openspec-plan/);
    assert.match(text, /User request: add dark mode/);
  });

  it("asks to elicit an empty request", () => {
    assert.match(planInstruction("   "), /elicit it/);
  });

  it("prefers an explicit skill path", () => {
    const text = planInstruction("x", "/abs/SKILL.md");
    assert.match(text, /Read the skill file \/abs\/SKILL\.md/);
    assert.doesNotMatch(text, /Load the openspec-plan/);
  });
});

describe("applyInstruction", () => {
  it("passes a change id through", () => {
    const text = applyInstruction("add-dark-mode");
    assert.match(text, /openspec-apply/);
    assert.match(text, /Change: add-dark-mode/);
  });

  it("falls back to selection from active changes", () => {
    assert.match(applyInstruction(""), /list active changes/);
  });
});

describe("retroInstruction", () => {
  it("names the skill and the bundle step", () => {
    const text = retroInstruction();
    assert.match(text, /openspec-retro/);
    assert.match(text, /evidence bundle/);
  });

  it("prefers an explicit skill path", () => {
    const text = retroInstruction("/abs/SKILL.md");
    assert.match(text, /Read the skill file \/abs\/SKILL\.md/);
    assert.doesNotMatch(text, /Load the openspec-retro/);
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
      RETRO_COMMAND_DESCRIPTION,
    ]) {
      assert.ok(d.length > 10 && !d.includes("\n"));
    }
  });
});
