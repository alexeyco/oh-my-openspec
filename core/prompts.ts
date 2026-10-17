// Command descriptions and instruction builders for /openspec.init,
// /openspec.plan, /openspec.apply, /openspec.archive, and /openspec.retro.
// Also contains the SUBAGENT_CONTRACT text injected into every role
// subagent session.

export const INIT_COMMAND_DESCRIPTION =
  "Bootstrap the project's baseline capability specs through research and critique";

export const PLAN_COMMAND_DESCRIPTION =
  "Draft an OpenSpec change through interview, research, and critique";

export const APPLY_COMMAND_DESCRIPTION =
  "Implement an OpenSpec change through parallel subagent waves";

export const ARCHIVE_COMMAND_DESCRIPTION =
  "Archive completed OpenSpec changes through the vendored archive workflows";

export const RETRO_COMMAND_DESCRIPTION =
  "Retrospect the finished run: ≤8 cited findings on the plugin's own prompts";

export const SUBAGENT_CONTRACT = [
  "You are an OpenSpec flow subagent. Your final message is a report",
  "consumed by the orchestrator, not chat: findings first, then evidence",
  "(exact paths, commands, key output lines). The OpenSpec artifacts under",
  "openspec/ are the contract — quote them into your work, change them only",
  "where your role prompt explicitly says so, and never silently rewrite",
  "them. You never run git write commands (add, commit, push, stash,",
  "checkout, switch, reset, restore, clean) — version control belongs to",
  "the user. Never mutate the working tree or refs; compare against",
  "committed state with `git show`/`git diff`. Treat Guardrails quoted in",
  "your task prompt",
  "as hard constraints; if the task cannot be done without violating one,",
  "stop and report `BLOCKED: <reason>`. Label anything you could not verify",
  "as UNVERIFIED — never guess. Do exactly the scoped work; no drive-by",
  "refactors.",
  "Write every report in English, regardless of the session's reply language.",
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

// Pick the skill id for /openspec.archive from the whitespace-split ids.
// 0 or 1 ids bind the single-archive skill; only 2+ bind the bulk one.
export function archiveSkillId(argText: string): string {
  const ids = argText.trim().split(/\s+/).filter(Boolean);

  return ids.length >= 2
    ? "openspec-bulk-archive-change"
    : "openspec-archive-change";
}

// Build the instruction text for /openspec.archive.
// When no ids are given, the skill lists active changes and confirms first.
// The third line is the validation gate and is always present.
export function archiveInstruction(
  argText: string,
  skillPath?: string,
): string {
  const ids = argText.trim().split(/\s+/).filter(Boolean);
  const parts: string[] = [];

  if (skillPath) {
    parts.push(`Read the skill file ${skillPath} and follow it exactly.`);
  } else {
    parts.push(
      `Load the ${archiveSkillId(argText)} skill and follow it exactly.`,
    );
  }

  if (ids.length === 0) {
    parts.push(
      "No change ids given — list active changes, confirm with the user which to archive.",
    );
  } else if (ids.length === 1) {
    parts.push(`Change: ${ids[0]}`);
  } else {
    parts.push(`Changes: ${ids.join(", ")}`);
  }

  parts.push(
    "Validate first with the openspec_validate tool; stop on INVALID unless the user explicitly overrides.",
  );

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
