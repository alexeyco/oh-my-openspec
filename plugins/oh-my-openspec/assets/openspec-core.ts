// Thin wrapper around the openspec CLI (expected in PATH, as in any
// OpenSpec-initialized project). Host-agnostic: only Node builtins, so both
// unit tests and the plugin entry can rely on it.

import { spawn } from "node:child_process";

export interface CliResult {
  readonly ok: boolean;
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
  /** True when the `openspec` binary could not be launched (not installed). */
  readonly missing: boolean;
}

export async function runOpenspec(
  cwd: string,
  args: string[],
): Promise<CliResult> {
  return new Promise((resolvePromise) => {
    const child = spawn("openspec", args, { cwd });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (err: NodeJS.ErrnoException) => {
      resolvePromise({
        ok: false,
        code: null,
        stdout: "",
        stderr:
          err.code === "ENOENT"
            ? "openspec CLI not found in PATH — the flow will offer to install it (npm install -g @fission-ai/openspec, or brew install openspec)"
            : String(err),
        missing: err.code === "ENOENT",
      });
    });
    child.on("close", (code) => {
      resolvePromise({ ok: code === 0, code, stdout, stderr, missing: false });
    });
  });
}

export interface ValidationIssue {
  readonly level: string;
  readonly path: string;
  readonly message: string;
}

export interface ValidationItem {
  readonly id: string;
  readonly type: string;
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

// `openspec validate ... --json` shape:
// { items: [{ id, type, valid, issues: [{ level, path, message }] }],
//   summary: { totals: { items, passed, failed } }, ... }
export function parseValidation(stdout: string): {
  items: ValidationItem[];
  failed: number;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return { items: [], failed: -1 };
  }
  if (!parsed || typeof parsed !== "object") {
    return { items: [], failed: -1 };
  }
  const raw = parsed as Record<string, unknown>;
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const items: ValidationItem[] = [];
  for (const entry of itemsRaw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string" || typeof e.valid !== "boolean") continue;
    const issues: ValidationIssue[] = [];
    if (Array.isArray(e.issues)) {
      for (const issue of e.issues) {
        if (!issue || typeof issue !== "object") continue;
        const i = issue as Record<string, unknown>;
        issues.push({
          level: typeof i.level === "string" ? i.level : "ERROR",
          path: typeof i.path === "string" ? i.path : "file",
          message: typeof i.message === "string" ? i.message : "",
        });
      }
    }
    items.push({
      id: e.id,
      type: typeof e.type === "string" ? e.type : "unknown",
      valid: e.valid,
      issues,
    });
  }
  const summary =
    raw.summary && typeof raw.summary === "object"
      ? (raw.summary as Record<string, unknown>).totals
      : undefined;
  const failed =
    summary &&
    typeof summary === "object" &&
    typeof (summary as Record<string, unknown>).failed === "number"
      ? ((summary as Record<string, unknown>).failed as number)
      : items.filter((item) => !item.valid).length;
  return { items, failed };
}

// Human/agent-readable one-look report, mirroring the mechanical-gate style:
// VALID N item(s) passed / INVALID N item(s) failed, numbered violations.
export function formatValidation(
  items: ValidationItem[],
  failed: number,
): string {
  if (failed === -1) {
    return "INVALID: could not parse openspec validate output";
  }
  if (items.length === 0) {
    return "VALID: nothing to validate (no changes or specs found)";
  }
  const invalid = items.filter((item) => !item.valid);
  const head =
    invalid.length === 0
      ? `VALID: ${items.length} item(s) passed`
      : `INVALID: ${invalid.length} of ${items.length} item(s) failed`;
  const lines: string[] = [head];
  let n = 0;
  for (const item of invalid) {
    for (const issue of item.issues) {
      n += 1;
      lines.push(
        `${n}. [${item.type} ${item.id}] ${issue.level} ${issue.path}: ${issue.message}`,
      );
    }
    if (item.issues.length === 0 && !item.valid) {
      n += 1;
      lines.push(`${n}. [${item.type} ${item.id}] invalid without details`);
    }
  }
  return lines.join("\n");
}

// Full validation gate: run the CLI, then format. `changeId` narrows the
// check to one change; otherwise all changes and specs in the project.
export async function validateProject(
  cwd: string,
  changeId?: string,
): Promise<string> {
  const args = changeId
    ? ["validate", changeId, "--json"]
    : ["validate", "--all", "--json"];
  const result = await runOpenspec(cwd, args);
  if (result.missing) {
    return `UNAVAILABLE: ${result.stderr}`;
  }
  // `openspec validate` exits non-zero when items fail; the JSON report is
  // still authoritative. Other failures (bad id, no project) have no parseable
  // report and must surface verbatim.
  const { items, failed } = parseValidation(result.stdout);
  if (items.length === 0 && failed === -1) {
    const detail = (result.stderr || result.stdout).trim();
    return `ERROR: openspec ${args.join(" ")} failed: ${detail || `exit ${result.code}`}`;
  }
  return formatValidation(items, failed);
}
