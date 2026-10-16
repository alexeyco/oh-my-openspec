// OpenCode v2 plugin entry: registers 7 subagent roles from bundled markdown,
// 16 skills (4 flow skills + 12 vendored OpenSpec workflow skills), five
// commands (/openspec.init, /openspec.plan, /openspec.apply,
// /openspec.archive, /openspec.retro), and the openspec_validate tool
// (mechanical gate wrapping the upstream CLI).
// Injects SUBAGENT_CONTRACT into every role's session context.

import { readFileSync } from "node:fs";
import * as path from "node:path";
import { Agent, Plugin, Skill } from "@opencode/plugin";
import { parseMarkdown, validateSkillDoc } from "../core/markdown.ts";
import { loadRoles, ROLE_IDS } from "../core/roles.ts";
import {
  ARCHIVE_COMMAND_DESCRIPTION,
  APPLY_COMMAND_DESCRIPTION,
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
import { validateProject } from "../core/openspec.ts";
import {
  VENDOR_ROOT,
  listVendoredSkillIds,
  loadVendorManifest,
} from "../core/vendor.ts";
import { forceBackgroundEvent } from "./background.ts";

const agentsDir = path.join(import.meta.dirname, "..", "agents");
const skillsRoot = path.join(import.meta.dirname, "..", "skills");
const vendorDir = path.join(import.meta.dirname, "..", VENDOR_ROOT);

// Flow skills authored in this repo; vendored skills are discovered from
// vendor/openspec/manifest.json so upstream workflow additions need no code
// change. Names here must match skills/<id>/SKILL.md frontmatter name.
const FLOW_SKILL_IDS = [
  "openspec-init",
  "openspec-plan",
  "openspec-apply",
  "openspec-retro",
] as const;

function readText(file: string): string {
  return readFileSync(file, "utf8");
}

export default Plugin.define({
  id: "opencode-openspec",
  async setup(ctx) {
    // cwd for CLI operations: prefer the plugin location, fall back to process cwd.
    const cwd = ctx.location?.directory ?? process.cwd();

    // ── Agents ──────────────────────────────────────────────────────────
    // Load the 7 role definitions from agents/*.md and register each as a
    // subagent. Behavior is bounded by role prompt + injected
    // SUBAGENT_CONTRACT + the OpenSpec artifacts themselves.
    const roles = loadRoles(agentsDir);

    await ctx.agent.transform((editor) => {
      for (const role of roles) {
        editor.update(role.id, (agent) => {
          agent.name = Agent.Name.make(role.id);
          agent.description = role.description;
          agent.mode = role.mode as typeof agent.mode;
          agent.system = role.body.trim();
        });
      }
    });

    // ── Skills ──────────────────────────────────────────────────────────
    // Flow skills from skills/<id>/SKILL.md, then the vendored OpenSpec
    // workflow skills from vendor/openspec/skills/<id>/SKILL.md. Vendored
    // ids match what `openspec init --tools opencode` writes into a
    // project — when both exist, the host resolves one of them; the plugin
    // is the always-on source, `openspec init` is not required.
    const manifest = loadVendorManifest(vendorDir);
    const vendoredIds = listVendoredSkillIds(vendorDir);
    if (
      vendoredIds.length !== manifest.skills.length ||
      vendoredIds.some((id, i) => id !== manifest.skills[i])
    ) {
      throw new Error(
        "opencode-openspec: vendor/openspec tree does not match its manifest — run `make sync`",
      );
    }

    await ctx.skill.transform((editor) => {
      const skillEntries = [
        ...FLOW_SKILL_IDS.map((id) => ({
          id,
          file: path.join(skillsRoot, id, "SKILL.md"),
        })),
        ...vendoredIds.map((id) => ({
          id,
          file: path.join(vendorDir, "skills", id, "SKILL.md"),
        })),
      ];
      for (const { id, file } of skillEntries) {
        const skillRaw = readText(file);
        const { frontmatter: skillFm, body: skillBody } =
          parseMarkdown<unknown>(skillRaw);
        const skillDoc = validateSkillDoc(skillFm);
        editor.add(
          Skill.Info.make({
            id: Skill.ID.make(id),
            name: Skill.Name.make(skillDoc.name),
            description: skillDoc.description,
            path: file as Skill.Info["path"],
            content: skillBody,
          }),
        );
      }
    });

    await ctx.skill.reload();

    // ── Contract body injection ────────────────────────────────────────
    // Push SUBAGENT_CONTRACT into the system prompt of every role subagent
    // so they share the same behavioral contract without per-file copies.
    const roleIds = new Set<string>(ROLE_IDS);
    ctx.session.hook("context", (event) => {
      if (roleIds.has(String(event.agent))) {
        event.system.push({
          type: "text",
          text: SUBAGENT_CONTRACT,
        });
      }
    });

    // Force background dispatch for subagent calls that target a role, so
    // the orchestrator can run roles concurrently in waves.
    ctx.tool.hook("execute.before", (event) => {
      event.input = forceBackgroundEvent(event.tool, event.input, roleIds);
    });

    // ── Commands ────────────────────────────────────────────────────────
    // /openspec.init [focus] — bootstrap baseline capability specs from
    // what the code actually does.
    // /openspec.plan <idea> — interview, research, draft the OpenSpec
    // change artifacts, critic loop, mechanical validate gate.
    // /openspec.apply [change-id] — implement tasks.md through
    // dependency-ordered parallel subagent waves with verification.
    // /openspec.archive [change-id ...] — archive completed changes through
    // the vendored archive workflows: zero or one change id binds
    // openspec-archive-change, two or more bind openspec-bulk-archive-change.
    // /openspec.retro — retrospect the finished run: evidence bundle →
    // openspec-retrospector → ≤8 cited findings on the plugin's own prompts.
    // None of the commands ever touches git.
    await ctx.command.transform((editor) => {
      editor.add({
        name: "openspec.init",
        description: INIT_COMMAND_DESCRIPTION,
        execute: async ({ sessionID, prompt }) => {
          await ctx.session.prompt({
            sessionID: sessionID as never,
            text: initInstruction(prompt?.text ?? ""),
            skills: [{ id: Skill.ID.make("openspec-init") }],
          } as never);
        },
      });
      editor.add({
        name: "openspec.plan",
        description: PLAN_COMMAND_DESCRIPTION,
        execute: async ({ sessionID, prompt }) => {
          await ctx.session.prompt({
            sessionID: sessionID as never,
            text: planInstruction(prompt?.text ?? ""),
            skills: [{ id: Skill.ID.make("openspec-plan") }],
          } as never);
        },
      });
      editor.add({
        name: "openspec.apply",
        description: APPLY_COMMAND_DESCRIPTION,
        execute: async ({ sessionID, prompt }) => {
          await ctx.session.prompt({
            sessionID: sessionID as never,
            text: applyInstruction(prompt?.text ?? ""),
            skills: [{ id: Skill.ID.make("openspec-apply") }],
          } as never);
        },
      });
      editor.add({
        name: "openspec.archive",
        description: ARCHIVE_COMMAND_DESCRIPTION,
        execute: async ({ sessionID, prompt }) => {
          await ctx.session.prompt({
            sessionID: sessionID as never,
            text: archiveInstruction(prompt?.text ?? ""),
            skills: [{ id: Skill.ID.make(archiveSkillId(prompt?.text ?? "")) }],
          } as never);
        },
      });
      editor.add({
        name: "openspec.retro",
        description: RETRO_COMMAND_DESCRIPTION,
        execute: async ({ sessionID }) => {
          await ctx.session.prompt({
            sessionID: sessionID as never,
            text: retroInstruction(),
            skills: [{ id: Skill.ID.make("openspec-retro") }],
          } as never);
        },
      });
    });

    await ctx.command.reload();

    // ── Validation tool ─────────────────────────────────────────────────
    // openspec_validate — mechanical contract gate for change/spec artifacts,
    // delegating to the upstream CLI so this plugin never re-implements the
    // rules. "The contract is mechanical, not prompt-hoped."
    await ctx.tool.transform((editor) => {
      editor.add({
        name: "openspec_validate",
        description: [
          "Validate OpenSpec artifacts by running the openspec CLI.",
          "Returns VALID ... / INVALID ...: with numbered issues, or",
          "UNAVAILABLE with an install offer when the CLI is missing.",
          "Without a change id, validates every change and spec in the project.",
        ].join(" "),
        input: {
          type: "object",
          properties: {
            change: {
              type: "string",
              description:
                "Change id to validate (default: validate all changes and specs)",
            },
          },
        } as never,
        execute: async (input: { change?: string }) => {
          const report = await validateProject(
            cwd,
            input.change?.trim() || undefined,
          );
          return { content: report } as never;
        },
      } as never);
    });

    await ctx.tool.reload();
  },
});
