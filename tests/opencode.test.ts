// Integration tests for OpenCode command and flow-skill registration.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import {
  QUICK_COMMAND_DESCRIPTION,
  quickInstruction,
} from "../core/prompts.ts";
import { parseMarkdown, validateSkillDoc } from "../core/markdown.ts";
import plugin from "../opencode/index.ts";

const repoRoot = path.join(import.meta.dirname, "..");

describe("OpenCode quick command", () => {
  it("registers the command and binds one prompt to the quick skill", async () => {
    const commands = new Map<string, any>();
    const skills: any[] = [];
    const prompts: any[] = [];
    const setup = (
      plugin as unknown as { setup(context: unknown): Promise<void> }
    ).setup;

    await setup({
      location: { directory: repoRoot },
      agent: {
        transform: async (transform: (editor: any) => void) =>
          transform({
            update: (_id: string, update: (agent: any) => void) => update({}),
          }),
      },
      skill: {
        transform: async (transform: (editor: any) => void) =>
          transform({ add: (skill: unknown) => skills.push(skill) }),
        reload: async () => {},
      },
      session: {
        hook: () => {},
        prompt: async (prompt: unknown) => prompts.push(prompt),
      },
      tool: {
        hook: () => {},
        transform: async (transform: (editor: any) => void) =>
          transform({ add: () => {} }),
        reload: async () => {},
      },
      command: {
        transform: async (transform: (editor: any) => void) =>
          transform({
            add: (command: any) => commands.set(command.name, command),
          }),
        reload: async () => {},
      },
    });

    assert.deepEqual([...commands.keys()].sort(), [
      "omos.apply",
      "omos.archive",
      "omos.init",
      "omos.plan",
      "omos.quick",
      "omos.retro",
    ]);
    const quickSkill = skills.find(
      (skill) => String(skill.id) === "omos-quick",
    );
    assert.ok(quickSkill);
    const quickSkillSource = readFileSync(
      path.join(repoRoot, "skills/omos-quick/SKILL.md"),
      "utf8",
    );
    const { frontmatter, body } = parseMarkdown<unknown>(quickSkillSource);
    const quickSkillDoc = validateSkillDoc(frontmatter);
    assert.equal(String(quickSkill.name), quickSkillDoc.name);
    assert.equal(quickSkill.description, quickSkillDoc.description);
    assert.equal(quickSkill.content, body);

    const quick = commands.get("omos.quick");
    assert.equal(quick.description, QUICK_COMMAND_DESCRIPTION);
    assert.match(quick.description, /one behavior in one capability/);

    await quick.execute({
      sessionID: "session-1",
      prompt: { text: "add a small export option" },
    });

    assert.equal(prompts.length, 1);
    assert.deepEqual(prompts[0], {
      sessionID: "session-1",
      text: quickInstruction("add a small export option"),
      skills: [{ id: "omos-quick" }],
    });

    await quick.execute({ sessionID: "session-2", prompt: { text: "  " } });

    assert.equal(prompts.length, 2);
    assert.equal(prompts[1].sessionID, "session-2");
    assert.equal(prompts[1].text, quickInstruction(""));
    assert.deepEqual(prompts[1].skills, [{ id: "omos-quick" }]);
  });
});
