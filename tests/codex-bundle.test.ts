// Drift gate for the generated Codex plugin bundle — the bundle twin of
// scripts/sync-vendor.mjs --check. A fresh render into a temp directory
// must be byte-identical to the committed plugins/oh-my-openspec/ tree,
// so editing a single-source asset without re-running `make codex` (and
// committing) fails the suite naming the drifted files. The twelve
// vendored upstream skills additionally track the vendor tree itself:
// each bundled copy's BODY (post-frontmatter bytes) must equal its
// vendor/openspec/skills/ source, so one vendor sync refreshes both
// hosts. Also enforced
// here, from specs/codex-host-integration: "core never imports codex"
// and the automated half of "OpenCode gates stay green", plus the
// version tie between plugin.json and the role TOML `# managed-by:`
// markers, and cache containment — Codex copies ONLY the bundle
// directory into ~/.codex/plugins/cache/, so every import stays inside
// the bundle (assets/openspec-core.ts is the verbatim core/openspec.ts
// twin of the rewritten mcp-server import) and a start-as-declared
// subprocess smoke launches the committed .mcp.json form — command
// `node`, args ["./assets/mcp-server.mjs"], cwd "./" (the plugin
// root) — against a bare copy of the tree, so the relative arg
// resolves against the child's cwd, never this harness's.

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseMarkdown, validateSkillDoc } from "../core/markdown.ts";
import { renderBundle } from "../codex/render.ts";

const repoRoot = join(import.meta.dirname, "..");
const committedBundle = join(repoRoot, "plugins", "oh-my-openspec");
const vendorSkillsRoot = join(repoRoot, "vendor", "openspec", "skills");

// The design.md §1 tree, pinned: exactly 30 files — eighteen skills
// (six flow-family including the omos-archive wrapper, twelve vendored
// upstream), seven role TOMLs, two manifests, three asset files
// (mcp-server.mjs with its sibling openspec-core.ts copy,
// install-agents.mjs).
const EXPECTED_FILES: readonly string[] = [
  ".codex-plugin/plugin.json",
  ".mcp.json",
  "assets/agents/omos-critic.toml",
  "assets/agents/omos-implementer.toml",
  "assets/agents/omos-planner.toml",
  "assets/agents/omos-researcher.toml",
  "assets/agents/omos-retrospector.toml",
  "assets/agents/omos-reviewer.toml",
  "assets/agents/omos-verifier.toml",
  "assets/install-agents.mjs",
  "assets/mcp-server.mjs",
  "assets/openspec-core.ts",
  "skills/omos-apply/SKILL.md",
  "skills/omos-archive/SKILL.md",
  "skills/omos-init/SKILL.md",
  "skills/omos-plan/SKILL.md",
  "skills/omos-retro/SKILL.md",
  "skills/omos-setup/SKILL.md",
  "skills/openspec-apply-change/SKILL.md",
  "skills/openspec-archive-change/SKILL.md",
  "skills/openspec-bulk-archive-change/SKILL.md",
  "skills/openspec-continue-change/SKILL.md",
  "skills/openspec-explore/SKILL.md",
  "skills/openspec-ff-change/SKILL.md",
  "skills/openspec-new-change/SKILL.md",
  "skills/openspec-onboard/SKILL.md",
  "skills/openspec-propose/SKILL.md",
  "skills/openspec-sync-specs/SKILL.md",
  "skills/openspec-update-change/SKILL.md",
  "skills/openspec-verify-change/SKILL.md",
];

// The spec-permitted plugin.json fields, and nothing else: no commands,
// no agents (the Codex manifest has none — roles install as TOMLs), no
// apps, no interface, no hooks (none ship).
const PERMITTED_PLUGIN_FIELDS: readonly string[] = [
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "skills",
  "mcpServers",
];

// The package.json files allow-list, pinned: npm stays OpenCode-only —
// no codex/ or plugins/ entries ride the tarball.
const PINNED_FILES_ARRAY: readonly string[] = [
  "agents",
  "core",
  "docs",
  "opencode",
  "skills",
  "vendor",
  "index.ts",
  "README.md",
  "LICENSE",
];

interface PkgJson {
  readonly version: string;
  readonly bin?: unknown;
  readonly files?: readonly string[];
  readonly exports?: { readonly [key: string]: unknown };
}

function readPkg(): PkgJson {
  return JSON.parse(
    readFileSync(join(repoRoot, "package.json"), "utf-8"),
  ) as PkgJson;
}

// Sorted recursive file listing (relative paths, `/` separators).
function listFiles(dir: string, base = ""): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = base === "" ? entry.name : `${base}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...listFiles(join(dir, entry.name), rel));
    } else if (entry.isFile()) {
      files.push(rel);
    }
  }
  return files.sort();
}

// The vendored skill directories under vendor/openspec/skills/, sorted.
function vendoredSkillDirs(): string[] {
  return readdirSync(vendorSkillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

// Every module specifier an import/export statement can name: static
// `… from "x"`, side-effect `import "x"`, and dynamic `import("x")`.
function collectImportSpecifiers(src: string): string[] {
  const specifiers: string[] = [];
  const patterns: RegExp[] = [
    /\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of src.matchAll(pattern)) {
      specifiers.push(match[1]!);
    }
  }
  return specifiers;
}

function assertCommittedBundleExists(): void {
  assert.ok(
    existsSync(committedBundle),
    "plugins/oh-my-openspec/ is missing — run `make codex` and commit the generated tree",
  );
}

let freshDir: string;
let freshFiles: string[];

before(() => {
  freshDir = mkdtempSync(join(tmpdir(), "o-omos-codex-bundle-"));
  freshFiles = renderBundle({ out: freshDir });
});

after(() => {
  rmSync(freshDir, { recursive: true, force: true });
});

describe("renderBundle", () => {
  it("writes exactly the design.md §1 tree — 30 files", () => {
    assert.deepEqual(freshFiles, [...EXPECTED_FILES]);
    assert.deepEqual(listFiles(freshDir), [...EXPECTED_FILES]);
  });

  it("ships exactly the six flow-family skills, omos-archive wrapper included", () => {
    assertCommittedBundleExists();
    const committed = listFiles(committedBundle);
    assert.deepEqual(
      committed.filter((f) => f.startsWith("skills/omos-")).sort(),
      [
        "skills/omos-apply/SKILL.md",
        "skills/omos-archive/SKILL.md",
        "skills/omos-init/SKILL.md",
        "skills/omos-plan/SKILL.md",
        "skills/omos-retro/SKILL.md",
        "skills/omos-setup/SKILL.md",
      ],
      "exactly the six flow-family skills — the omos-archive wrapper (renderArchiveSkill) is wired into the bundle",
    );
  });

  it("ships no hooks.json and no alias-mapping script", () => {
    assertCommittedBundleExists();
    const committed = listFiles(committedBundle);
    assert.ok(
      !committed.some((f) => f === "hooks.json" || f.endsWith("/hooks.json")),
      "no hooks.json anywhere in the bundle — the invocation surface is $omos-* mentions only",
    );
    assert.ok(
      !committed.includes("assets/alias-context.mjs"),
      "no alias-mapping script in the bundle — alias hooks were descoped",
    );
    // The MCP server copy must carry the rewritten sibling import, the
    // core twin must be a byte-identical copy, and the installer must be
    // the verbatim source.
    const mcpServer = readFileSync(
      join(committedBundle, "assets", "mcp-server.mjs"),
      "utf-8",
    );
    assert.ok(
      mcpServer.includes('from "./openspec-core.ts"'),
      'assets/mcp-server.mjs imports "./openspec-core.ts" — the sibling copy, so the bundle stays self-contained in the plugin cache',
    );
    assert.ok(
      !mcpServer.includes('from "../core/openspec.ts"'),
      "assets/mcp-server.mjs keeps no codex/-relative import",
    );
    assert.ok(
      readFileSync(join(committedBundle, "assets", "openspec-core.ts")).equals(
        readFileSync(join(repoRoot, "core", "openspec.ts")),
      ),
      "assets/openspec-core.ts is a verbatim copy of core/openspec.ts",
    );
    assert.ok(
      readFileSync(
        join(committedBundle, "assets", "install-agents.mjs"),
      ).equals(readFileSync(join(repoRoot, "codex", "install-agents.mjs"))),
      "assets/install-agents.mjs is a verbatim copy of codex/install-agents.mjs",
    );
  });

  it("Bundle matches fresh render byte-for-byte", () => {
    assertCommittedBundleExists();
    const committed = listFiles(committedBundle);
    const fresh = listFiles(freshDir);
    const committedSet = new Set(committed);
    const freshSet = new Set(fresh);

    // File-list equality both ways, drift named per file.
    const missing = fresh.filter((f) => !committedSet.has(f));
    const stale = committed.filter((f) => !freshSet.has(f));
    if (missing.length > 0 || stale.length > 0) {
      assert.fail(
        `bundle drift: fresh render has file(s) missing from the committed tree [${missing.join(", ")}]; committed tree has file(s) absent from a fresh render [${stale.join(", ")}] — run \`make codex\` and commit`,
      );
    }

    const drifted = fresh.filter(
      (f) =>
        !readFileSync(join(freshDir, f)).equals(
          readFileSync(join(committedBundle, f)),
        ),
    );
    if (drifted.length > 0) {
      assert.fail(
        `bundle drift: file(s) differ from a fresh render [${drifted.join(", ")}] — run \`make codex\` and commit`,
      );
    }
  });
});

describe("Vendored bundle copies track the vendor tree", () => {
  it("twelve vendored skills ship, one SKILL.md per vendored dir", () => {
    assertCommittedBundleExists();
    const dirs = vendoredSkillDirs();
    assert.equal(
      dirs.length,
      12,
      "exactly twelve vendored upstream skills (design.md §1)",
    );
    const committed = listFiles(committedBundle);
    for (const dir of dirs) {
      // Namespaced-name sanity: the vendor dir is exactly one
      // SKILL.md, and the bundle carries it under the same dir name.
      assert.deepEqual(
        readdirSync(join(vendorSkillsRoot, dir)).sort(),
        ["SKILL.md"],
        `vendor/openspec/skills/${dir} holds exactly one SKILL.md`,
      );
      assert.ok(
        committed.includes(`skills/${dir}/SKILL.md`),
        `the committed bundle ships skills/${dir}/SKILL.md`,
      );
    }
  });

  it("each bundled vendored skill's body equals its vendor source byte-for-byte", () => {
    assertCommittedBundleExists();
    for (const dir of vendoredSkillDirs()) {
      const source = readFileSync(
        join(vendorSkillsRoot, dir, "SKILL.md"),
        "utf-8",
      );
      const bundled = readFileSync(
        join(committedBundle, "skills", dir, "SKILL.md"),
        "utf-8",
      );
      const src = parseMarkdown<unknown>(source);
      const copy = parseMarkdown<unknown>(bundled);

      // The scenario's core assertion: post-frontmatter bytes match,
      // so one vendor sync refreshes both hosts (the §3 machinery is
      // a no-op on vendored bodies today — phrase table empty for
      // them, token pass finds nothing, residual guard clean).
      assert.ok(
        copy.body === src.body,
        `skills/${dir}/SKILL.md: body (post-frontmatter bytes) must equal vendor/openspec/skills/${dir}/SKILL.md byte-for-byte`,
      );

      // The frontmatter transform, asserted separately from the body:
      // none today — the copy is verbatim. The name+description
      // normalization is the documented fallback (design.md §1) that
      // lands only if the Codex loader acceptance probe rejects the
      // extra vendored keys; if that probe ever fails and the
      // normalization lands, this assertion is the one to re-pin.
      assert.ok(
        bundled.slice(0, bundled.length - copy.body.length) ===
          source.slice(0, source.length - src.body.length),
        `skills/${dir}/SKILL.md: frontmatter must be the verbatim vendor bytes — no normalization is applied today`,
      );

      // Namespaced-name sanity: the frontmatter name equals the
      // directory name, so the bundled copy resolves as
      // oh-my-openspec:openspec-<name>.
      const doc = validateSkillDoc(copy.frontmatter);
      assert.equal(
        doc.name,
        dir,
        `skills/${dir}/SKILL.md: frontmatter name must equal the directory name`,
      );
    }
  });
});

describe("bundle self-containment (Codex copies only the bundle dir)", () => {
  it("assets/openspec-core.ts byte-equals core/openspec.ts, fresh and committed", () => {
    assertCommittedBundleExists();
    const source = readFileSync(join(repoRoot, "core", "openspec.ts"));
    assert.ok(
      readFileSync(join(freshDir, "assets", "openspec-core.ts")).equals(source),
      "fresh render: assets/openspec-core.ts must be a byte-identical copy of core/openspec.ts",
    );
    assert.ok(
      readFileSync(join(committedBundle, "assets", "openspec-core.ts")).equals(
        source,
      ),
      "committed tree: assets/openspec-core.ts must be a byte-identical copy of core/openspec.ts",
    );
  });

  it("no import statement in the committed tree escapes the bundle", () => {
    assertCommittedBundleExists();
    for (const file of listFiles(committedBundle)) {
      const src = readFileSync(join(committedBundle, file), "utf-8");
      assert.ok(
        !src.includes('from "../../../core/openspec.ts"'),
        `plugins/oh-my-openspec/${file}: no import may reference the old ../../../core/openspec.ts escape path — it dies with ERR_MODULE_NOT_FOUND in the plugin cache`,
      );
      for (const specifier of collectImportSpecifiers(src)) {
        assert.ok(
          !specifier.startsWith("../"),
          `plugins/oh-my-openspec/${file}: import "${specifier}" escapes the bundle — Codex copies ONLY the bundle directory into ~/.codex/plugins/cache/, so nothing outside plugins/oh-my-openspec/ resolves from there`,
        );
      }
    }
  });

  it(".mcp.json declares the proven launch form for the openspec server", () => {
    assertCommittedBundleExists();
    // design.md §4, form #3 — pinned field-for-field: the only launch
    // shape proven live on Codex 0.163.0. `cwd: "./"` makes node resolve
    // the relative args entry against the plugin root (the plugin-cache
    // copy), which is exactly what the smoke below launches.
    const mcp = JSON.parse(
      readFileSync(join(committedBundle, ".mcp.json"), "utf-8"),
    ) as { mcpServers?: Record<string, Record<string, unknown>> };
    const servers = mcp.mcpServers ?? {};
    assert.deepEqual(
      Object.keys(servers),
      ["openspec"],
      "exactly one MCP server, named openspec",
    );
    assert.deepEqual(
      servers.openspec,
      {
        type: "stdio",
        title: "OpenSpec validate",
        description:
          "Mechanical OpenSpec artifact validation gate (openspec_validate).",
        command: "node",
        args: ["./assets/mcp-server.mjs"],
        cwd: "./",
      },
      "the openspec entry is exactly the proven launch form — no extra fields",
    );
  });

  it("Launch form starts the server in the plugin cache", async () => {
    assertCommittedBundleExists();
    // Start-as-declared: read the launch form from the committed
    // .mcp.json and reproduce it exactly. The declared `cwd: "./"`
    // resolves to the bundle root — recreated here as a bare copy of
    // the committed tree, the plugin-cache layout Codex installs —
    // while this harness keeps its own unrelated working directory
    // (the repo root, where ./assets/mcp-server.mjs does not exist):
    // node must resolve the relative arg against the CHILD's cwd,
    // never ours, or the server dies before the handshake (the
    // no-cwd launch form, design.md §4 form #1). stdin carries the
    // host handshake; the notification stays unanswered.
    const declared = JSON.parse(
      readFileSync(join(committedBundle, ".mcp.json"), "utf-8"),
    ) as { mcpServers: { openspec: Record<string, unknown> } };
    const server = declared.mcpServers.openspec;
    assert.equal(server.type, "stdio", 'declared type is "stdio"');
    assert.equal(server.command, "node", 'declared command is "node"');
    assert.deepEqual(
      server.args,
      ["./assets/mcp-server.mjs"],
      "declared args stay plugin-root-relative",
    );
    assert.equal(
      server.cwd,
      "./",
      'declared cwd is "./" — the plugin root, the launch form proven live on Codex 0.163.0',
    );

    const cacheDir = mkdtempSync(join(tmpdir(), "o-omos-codex-cache-"));
    try {
      cpSync(committedBundle, cacheDir, { recursive: true });
      const child = spawn(process.execPath, server.args as string[], {
        cwd: cacheDir, // "cwd": "./" — the bundle root inside the copy
        stdio: ["pipe", "pipe", "pipe"],
      });
      let out = "";
      let err = "";
      child.stdout!.setEncoding("utf8");
      child.stdout!.on("data", (chunk: string) => {
        out += chunk;
      });
      child.stderr!.setEncoding("utf8");
      child.stderr!.on("data", (chunk: string) => {
        err += chunk;
      });
      const closed = new Promise<number | null>((resolve) => {
        child.on("close", (code) => resolve(code));
      });
      const rpc = (msg: unknown) => `${JSON.stringify(msg)}\n`;
      child.stdin!.write(rpc({ jsonrpc: "2.0", id: 1, method: "initialize" }));
      child.stdin!.write(
        rpc({ jsonrpc: "2.0", method: "notifications/initialized" }),
      );
      child.stdin!.write(rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }));
      child.stdin!.end();
      const code = await closed;

      assert.equal(
        code,
        0,
        `server exited with ${code} from the bare bundle copy — stderr: ${err}`,
      );
      assert.ok(
        !err.includes("MODULE_NOT_FOUND"),
        `the launched server must resolve every import inside the bundle — stderr: ${err}`,
      );

      const lines = out
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      assert.equal(
        lines.length,
        2,
        `expected 2 replies (initialize, tools/list), got: ${lines.join(" | ")}`,
      );
      const init = JSON.parse(lines[0]!) as {
        id: number;
        result: {
          protocolVersion: string;
          serverInfo: { name: string };
        };
      };
      assert.equal(init.id, 1);
      assert.equal(init.result.protocolVersion, "2024-11-05");
      assert.equal(init.result.serverInfo.name, "openspec");
      const list = JSON.parse(lines[1]!) as {
        id: number;
        result: { tools: Array<{ name: string }> };
      };
      assert.equal(list.id, 2);
      assert.equal(list.result.tools.length, 1);
      assert.equal(list.result.tools[0]!.name, "openspec_validate");
    } finally {
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });
});

describe("core never imports codex", () => {
  it("no core/*.ts import references codex/, opencode/, or plugins/", () => {
    const coreDir = join(repoRoot, "core");
    const files = readdirSync(coreDir)
      .filter((f) => f.endsWith(".ts"))
      .sort();
    assert.ok(files.length > 0, "core/*.ts files found");
    for (const file of files) {
      const src = readFileSync(join(coreDir, file), "utf-8");
      for (const specifier of collectImportSpecifiers(src)) {
        assert.ok(
          !/(^|[/])(codex|opencode|plugins)\//.test(specifier),
          `core/${file}: import "${specifier}" must not reference codex/, opencode/, or plugins/ — core/ stays host-agnostic`,
        );
      }
    }
  });
});

describe("bundle versions mirror package.json", () => {
  it("plugin.json version and every role TOML marker carry the package.json version", () => {
    assertCommittedBundleExists();
    const version = readPkg().version;

    const plugin = JSON.parse(
      readFileSync(
        join(committedBundle, ".codex-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as Record<string, unknown>;
    assert.equal(
      plugin.version,
      version,
      "plugin.json version must mirror package.json",
    );
    assert.deepEqual(
      Object.keys(plugin).sort(),
      [...PERMITTED_PLUGIN_FIELDS].sort(),
      "plugin.json carries exactly the spec-permitted fields — no commands/agents/apps/interface/hooks",
    );

    const agentsDir = join(committedBundle, "assets", "agents");
    const tomls = readdirSync(agentsDir)
      .filter((f) => f.endsWith(".toml"))
      .sort();
    assert.equal(tomls.length, 7, "exactly seven role TOMLs");
    const marker = `# managed-by: oh-my-openspec@${version}`;
    for (const file of tomls) {
      const firstLine =
        readFileSync(join(agentsDir, file), "utf-8").split("\n")[0] ?? "";
      assert.equal(
        firstLine,
        marker,
        `assets/agents/${file}: managed-by marker must carry the package.json version`,
      );
    }
  });
});

describe("OpenCode gates stay green (automated half)", () => {
  it("package.json keeps the OpenCode-only npm surface", () => {
    const pkg = readPkg();
    assert.equal(pkg.bin, undefined, "no bin entry");
    assert.deepEqual(
      pkg.files,
      [...PINNED_FILES_ARRAY],
      "files allow-list unchanged",
    );
    assert.equal(
      pkg.exports?.["."],
      "./opencode/index.ts",
      'exports["."] stays ./opencode/index.ts',
    );
  });
});
