import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const YAML = require("yaml");

const failures = [];

function fail(msg) {
  failures.push(msg);
}

function readText(path) {
  return readFileSync(path, "utf-8");
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  return YAML.parse(match[1]);
}

// ── 1. package.json ─────────────────────────────────────────────────────────

{
  const pkgPath = join(ROOT, "package.json");
  let pkg;
  try {
    pkg = JSON.parse(readText(pkgPath));
  } catch {
    fail("package.json: missing or invalid JSON");
    pkg = null;
  }

  if (pkg) {
    for (const key of ["name", "version", "description", "license"]) {
      if (pkg[key] === undefined) fail(`package.json: missing "${key}"`);
    }
    if (pkg.type !== "module")
      fail(`package.json: "type" must be "module", got "${pkg.type}"`);
    if (pkg.exports?.["."] === undefined)
      fail('package.json: missing exports["."]');
    if (!Array.isArray(pkg.files))
      fail('package.json: "files" must be an array');
    if (typeof pkg.scripts?.test !== "string")
      fail("package.json: missing scripts.test");
    if (typeof pkg.scripts?.typecheck !== "string")
      fail("package.json: missing scripts.typecheck");
    if (!pkg.devDependencies?.["@fission-ai/openspec"])
      fail(
        "package.json: @fission-ai/openspec must be a devDependency (vendor sync source)",
      );

    // Every path in `files` must exist on disk (skip README/LICENSE)
    if (Array.isArray(pkg.files)) {
      for (const f of pkg.files) {
        const full = join(ROOT, f);
        if (!existsSync(full)) {
          fail(`package.json: "files" entry "${f}" does not exist on disk`);
        }
      }
    }
  }
}

// ── 2. ROLE_IDS ↔ agents/*.md ───────────────────────────────────────────────

{
  const rolesSrc = readText(join(ROOT, "core", "roles.ts"));
  const rolesMatch = rolesSrc.match(/ROLE_IDS\s*=\s*\[([^\]]*)\]\s*as\s*const/);
  if (!rolesMatch) {
    fail("core/roles.ts: ROLE_IDS array not found");
  } else {
    const roleIds = rolesMatch[1]
      .split(",")
      .map((s) => s.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
    const agentsDir = join(ROOT, "agents");
    const agentFiles = readdirSync(agentsDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""))
      .sort();
    if (JSON.stringify([...roleIds].sort()) !== JSON.stringify(agentFiles)) {
      fail(`ROLE_IDS [${roleIds.sort()}] != agents/*.md [${agentFiles}]`);
    }
    for (const id of agentFiles) {
      const fm = parseFrontmatter(readText(join(agentsDir, `${id}.md`)));
      if (!fm) {
        fail(`agents/${id}.md: missing frontmatter`);
        continue;
      }
      if (fm.mode !== "subagent")
        fail(`agents/${id}.md: mode must be subagent`);
      if (typeof fm.description !== "string" || !fm.description)
        fail(`agents/${id}.md: missing description`);
      if ("model" in fm) fail(`agents/${id}.md: model pin is not allowed`);
    }
  }
}

// ── 3. Flow skills ↔ skills/ ────────────────────────────────────────────────

{
  const entrySrc = readText(join(ROOT, "opencode", "index.ts"));
  const flowMatch = entrySrc.match(/FLOW_SKILL_IDS\s*=\s*\[([^\]]*)\]/);
  if (!flowMatch) {
    fail("opencode/index.ts: FLOW_SKILL_IDS not found");
  } else {
    const ids = flowMatch[1]
      .split(",")
      .map((s) => s.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
    for (const id of ids) {
      const file = join(ROOT, "skills", id, "SKILL.md");
      if (!existsSync(file)) {
        fail(`skills/${id}/SKILL.md missing (listed in FLOW_SKILL_IDS)`);
        continue;
      }
      const fm = parseFrontmatter(readText(file));
      if (!fm || fm.name !== id)
        fail(`skills/${id}: frontmatter name must equal directory name`);
    }
    // skills/ must not hold unlisted directories
    const onDisk = readdirSync(join(ROOT, "skills"), {
      withFileTypes: true,
    })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    for (const dir of onDisk) {
      if (!ids.includes(dir))
        fail(`skills/${dir}: present on disk but missing from FLOW_SKILL_IDS`);
    }
  }
}

// ── 4. vendor/openspec ↔ manifest ───────────────────────────────────────────

{
  const vendorDir = join(ROOT, "vendor", "openspec");
  if (!existsSync(vendorDir)) {
    fail("vendor/openspec: missing — run `make sync`");
  } else {
    let manifest;
    try {
      manifest = JSON.parse(readText(join(vendorDir, "manifest.json")));
    } catch {
      fail("vendor/openspec/manifest.json: missing or invalid JSON");
    }
    if (manifest) {
      const onDisk = readdirSync(join(vendorDir, "skills"), {
        withFileTypes: true,
      })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();
      const listed = [...(manifest.skills ?? [])].sort();
      if (JSON.stringify(onDisk) !== JSON.stringify(listed))
        fail(`vendor manifest skills [${listed}] != dirs [${onDisk}]`);
      for (const id of onDisk) {
        const fm = parseFrontmatter(
          readText(join(vendorDir, "skills", id, "SKILL.md")),
        );
        if (!fm) {
          fail(`vendor/openspec/skills/${id}: missing frontmatter`);
          continue;
        }
        if (fm.name !== id)
          fail(`vendor skill ${id}: frontmatter name differs`);
        if (fm.metadata?.generatedBy !== manifest.generatedBy)
          fail(
            `vendor skill ${id}: generatedBy ${fm.metadata?.generatedBy} != manifest ${manifest.generatedBy}`,
          );
      }
      // Never hand-edited: content must be self-stamped upstream version
      if (!/^\d+\.\d+\.\d+$/.test(String(manifest.generatedBy)))
        fail("vendor manifest: generatedBy must be a plain semver");
      // Mirror invariant: the plugin version IS the vendored OpenSpec
      // version (see docs/vendor-sync.md). Machine-owned — only the
      // vendor-sync workflow moves it.
      try {
        const pkgVersion = JSON.parse(
          readText(join(ROOT, "package.json")),
        ).version;
        if (pkgVersion !== manifest.generatedBy)
          fail(
            `mirror: package.json version ${pkgVersion} != vendored ${manifest.generatedBy} — run the vendor-sync workflow (or bump manually to match)`,
          );
      } catch {
        fail("mirror: could not read package.json version");
      }
    }
  }
}

// ── 5. Docs referenced from the root README/CONTRIBUTING exist ─────────────

{
  for (const doc of ["README.md", "CONTRIBUTING.md", "AGENTS.md"]) {
    const file = join(ROOT, doc);
    if (!existsSync(file)) {
      fail(`${doc}: missing`);
      continue;
    }
    const text = readText(file);
    const refs = new Set();
    for (const m of text.matchAll(/\]\((?!https?:)([^)#]+)(#[^)]*)?\)/g)) {
      refs.add(m[1]);
    }
    for (const ref of refs) {
      const target = join(ROOT, ref);
      if (!existsSync(target)) fail(`${doc}: broken relative link → ${ref}`);
    }
  }
}

// ── 6. No model pins, no pi leftovers, English content ─────────────────────

{
  const entrySrc = readText(join(ROOT, "opencode", "index.ts"));
  if (!entrySrc.includes('id: "opencode-openspec"'))
    fail('opencode/index.ts: plugin id must be "opencode-openspec"');

  const pkgJson = JSON.parse(readText(join(ROOT, "package.json")));
  if (pkgJson.pi) fail('package.json: stray "pi" manifest section');
}

// ── Result ──────────────────────────────────────────────────────────────────

if (failures.length > 0) {
  console.error(`check: ${failures.length} problem(s):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log("check: ok");
