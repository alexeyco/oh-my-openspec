// Command descriptions and instruction builders for /openspec.init,
// /openspec.plan, /openspec.apply, and /openspec.retro. Also contains the
// SUBAGENT_CONTRACT text injected into every role subagent session.

export const INIT_COMMAND_DESCRIPTION =
  "Bootstrap the project's baseline capability specs through research and critique";

export const PLAN_COMMAND_DESCRIPTION =
  "Draft an OpenSpec change through interview, research, and critique";

export const APPLY_COMMAND_DESCRIPTION =
  "Implement an OpenSpec change through parallel subagent waves";

export const RETRO_COMMAND_DESCRIPTION =
  "Retrospect the finished run: ≤8 cited findings on the plugin's own prompts";

export const SUBAGENT_CONTRACT = [
  "You are an OpenSpec flow subagent. Your final message is a report",
  "consumed by the orchestrator, not chat: findings first, then evidence",
  "(exact paths, commands, key output lines). The OpenSpec artifacts under",
  "openspec/ are the contract — quote them into your work, change them only",
  "where your role prompt explicitly says so, and never silently rewrite",
  "them. You never run git write commands (add, commit, push) — version",
  "control belongs to the user. Treat Guardrails quoted in your task prompt",
  "as hard constraints; if the task cannot be done without violating one,",
  "stop and report `BLOCKED: <reason>`. Label anything you could not verify",
  "as UNVERIFIED — never guess. Do exactly the scoped work; no drive-by",
  "refactors.",
].join("\n");

// Build the instruction text for /openspec.init.
// When focus is empty, the skill discovers capabilities from the codebase.
export function initInstruction(focus: string, skillPath?: string): string {
  const parts: string[] = [];

  if (skillPath) {
    parts.push(`Read the skill file ${skillPath} and follow it exactly.`);
  } else {
    parts.push("Load the openspec-init skill and follow it exactly.");
  }

  if (focus.trim()) {
    parts.push(`Focus areas: ${focus.trim()}`);
  } else {
    parts.push(
      "No focus given — discover candidate capabilities from the code itself.",
    );
  }

  return parts.join("\n");
}

// Build the instruction text for /openspec.retro.
// It analyzes the current session; no arguments are taken.
export function retroInstruction(skillPath?: string): string {
  if (skillPath) {
    return `Read the skill file ${skillPath} and follow it exactly.\nCompile the evidence bundle from this session and dispatch the retrospector.`;
  }
  return "Load the openspec-retro skill and follow it exactly.\nCompile the evidence bundle from this session and dispatch the retrospector.";
}

// Build the instruction text for /openspec.plan.
// When request is empty, tells the agent to elicit it first.
export function planInstruction(request: string, skillPath?: string): string {
  const parts: string[] = [];

  if (skillPath) {
    parts.push(`Read the skill file ${skillPath} and follow it exactly.`);
  } else {
    parts.push("Load the openspec-plan skill and follow it exactly.");
  }

  if (!request.trim()) {
    parts.push(
      "The user gave no request text — your first job is to elicit it.",
    );
  } else {
    parts.push(`User request: ${request}`);
  }

  return parts.join("\n");
}

// Build the instruction text for /openspec.apply.
// When changeId is empty, the skill selects from active changes and confirms.
export function applyInstruction(changeId: string, skillPath?: string): string {
  const parts: string[] = [];

  if (skillPath) {
    parts.push(`Read the skill file ${skillPath} and follow it exactly.`);
  } else {
    parts.push("Load the openspec-apply skill and follow it exactly.");
  }

  if (changeId.trim()) {
    parts.push(`Change: ${changeId.trim()}`);
  } else {
    parts.push(
      "No change id given — list active changes, pick or confirm one before dispatch.",
    );
  }

  return parts.join("\n");
}
