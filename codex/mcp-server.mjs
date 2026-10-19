// MCP stdio server exposing openspec_validate to Codex hosts.
//
// Hand-rolled newline-delimited JSON-RPC 2.0 over stdin/stdout — zero
// npm dependencies, the same runtime rule core/ follows. Validation
// itself delegates to core/openspec.ts::validateProject, so the one-look
// VALID/INVALID/UNAVAILABLE/ERROR report is identical to the OpenCode
// tool (opencode/index.ts:215-246). The bundle renderer copies this file
// to assets/mcp-server.mjs, rewriting the single import specifier to
// "./openspec-core.ts" — a verbatim copy of core/openspec.ts shipped as
// a sibling in the bundle, so the server stays self-contained inside the
// plugin cache.
//
// The Codex-only optional `cwd` tool argument is the launch-form
// consequence (design.md §4): the only working .mcp.json launch form
// runs this server with its working directory at the plugin cache, so
// callers pass the absolute project directory explicitly; an absent
// `cwd` falls back to process.cwd() in main() — the checkout/dev
// behaviour.

import { readFileSync, realpathSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { validateProject } from "../core/openspec.ts";

const PROTOCOL_VERSION = "2024-11-05";

// The one tool this server exposes. Description and the `change`
// property are copied verbatim from the OpenCode registration
// (opencode/index.ts:229-237) so both hosts advertise the identical
// contract; the optional `cwd` property is the Codex-only addition —
// the OpenCode tool schema stays `{change?}` (design.md §4).
const VALIDATE_TOOL = {
  name: "openspec_validate",
  description: [
    "Validate OpenSpec artifacts by running the openspec CLI.",
    "Returns VALID ... / INVALID ...: with numbered issues, or",
    "UNAVAILABLE with an install offer when the CLI is missing.",
    "Without a change id, validates every change and spec in the project.",
  ].join(" "),
  inputSchema: {
    type: "object",
    properties: {
      change: {
        type: "string",
        description:
          "Change id to validate (default: validate all changes and specs)",
      },
      cwd: {
        type: "string",
        description:
          "Absolute project directory to validate (default: the server working directory).",
      },
    },
  },
};

// serverInfo.version for initialize: this file sits at codex/ in a
// checkout (resolves ../package.json) and at
// plugins/oh-my-openspec/assets/ in the rendered bundle (resolves
// ../../../package.json); in the installed plugin cache neither probe
// path finds a package.json, so version is legitimately "unknown"
// there. Informational field for MCP clients, not pinned by spec.
function readServerVersion() {
  for (const relative of ["../package.json", "../../../package.json"]) {
    try {
      const pkg = JSON.parse(
        readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8"),
      );
      if (typeof pkg.version === "string") {
        return pkg.version;
      }
    } catch {
      // Not this layout — try the next candidate.
    }
  }
  return "unknown";
}

const SERVER_VERSION = readServerVersion();

function response(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function errorResponse(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

// Pure JSON-RPC 2.0 handler: `deps.validate(changeId?, cwd?) →
// Promise<string>` is injected so tests never touch the CLI. Returns the
// full response envelope, or null for notifications (no reply).
// Validation outcomes — VALID, INVALID, UNAVAILABLE, ERROR — always come
// back as tool content; JSON-RPC errors are reserved for protocol-level
// failures (unknown method → -32601, unknown tool or bad params →
// -32602).
export async function handleMessage(msg, deps) {
  if (msg === null || typeof msg !== "object" || Array.isArray(msg)) {
    return errorResponse(
      null,
      -32600,
      "Invalid Request: message must be an object",
    );
  }
  const id = msg.id ?? null;
  if (typeof msg.method !== "string" || msg.method.length === 0) {
    return errorResponse(id, -32600, "Invalid Request: missing method");
  }
  switch (msg.method) {
    case "initialize":
      return response(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "openspec", version: SERVER_VERSION },
      });
    case "notifications/initialized":
      return null;
    case "tools/list":
      return response(id, { tools: [VALIDATE_TOOL] });
    case "tools/call":
      return callValidateTool(msg, id, deps);
    default:
      return errorResponse(id, -32601, `Method not found: ${msg.method}`);
  }
}

async function callValidateTool(msg, id, deps) {
  const params = msg.params;
  if (params === null || typeof params !== "object" || Array.isArray(params)) {
    return errorResponse(
      id,
      -32602,
      "Invalid params: params must be an object",
    );
  }
  if (typeof params.name !== "string" || params.name.length === 0) {
    return errorResponse(
      id,
      -32602,
      "Invalid params: tools/call requires a tool name",
    );
  }
  if (params.name !== VALIDATE_TOOL.name) {
    return errorResponse(
      id,
      -32602,
      `Invalid params: unknown tool: ${params.name}`,
    );
  }
  const args = params.arguments;
  if (
    args !== undefined &&
    (args === null || typeof args !== "object" || Array.isArray(args))
  ) {
    return errorResponse(
      id,
      -32602,
      "Invalid params: arguments must be an object",
    );
  }
  const change = args === undefined ? undefined : args.change;
  if (change !== undefined && typeof change !== "string") {
    return errorResponse(id, -32602, "Invalid params: change must be a string");
  }
  const cwd = args === undefined ? undefined : args.cwd;
  if (cwd !== undefined && typeof cwd !== "string") {
    return errorResponse(id, -32602, "Invalid params: cwd must be a string");
  }
  // Same normalization as the OpenCode tool: trim, empty → all changes.
  // `cwd` gets the same discipline: trim, empty → undefined, so main()'s
  // `cwd ?? process.cwd()` fallback applies.
  const report = await deps.validate(
    change?.trim() || undefined,
    cwd?.trim() || undefined,
  );
  return response(id, {
    content: [{ type: "text", text: report }],
    isError: false,
  });
}

function writeMessage(reply) {
  process.stdout.write(`${JSON.stringify(reply)}\n`);
}

// The stdio loop: one JSON-RPC message per line, one reply per line.
// Resolves when the host closes stdin.
export function main() {
  const deps = {
    validate: (change, cwd) => validateProject(cwd ?? process.cwd(), change),
  };
  const lines = createInterface({ input: process.stdin });
  lines.on("line", (line) => {
    const text = line.trim();
    if (!text) {
      return; // Blank line — nothing to answer.
    }
    let msg;
    try {
      msg = JSON.parse(text);
    } catch {
      writeMessage(errorResponse(null, -32700, "Parse error: not valid JSON"));
      return;
    }
    handleMessage(msg, deps)
      .then((reply) => {
        if (reply !== null) {
          writeMessage(reply);
        }
      })
      .catch((err) => {
        writeMessage(
          errorResponse(msg.id ?? null, -32603, `Internal error: ${err}`),
        );
      });
  });
  return new Promise((resolve) => {
    lines.on("close", resolve);
  });
}

// Run the stdio loop only when executed directly, so importing this
// module (unit tests, the renderer) never touches stdin.
if (process.argv[1]) {
  try {
    if (realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
      main().catch((err) => {
        process.stderr.write(`openspec mcp-server: fatal: ${err}\n`);
        process.exit(1);
      });
    }
  } catch {
    // argv[1] not readable — this module was imported, not executed.
  }
}
