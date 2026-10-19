// Codex plugin bundle renderer — the `make codex` entry point.
//
// `renderBundle({ out })` writes the full design.md §1 tree of the
// add-codex-cli-support change (30 files: eighteen skills — the six
// flow-family renders plus the twelve vendored upstream copies — seven
// role TOMLs, two manifests, three asset files) from the single-source
// assets: agents/*.md via core/roles.ts, skills/*/SKILL.md,
// vendor/openspec/skills/, codex/setup-skill.md, core/prompts.ts, and
// the codex/ scripts. Determinism rules (design.md
// §6): the file list is sorted, every file is LF-only with a trailing
// newline, JSON is `JSON.stringify(x, null, 2) + "\n"`, and the
// package.json version is read once and shared by plugin.json and the
// `# managed-by:` markers. tests/codex-bundle.test.ts byte-compares a
// fresh render against the committed tree — the vendor/ drift pattern.
//
// All content is computed before the output tree is touched: a render
// error (a missing substitution key, a moved import) fails before a
// single file is written.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseMarkdown, validateSkillDoc } from "../core/markdown.ts";
import { SUBAGENT_CONTRACT } from "../core/prompts.ts";
import { loadRoles } from "../core/roles.ts";
import { renderAgentToml } from "./agents.ts";
import { renderMcpJson, renderPluginJson } from "./manifest.ts";
import {
  FLOW_SKILL_IDS,
  renderArchiveSkill,
  renderFlowSkill,
  renderSetupSkill,
  SUBSTITUTIONS,
  TOKEN_SUBSTITUTIONS,
} from "./skills.ts";

const ROOT = join(import.meta.dirname, "..");
const DEFAULT_OUT = join(ROOT, "plugins", "oh-my-openspec");

/** One bundle file; `path` is bundle-relative with `/` separators. */
export interface BundleFile {
  readonly path: string;
  readonly content: string;
}

/** Options for {@link renderBundle}. */
export interface RenderBundleOptions {
  /** Bundle root directory; created when missing. */
  readonly out: string;
}

// The single import specifier the renderer rewrites when copying
// codex/mcp-server.mjs into the bundle. Codex copies ONLY the bundle
// directory into ~/.codex/plugins/cache/<mkt>/<plugin>/<version>/, so
// nothing outside plugins/oh-my-openspec/ resolves from there — the
// bundle must be self-contained. The rewrite therefore points at the
// sibling copy: "../core/openspec.ts" (the source layout, for tests
// and checkouts) becomes "./openspec-core.ts", and core/openspec.ts is
// copied verbatim into assets/openspec-core.ts to satisfy it.
const MCP_SOURCE_SPECIFIER = '"../core/openspec.ts"';
const MCP_BUNDLE_SPECIFIER = '"./openspec-core.ts"';

function readPkgVersion(): string {
  const pkg: unknown = JSON.parse(
    readFileSync(join(ROOT, "package.json"), "utf-8"),
  );
  const version = (pkg as { version?: unknown }).version;
  if (typeof version !== "string" || version.length === 0) {
    throw new Error("codex/render: package.json has no usable version string");
  }
  return version;
}

function renderMcpServerAsset(): string {
  const source = readFileSync(
    join(import.meta.dirname, "mcp-server.mjs"),
    "utf-8",
  );
  const occurrences = source.split(MCP_SOURCE_SPECIFIER).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `codex/render: expected exactly one ${MCP_SOURCE_SPECIFIER} import in codex/mcp-server.mjs, found ${occurrences} — update the rewrite in codex/render.ts`,
    );
  }
  return source.split(MCP_SOURCE_SPECIFIER).join(MCP_BUNDLE_SPECIFIER);
}

// The vendored upstream skills ship in the bundle itself (design.md
// §1/§5): each vendor/openspec/skills/<name>/SKILL.md becomes
// skills/<name>/SKILL.md, so one vendor sync refreshes both hosts. The
// copy runs through the §3 substitution machinery — the phrase table
// (empty for them today: no SUBSTITUTIONS entry carries a vendored
// skill id) and the whole-body token pass — and then the residual
// guard: any `/omos.` text the two passes cannot cover fails the build
// loudly, which is the invariant that makes bundling vendor content
// safe (a future host-bound upstream edit can never silently leak into
// Codex). Frontmatter is copied verbatim: normalizing it to
// name+description is a documented fallback (design.md §1) that lands
// ONLY if the Codex loader acceptance probe rejects the extra keys
// (`allowed-tools`, `license`, …) — never pre-emptively.
const VENDOR_SKILLS_ROOT = join(ROOT, "vendor", "openspec", "skills");

/**
 * Render one vendored upstream skill for the Codex bundle: verbatim
 * frontmatter, body run through the §3 substitution machinery and the
 * residual guard. Throws when the frontmatter name does not match the
 * vendor directory (the bundle path is skills/<dir>/SKILL.md, so the
 * namespaced resolution depends on the match), when a phrase-table key
 * pinned to this skill is absent from the vendored source, or when
 * `/omos.` text survives both passes.
 */
function renderVendoredSkill(raw: string, dirName: string): string {
  const { frontmatter, body } = parseMarkdown<unknown>(raw);
  const doc = validateSkillDoc(frontmatter);
  if (doc.name !== dirName) {
    throw new Error(
      `codex/render: vendor/openspec/skills/${dirName}/SKILL.md frontmatter name is ${JSON.stringify(doc.name)}, not the directory name — the bundle path skills/${dirName}/SKILL.md must match`,
    );
  }
  // Byte-verbatim frontmatter: everything the parsed body leaves ahead
  // of itself is the original `--- … ---` block.
  const frontmatterBlock = raw.slice(0, raw.length - body.length);

  let renderedBody = body;
  // 1. Phrase table — exact-match, per-skill, pinned order; the same
  //    table codex/skills.ts applies to the flow skills, carrying no
  //    vendored entry today (the pass is a no-op until one is pinned).
  for (const sub of SUBSTITUTIONS) {
    if (sub.skillId !== doc.name) continue;
    if (!renderedBody.includes(sub.key)) {
      throw new Error(
        `codex/render: substitution key missing from vendor/openspec/skills/${dirName}/SKILL.md — expected to find:\n${sub.key}\nUpdate SUBSTITUTIONS in codex/skills.ts to match the vendored source.`,
      );
    }
    // Function form: the replacement is literal, `$` patterns must not
    // be interpreted.
    renderedBody = renderedBody.replaceAll(sub.key, () => sub.replacement);
  }
  // 2. Whole-body token pass — the mechanical `/omos.<flow>` swaps.
  for (const [from, to] of TOKEN_SUBSTITUTIONS) {
    renderedBody = renderedBody.replaceAll(from, () => to);
  }
  // 3. Residual guard (design.md §3) — mirrors
  //    assertNoSlashAliasInBody in codex/skills.ts.
  const offendingLine = renderedBody
    .split("\n")
    .find((line) => line.includes("/omos."));
  if (offendingLine !== undefined) {
    throw new Error(
      `codex/render: vendored body of vendor/openspec/skills/${dirName}/SKILL.md still names a /omos.* slash command after the phrase table and the token pass — extend SUBSTITUTIONS or TOKEN_SUBSTITUTIONS in codex/skills.ts to cover it, or re-vendor once upstream fixes the host-bound text.\noffending line: ${offendingLine}`,
    );
  }
  return frontmatterBlock + renderedBody;
}

/**
 * Collect the twelve vendored upstream skills (design.md §1) into the
 * bundle file list, straight from the vendor tree the daily
 * sync-vendor pipeline refreshes.
 */
function collectVendoredSkills(files: BundleFile[]): void {
  const dirNames = readdirSync(VENDOR_SKILLS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (dirNames.length === 0) {
    throw new Error(
      "codex/render: vendor/openspec/skills/ holds no skill directories — run `make sync`",
    );
  }
  for (const dirName of dirNames) {
    // Namespaced-name sanity: a vendored dir is exactly one SKILL.md —
    // anything else is a vendor layout change the renderer must learn
    // about explicitly, never a silent partial copy.
    const entries = readdirSync(join(VENDOR_SKILLS_ROOT, dirName));
    if (entries.length !== 1 || entries[0] !== "SKILL.md") {
      throw new Error(
        `codex/render: vendor/openspec/skills/${dirName} must hold exactly one SKILL.md, found [${entries.join(", ")}] — extend collectVendoredSkills in codex/render.ts for the new vendor layout`,
      );
    }
    const raw = readFileSync(
      join(VENDOR_SKILLS_ROOT, dirName, "SKILL.md"),
      "utf-8",
    );
    files.push({
      path: `skills/${dirName}/SKILL.md`,
      content: renderVendoredSkill(raw, dirName),
    });
  }
}

function collectBundleFiles(pkgVersion: string): BundleFile[] {
  const files: BundleFile[] = [
    {
      path: ".codex-plugin/plugin.json",
      content: renderPluginJson(pkgVersion),
    },
    { path: ".mcp.json", content: renderMcpJson() },
  ];

  for (const role of loadRoles(join(ROOT, "agents"))) {
    files.push({
      path: `assets/agents/${role.id}.toml`,
      content: renderAgentToml(role, SUBAGENT_CONTRACT, pkgVersion),
    });
  }

  for (const id of FLOW_SKILL_IDS) {
    const raw = readFileSync(join(ROOT, "skills", id, "SKILL.md"), "utf-8");
    files.push({
      path: `skills/${id}/SKILL.md`,
      content: renderFlowSkill(raw),
    });
  }
  files.push({
    path: "skills/omos-setup/SKILL.md",
    content: renderSetupSkill(),
  });
  // The sixth flow-family skill: the /omos.archive surface-parity
  // wrapper, single-sourced from core/prompts.ts (design.md §3).
  files.push({
    path: "skills/omos-archive/SKILL.md",
    content: renderArchiveSkill(),
  });
  // The twelve vendored upstream skills (design.md §1).
  collectVendoredSkills(files);

  files.push({
    path: "assets/mcp-server.mjs",
    content: renderMcpServerAsset(),
  });
  // Verbatim copy of core/openspec.ts — the cache-containment twin of
  // the rewritten import above. Generated, never hand-edited; the drift
  // gate byte-compares it against the source.
  files.push({
    path: "assets/openspec-core.ts",
    content: readFileSync(join(ROOT, "core", "openspec.ts"), "utf-8"),
  });
  files.push({
    path: "assets/install-agents.mjs",
    content: readFileSync(
      join(import.meta.dirname, "install-agents.mjs"),
      "utf-8",
    ),
  });
  return files;
}

// The bundle directory is fully generated — the vendor/ precedent: wipe
// and rewrite, so a rename in the sources can never leave a stale file
// behind. Safety guard: a non-empty directory that is not already a
// bundle is refused, never wiped.
function prepareOutDir(out: string): void {
  if (!existsSync(out)) {
    mkdirSync(out, { recursive: true });
    return;
  }
  if (!statSync(out).isDirectory()) {
    throw new Error(`codex/render: output path is not a directory: ${out}`);
  }
  if (readdirSync(out).length === 0) {
    return; // Fresh (e.g. a temp dir) — nothing to wipe.
  }
  if (!existsSync(join(out, ".codex-plugin", "plugin.json"))) {
    throw new Error(
      `codex/render: refusing to overwrite non-bundle directory: ${out}`,
    );
  }
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
}

/**
 * Render the bundle into `out` and return the sorted list of
 * bundle-relative file paths written (design.md §1 — 30 files). Throws
 * before writing anything when a source fails to render.
 */
export function renderBundle(options: RenderBundleOptions): string[] {
  const pkgVersion = readPkgVersion();
  const files = collectBundleFiles(pkgVersion).sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );

  prepareOutDir(options.out);
  const written: string[] = [];
  for (const file of files) {
    if (file.content.includes("\r")) {
      throw new Error(
        `codex/render: ${file.path} would contain a CR — LF endings only`,
      );
    }
    const content = file.content.endsWith("\n")
      ? file.content
      : `${file.content}\n`;
    const target = join(options.out, ...file.path.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    written.push(file.path);
  }
  return written;
}

const USAGE = `Usage: node codex/render.ts [--out <dir>]

Renders the Codex plugin bundle. Default --out: plugins/oh-my-openspec
at the repository root. The output directory is fully regenerated.`;

interface CliOptions {
  readonly out?: string;
  readonly help?: boolean;
}

// Hand-rolled on purpose (same as codex/install-agents.mjs): one flag,
// friendly errors, no dependency on argument-parsing behavior that
// differs across Node versions.
function parseCliArgs(argv: readonly string[]): CliOptions | null {
  const options: { out?: string; help?: boolean } = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      return options;
    }
    const equals = arg.indexOf("=");
    const name = equals === -1 ? arg : arg.slice(0, equals);
    if (name !== "--out") {
      process.stderr.write(`error: unknown argument: ${arg}\n${USAGE}\n`);
      return null;
    }
    const value = equals === -1 ? argv[(index += 1)] : arg.slice(equals + 1);
    if (value === undefined || value === "" || value.startsWith("--")) {
      process.stderr.write(
        `error: ${name} requires a directory value\n${USAGE}\n`,
      );
      return null;
    }
    options.out = value;
  }
  return options;
}

function runCli(): void {
  const options = parseCliArgs(process.argv.slice(2));
  if (options === null) {
    process.exitCode = 2; // usage error already reported
    return;
  }
  if (options.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  const out = options.out === undefined ? DEFAULT_OUT : resolve(options.out);
  const written = renderBundle({ out });
  process.stdout.write(
    `codex/render: wrote ${written.length} file(s) to ${out}\n`,
  );
}

// Run as `node codex/render.ts` only; importing the module (from tests)
// must never write anything.
const argv1 = process.argv[1];
const invokedAsCli =
  argv1 !== undefined && import.meta.url === pathToFileURL(resolve(argv1)).href;

if (invokedAsCli) {
  runCli();
}
