// Manifest renderers for the Codex plugin bundle:
// .codex-plugin/plugin.json and .mcp.json, pinned field-for-field in
// design.md §1 and §4 of the add-codex-cli-support change. Both return
// `JSON.stringify(value, null, 2) + "\n"` so a render is byte-stable.
// The plugin manifest carries no `commands`, `agents`, `apps`, or
// `hooks` fields — roles install as TOMLs, and no hooks ship (§5). Its
// `interface` contains the Codex listing metadata. `.mcp.json` declares the
// proven launch form (design.md §4 matrix, form #3): `"cwd": "./"` —
// plugin-root-relative, so node resolves the relative `args` entry
// against the plugin root, not the session project directory (the
// no-`cwd` form dies with MODULE_NOT_FOUND on 0.163.0). There is no
// `renderHooksJson` — hooks were descoped (§5).

/** The .codex-plugin/plugin.json document (design.md §1). */
export interface PluginManifest {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: { readonly name: string; readonly url: string };
  readonly homepage: string;
  readonly repository: string;
  readonly license: string;
  readonly keywords: readonly string[];
  readonly skills: string;
  readonly mcpServers: string;
  readonly interface: PluginInterface;
}

/** Codex plugin listing metadata, including its composer icon path. */
export interface PluginInterface {
  readonly displayName: string;
  readonly shortDescription: string;
  readonly longDescription: string;
  readonly developerName: string;
  readonly category: string;
  readonly capabilities: readonly string[];
  readonly logo: string;
  readonly composerIcon: string;
}

/**
 * Render .codex-plugin/plugin.json. `pkgVersion` is the package.json
 * version read once per render — the mirror invariant: the manifest
 * version and the role TOML `# managed-by:` markers share one source
 * and can never diverge.
 */
export function renderPluginJson(pkgVersion: string): string {
  const manifest: PluginManifest = {
    name: "oh-my-openspec",
    version: pkgVersion,
    description:
      "OpenSpec multi-agent flow for Codex CLI: $omos-init / $omos-plan / $omos-apply / $omos-retro with seven role subagents and a mechanical openspec_validate MCP gate",
    author: { name: "Alexeyco", url: "https://github.com/alexeyco" },
    homepage: "https://github.com/alexeyco/oh-my-openspec",
    repository: "https://github.com/alexeyco/oh-my-openspec",
    license: "MIT",
    keywords: [
      "codex",
      "codex-plugin",
      "openspec",
      "spec-driven-development",
      "workflow",
      "subagents",
    ],
    skills: "./skills/",
    mcpServers: "./.mcp.json",
    interface: {
      displayName: "oh-my-openspec",
      shortDescription:
        "Plan, implement, and verify OpenSpec changes with role-based agents",
      longDescription:
        "Plan, implement, verify, and archive OpenSpec changes with seven role-based agents, parallel implementation waves, and mechanical OpenSpec validation.",
      developerName: "Alexeyco",
      category: "Developer Tools",
      capabilities: [
        "Plan OpenSpec changes",
        "Implement OpenSpec tasks",
        "Validate OpenSpec artifacts",
      ],
      logo: "./assets/icon.svg",
      composerIcon: "./assets/icon.svg",
    },
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/** One stdio MCP server entry in .mcp.json (design.md §4). */
export interface McpServerEntry {
  readonly type: string;
  readonly title: string;
  readonly description: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

/** The .mcp.json document: the single bundled `openspec` server. */
export interface McpManifest {
  readonly mcpServers: { readonly openspec: McpServerEntry };
}

/**
 * Render .mcp.json (design.md §4) — server `openspec` in the proven
 * launch form: `"type": "stdio"`, `command: "node"`, `args:
 * ["./assets/mcp-server.mjs"]`, `"cwd": "./"`. With the only working
 * launch form the server process runs at the plugin root, so
 * validation targets arrive as the tool's `cwd` argument — the session
 * project directory is passed by callers, not inherited from cwd.
 */
export function renderMcpJson(): string {
  const manifest: McpManifest = {
    mcpServers: {
      openspec: {
        type: "stdio",
        title: "OpenSpec validate",
        description:
          "Mechanical OpenSpec artifact validation gate (openspec_validate).",
        command: "node",
        args: ["./assets/mcp-server.mjs"],
        cwd: "./",
      },
    },
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
