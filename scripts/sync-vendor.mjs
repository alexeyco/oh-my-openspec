#!/usr/bin/env node
// Vendor OpenSpec's OpenCode skills into vendor/openspec/.
//
// Usage:
//   node scripts/sync-vendor.mjs           # write vendor files
//   node scripts/sync-vendor.mjs --check   # CI: fail on any drift, no writes
//
// How it generates: a throwaway HOME gets an explicit custom profile with
// every workflow the installed CLI knows, `openspec init --tools opencode`
// renders skills into a throwaway project, and the output is copied in
// byte-identically. The committed manifest records the CLI version so
// --check can prove freshness without regenerating.
//
// Why not `openspec update`: that command refreshes files for tools already
// recorded in the project's openspec config; `init` is the command that
// creates the tool files for a freshly configured tool set.

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR = join(ROOT, "vendor", "openspec");
const MANIFEST_NAME = "manifest.json";
const MANIFEST_PATH = join(VENDOR, MANIFEST_NAME);
const CHECK = process.argv.includes("--check");

const pkgDir = join(ROOT, "node_modules", "@fission-ai", "openspec");
const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf-8"));
const binField = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.openspec;
if (typeof binField !== "string") {
  console.error("sync-vendor: @fission-ai/openspec has no openspec bin");
  process.exit(2);
}
const cliBin = join(pkgDir, binField);

// Explicit workflow list (core + extended) so all skills render regardless
// of upstream profile defaults.
const ALL_WORKFLOWS = [
  "propose",
  "explore",
  "new",
  "continue",
  "apply",
  "update",
  "ff",
  "sync",
  "archive",
  "bulk-archive",
  "verify",
  "onboard",
];

function runCli(args, env) {
  return execFileSync(process.execPath, [cliBin, ...args], {
    env: { ...process.env, ...env },
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

// ── Generate into a throwaway project ───────────────────────────────────────

const work = mkdtempSync(join(tmpdir(), "openspec-vendor-"));
const home = join(work, "home");
const proj = join(work, "proj");
mkdirSync(home, { recursive: true });
mkdirSync(proj, { recursive: true });

const env = { HOME: home, OPENSPEC_TELEMETRY: "0" };

try {
  runCli(["config", "set", "profile", "custom"], env);
  runCli(["config", "set", "workflows", JSON.stringify(ALL_WORKFLOWS)], env);
  runCli(["config", "set", "delivery", "skills"], env);
  runCli(["init", "--tools", "opencode", "--no-animation", proj], env);
} catch (err) {
  console.error(
    `sync-vendor: openspec init failed:\n${err.stdout ?? ""}${err.stderr ?? ""}`,
  );
  rmSync(work, { recursive: true, force: true });
  process.exit(2);
}

const generatedRoot = join(proj, ".opencode", "skills");
if (!existsSync(generatedRoot)) {
  console.error("sync-vendor: CLI produced no skills directory");
  rmSync(work, { recursive: true, force: true });
  process.exit(2);
}

const generated = new Map();
for (const entry of readdirSync(generatedRoot, { withFileTypes: true })) {
  const skillFile = join(generatedRoot, entry.name, "SKILL.md");
  if (entry.isDirectory() && existsSync(skillFile)) {
    generated.set(entry.name, readFileSync(skillFile));
  }
}
rmSync(work, { recursive: true, force: true });

// ── Expected manifest ───────────────────────────────────────────────────────

const expectedManifest = {
  package: pkg.name,
  version: pkg.version,
  generatedBy: pkg.version,
  skills: [...generated.keys()].sort(),
};

function manifestOnDiskMatchesExpected() {
  if (!existsSync(MANIFEST_PATH)) return false;
  try {
    const current = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
    return (
      current.package === expectedManifest.package &&
      current.version === expectedManifest.version &&
      current.generatedBy === expectedManifest.generatedBy &&
      JSON.stringify([...(current.skills ?? [])].sort()) ===
        JSON.stringify(expectedManifest.skills)
    );
  } catch {
    return false;
  }
}

// ── Compare against the committed vendor tree ───────────────────────────────

const drift = [];

for (const id of expectedManifest.skills) {
  const committed = join(VENDOR, "skills", id, "SKILL.md");
  if (!existsSync(committed)) {
    drift.push(`+ skills/${id}/SKILL.md (new upstream)`);
  } else if (!readFileSync(committed).equals(generated.get(id))) {
    drift.push(`~ skills/${id}/SKILL.md (changed upstream)`);
  }
}

const committedSkillsRoot = join(VENDOR, "skills");
if (existsSync(committedSkillsRoot)) {
  for (const entry of readdirSync(committedSkillsRoot, {
    withFileTypes: true,
  })) {
    if (entry.isDirectory() && !generated.has(entry.name)) {
      drift.push(`- skills/${entry.name}/ (removed upstream)`);
    }
  }
}

if (!manifestOnDiskMatchesExpected()) {
  drift.push("~ manifest.json (version or skill set differs)");
}

// ── Check mode or write mode ────────────────────────────────────────────────

if (CHECK) {
  if (drift.length > 0) {
    console.error(
      `sync-vendor: vendor/ is not in sync with ${pkg.name}@${pkg.version}:`,
    );
    for (const line of drift) console.error(`  ${line}`);
    console.error("Fix: make sync, then commit vendor/");
    process.exit(1);
  }
  console.log(
    `sync-vendor: vendor/ in sync with ${pkg.name}@${pkg.version} (${generated.size} skills)`,
  );
  process.exit(0);
}

const skillsOut = join(VENDOR, "skills");
rmSync(skillsOut, { recursive: true, force: true });
mkdirSync(skillsOut, { recursive: true });
for (const [id, content] of generated) {
  const dir = join(skillsOut, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), content);
}
writeFileSync(MANIFEST_PATH, JSON.stringify(expectedManifest, null, 2) + "\n");

console.log(
  `sync-vendor: wrote ${generated.size} skill(s) from ${pkg.name}@${pkg.version}`,
);
for (const line of drift) console.log(`  ${line}`);

// Cross-file consistency guard: the manifest must describe the tree we just wrote.
{
  const ids = readdirSync(skillsOut, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  if (JSON.stringify(ids) !== JSON.stringify(expectedManifest.skills)) {
    console.error("sync-vendor: manifest and vendor/ tree diverged");
    process.exit(2);
  }
}
