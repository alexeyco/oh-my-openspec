#!/usr/bin/env node
// Installs the oh-my-openspec role TOMLs into ~/.codex/agents.
//
// Plain Node on purpose (no TypeScript): this file ships verbatim inside
// the Codex plugin bundle as assets/install-agents.mjs, where the TOMLs
// sit in an `agents/` directory next to the script, and also runs
// directly from a checkout with explicit --source. It never writes
// ~/.codex/config.toml — `codex plugin add` owns the plugin enablement
// state — and never overwrites a differing user file without --force:
// a differing target whose first line carries the
// `# managed-by: oh-my-openspec@` marker is a file this installer (or an
// older plugin version) created, so it is refreshed silently as an
// update — re-running after a plugin upgrade converges without a
// conflict dialog, while files we did not create stay untouched.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// The bundled MCP server (assets/mcp-server.mjs) imports core/*.ts and
// relies on Node's type stripping for .ts imports, which needs v22.18.
const NODE_FLOOR_MAJOR = 22;
const NODE_FLOOR_MINOR = 18;

const USAGE = `Usage: node install-agents.mjs [--source <dir>] [--target <dir>] [--force]

Copies the oh-my-openspec role TOMLs into the Codex agents directory.
Defaults: --source ./agents next to this script, --target ~/.codex/agents
(created if missing). Byte-identical targets are skipped. A differing
target whose first line carries the '# managed-by: oh-my-openspec@'
marker is our own managed file (current or older version) and is updated
silently. Any other differing target is refused per file (exit 1) unless
--force overwrites it.`;

// A target whose first line starts with this prefix is managed by
// oh-my-openspec — created by this installer at the current or any
// earlier version. The version after "@" is not compared: any managed
// marker makes the file machine-owned (user edits to managed files are
// overwritten by the next update run — the supported customization path
// is a differently-named agent file).
const MANAGED_MARKER = "# managed-by: oh-my-openspec@";

/**
 * True when the first line of `content` carries the
 * `# managed-by: oh-my-openspec@` marker (any version). Pure so marker
 * detection itself can be unit-tested.
 */
export function hasManagedMarker(content) {
  const newline = content.indexOf("\n");
  const firstLine = newline === -1 ? content : content.slice(0, newline);
  return firstLine.startsWith(MANAGED_MARKER);
}

/**
 * True when a `process.version`-style string meets the v22.18 floor.
 * Pure so the threshold itself can be unit-tested.
 */
export function meetsNodeFloor(version) {
  const match = /^v(\d+)\.(\d+)/.exec(version);
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return (
    major > NODE_FLOOR_MAJOR ||
    (major === NODE_FLOOR_MAJOR && minor >= NODE_FLOOR_MINOR)
  );
}

function filesAreByteIdentical(sourcePath, targetPath) {
  if (statSync(sourcePath).size !== statSync(targetPath).size) return false;
  return readFileSync(sourcePath).equals(readFileSync(targetPath));
}

/**
 * Pure install plan: reads the target for comparison only and never
 * writes anything, so it is unit-testable without a home directory.
 * One entry per `.toml` file in sourceDir, sorted by file name:
 * - "copy": target absent, or differs without our marker while `force`
 *   is set (overwrite)
 * - "skip": target is byte-identical
 * - "update": target differs and its first line carries our
 *   `# managed-by: oh-my-openspec@` marker — a file we created at the
 *   current or an older version, replaced silently and reported as an
 *   update (this is how a reinstall after a plugin upgrade converges)
 * - "conflict": target differs without the marker and `force` is not
 *   set (refused)
 * `status` is the exit code the plan implies for the CLI: 1 when any
 * file is refused, 0 otherwise — updates never fail the run.
 */
export function planAgentInstalls(sourceDir, targetDir, options = {}) {
  const force = options.force === true;
  const files = readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".toml"))
    .map((entry) => entry.name)
    .sort();
  const plans = files.map((file) => {
    const targetPath = join(targetDir, file);
    if (!existsSync(targetPath)) {
      return { file, action: "copy", reason: "target does not exist" };
    }
    if (filesAreByteIdentical(join(sourceDir, file), targetPath)) {
      return { file, action: "skip", reason: "target is byte-identical" };
    }
    if (hasManagedMarker(readFileSync(targetPath, "utf8"))) {
      return {
        file,
        action: "update",
        reason: "target differs but is managed by oh-my-openspec — updated",
      };
    }
    if (force) {
      return { file, action: "copy", reason: "target differs (--force)" };
    }
    return {
      file,
      action: "conflict",
      reason: "target differs — kept as-is, rerun with --force to replace",
    };
  });
  const status = plans.some((plan) => plan.action === "conflict") ? 1 : 0;
  return { plans, status };
}

function failUsage(message) {
  process.stderr.write(`error: ${message}\n${USAGE}\n`);
  process.exitCode = 2;
}

function printUsage() {
  process.stdout.write(`${USAGE}\n`);
}

// Hand-rolled on purpose: three flags, friendly errors, no dependency on
// argument-parsing behavior that differs across Node versions.
function parseCliArgs(argv) {
  const options = { source: undefined, target: undefined, force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--force") {
      options.force = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      return options;
    }
    const equals = arg.indexOf("=");
    const name = equals === -1 ? arg : arg.slice(0, equals);
    if (name !== "--source" && name !== "--target") {
      failUsage(`unknown argument: ${arg}`);
      return null;
    }
    const value = equals === -1 ? argv[(index += 1)] : arg.slice(equals + 1);
    if (value === undefined || value === "" || value.startsWith("--")) {
      failUsage(`${name} requires a directory value`);
      return null;
    }
    options[name === "--source" ? "source" : "target"] = value;
  }
  return options;
}

function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options === null) return; // usage error already reported, exit 2
  if (options.help) {
    printUsage();
    return;
  }
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const sourceDir = options.source
    ? resolve(options.source)
    : join(scriptDir, "agents");
  const targetDir = options.target
    ? resolve(options.target)
    : join(homedir(), ".codex", "agents");

  if (!meetsNodeFloor(process.version)) {
    process.stderr.write(
      `warning: Node ${process.version} is older than v22.18 — the bundled ` +
        `openspec MCP server (mcp__openspec__openspec_validate) imports ` +
        `TypeScript and needs Node >= 22.18 for type stripping\n`,
    );
  }

  if (!existsSync(sourceDir)) {
    failUsage(`source directory not found: ${sourceDir}`);
    return;
  }
  if (existsSync(targetDir) && !statSync(targetDir).isDirectory()) {
    failUsage(`target exists and is not a directory: ${targetDir}`);
    return;
  }

  const { plans, status } = planAgentInstalls(sourceDir, targetDir, {
    force: options.force,
  });
  if (plans.length === 0) {
    failUsage(`no agent TOMLs found in ${sourceDir}`);
    return;
  }

  mkdirSync(targetDir, { recursive: true });
  const copied = [];
  const skipped = [];
  const updated = [];
  const conflicts = [];
  for (const plan of plans) {
    if (plan.action === "copy" || plan.action === "update") {
      copyFileSync(join(sourceDir, plan.file), join(targetDir, plan.file));
      if (plan.action === "copy") copied.push(plan);
      else updated.push(plan);
    } else if (plan.action === "skip") {
      skipped.push(plan);
    } else {
      conflicts.push(plan);
    }
  }

  process.stdout.write(
    `Copied ${copied.length} agent file(s) to ${targetDir}\n`,
  );
  process.stdout.write(`Skipped ${skipped.length} identical file(s)\n`);
  process.stdout.write(`Updated ${updated.length} managed file(s)\n`);
  for (const plan of updated) {
    process.stdout.write(`  ${plan.file}: ${plan.reason}\n`);
  }
  if (conflicts.length > 0) {
    process.stdout.write(
      `Refused ${conflicts.length} conflicting file(s) — existing user files ` +
        `were left untouched:\n`,
    );
    for (const plan of conflicts) {
      process.stdout.write(`  ${plan.file}: ${plan.reason}\n`);
    }
  }

  process.stdout.write(`\nNext steps:\n`);
  process.stdout.write(
    `1. Approve the openspec MCP server when Codex prompts ` +
      `(enables mcp__openspec__openspec_validate).\n`,
  );
  process.stdout.write(
    `2. Restart your Codex session so the installed agents and skills ` +
      `load.\n`,
  );

  process.exitCode = status;
}

// Run as `node install-agents.mjs ...` only; importing the module (from
// tests or the bundle renderer) must not touch any file system path.
const invokedAsCli =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedAsCli) {
  main();
}
