// Tests for codex/mcp-server.mjs — the Codex-side openspec_validate MCP
// server. handleMessage is exercised in-process with deps.validate
// stubbed (no CLI, no stdio); report formatting itself is covered by
// tests/openspec.test.ts. The `cwd` tool argument (the launch-form
// consequence, design.md §4) is pinned at the stub level: tools/call
// routes it to deps.validate, and the process.cwd() default for an
// absent cwd lives in main()'s wiring — pinned by the source anchor in
// the "main() wiring" describe. One subprocess smoke test covers the
// real newline-delimited stdio loop with initialize/tools/list only —
// it never invokes the CLI.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// The OpenCode registration pinned here so the MCP tool cannot drift:
// the description sentences and the change property description must
// stay verbatim copies of opencode/index.ts:229-237.
const TOOL_DESCRIPTION_SENTENCES = [
  "Validate OpenSpec artifacts by running the openspec CLI.",
  "Returns VALID ... / INVALID ...: with numbered issues, or",
  "UNAVAILABLE with an install offer when the CLI is missing.",
  "Without a change id, validates every change and spec in the project.",
];

const CHANGE_PROPERTY_DESCRIPTION =
  "Change id to validate (default: validate all changes and specs)";

// The Codex-only schema addition (design.md §4): the OpenCode tool's
// schema stays `{change?}`. Pinned here so the advertised default
// cannot drift from main()'s process.cwd() fallback.
const CWD_PROPERTY_DESCRIPTION =
  "Absolute project directory to validate (default: the server working directory).";

const TOOL_DESCRIPTION = TOOL_DESCRIPTION_SENTENCES.join(" ");

const INPUT_SCHEMA = {
  type: "object",
  properties: {
    change: {
      type: "string",
      description: CHANGE_PROPERTY_DESCRIPTION,
    },
    cwd: {
      type: "string",
      description: CWD_PROPERTY_DESCRIPTION,
    },
  },
};

// The exact report core/openspec.ts:160-162 produces when the openspec
// binary is missing from PATH (ENOENT stderr from core/openspec.ts:37).
const UNAVAILABLE_REPORT =
  "UNAVAILABLE: openspec CLI not found in PATH — the flow will offer to " +
  "install it (npm install -g @fission-ai/openspec, or brew install openspec)";

interface ValidateDeps {
  validate: (change?: string, cwd?: string) => Promise<string>;
}

// One recorded deps.validate invocation: what tools/call routed
// through, per the scenario's "the stub receives the passed cwd".
interface ValidateCall {
  change: string | undefined;
  cwd: string | undefined;
}

interface JsonRpcError {
  code: number;
  message: string;
}

interface JsonRpcReply {
  jsonrpc: string;
  id: number | string | null;
  result?: unknown;
  error?: JsonRpcError;
}

// The server is a plain .mjs and allowJs stays off by design, so the
// import specifier is assembled at runtime and the module is typed by
// the interfaces above — the typed contract this file is responsible
// for pinning. A literal specifier would have no declarations to
// resolve against (the .mjs deliberately stays outside tsconfig).
const { handleMessage } = (await import(
  new URL("../codex/mcp-server.mjs", import.meta.url).href
)) as {
  handleMessage: (
    msg: unknown,
    deps: ValidateDeps,
  ) => Promise<JsonRpcReply | null>;
};

function request(
  id: number | string,
  method: string,
  params?: unknown,
): Record<string, unknown> {
  const msg: Record<string, unknown> = { jsonrpc: "2.0", id, method };
  if (params !== undefined) {
    msg.params = params;
  }
  return msg;
}

function stubValidate(report: string): ValidateDeps & {
  calls: ValidateCall[];
} {
  const calls: ValidateCall[] = [];
  return {
    calls,
    validate: async (change?: string, cwd?: string): Promise<string> => {
      calls.push({ change, cwd });
      return report;
    },
  };
}

function resultOf(reply: JsonRpcReply | null): Record<string, unknown> {
  assert.ok(reply !== null, "expected a reply envelope");
  assert.ok(reply.result !== undefined, "expected a result envelope");
  return reply.result as Record<string, unknown>;
}

function textOf(reply: JsonRpcReply | null): string {
  const result = resultOf(reply);
  assert.deepEqual(Object.keys(result).sort(), ["content", "isError"]);
  const content = result.content as Array<{ type: string; text: string }>;
  assert.equal(content.length, 1);
  assert.equal(content[0]!.type, "text");
  return content[0]!.text;
}

describe("handleMessage: initialize", () => {
  it("answers protocolVersion 2024-11-05 and serverInfo openspec", async () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { version: string };
    const reply = await handleMessage(
      request(1, "initialize"),
      stubValidate("VALID: stub"),
    );
    assert.deepEqual(reply, {
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "openspec", version: pkg.version },
      },
    });
  });

  it("stays silent for notifications/initialized", async () => {
    const reply = await handleMessage(
      { jsonrpc: "2.0", method: "notifications/initialized" },
      stubValidate("VALID: stub"),
    );
    assert.equal(reply, null);
  });
});

describe("handleMessage: tools/list", () => {
  it("Tool list exposes the openspec_validate tool", async () => {
    const reply = await handleMessage(
      request("list-1", "tools/list"),
      stubValidate("VALID: stub"),
    );
    const result = resultOf(reply);
    assert.deepEqual(Object.keys(result), ["tools"]);
    const tools = result.tools as Array<Record<string, unknown>>;
    assert.equal(tools.length, 1);
    const tool = tools[0]!;

    // Property-for-property against the OpenCode registration, adding
    // only the optional cwd string property.
    const schema = tool.inputSchema as Record<string, unknown>;
    assert.deepEqual(Object.keys(schema), ["type", "properties"]);
    assert.equal(schema.type, "object");
    const properties = schema.properties as Record<string, unknown>;
    assert.deepEqual(Object.keys(properties), ["change", "cwd"]);
    assert.deepEqual(properties.change, {
      type: "string",
      description: CHANGE_PROPERTY_DESCRIPTION,
    });
    assert.deepEqual(properties.cwd, {
      type: "string",
      description: CWD_PROPERTY_DESCRIPTION,
    });
    assert.equal(schema.required, undefined); // both properties optional

    assert.deepEqual(tool, {
      name: "openspec_validate",
      description: TOOL_DESCRIPTION,
      inputSchema: INPUT_SCHEMA,
    });
  });

  it("is anchored to the OpenCode tool registration", () => {
    const source = readFileSync(
      new URL("../opencode/index.ts", import.meta.url),
      "utf8",
    );
    for (const sentence of TOOL_DESCRIPTION_SENTENCES) {
      assert.ok(
        source.includes(sentence),
        `opencode/index.ts no longer carries: ${sentence}`,
      );
    }
    assert.ok(source.includes(CHANGE_PROPERTY_DESCRIPTION));
  });
});

describe("handleMessage: tools/call", () => {
  it("Tool call returns the one-look report", async () => {
    const stub = stubValidate("VALID: 1 item(s) passed");
    const reply = await handleMessage(
      request(7, "tools/call", {
        name: "openspec_validate",
        arguments: { change: "add-dark-mode", cwd: "/tmp/scratch-repo" },
      }),
      stub,
    );
    assert.deepEqual(reply, {
      jsonrpc: "2.0",
      id: 7,
      result: {
        content: [{ type: "text", text: "VALID: 1 item(s) passed" }],
        isError: false,
      },
    });
    // The stub receives the passed cwd — the launch-form consequence:
    // the report must be about the caller's project, not the plugin
    // cache the server process runs in.
    assert.deepEqual(stub.calls, [
      { change: "add-dark-mode", cwd: "/tmp/scratch-repo" },
    ]);
  });

  it("returns the stub's INVALID report as text content without throwing", async () => {
    const invalid =
      "INVALID: 1 of 2 item(s) failed\n" +
      "1. [change add-dark-mode] ERROR file: Change must have at least one delta.";
    const stub = stubValidate(invalid);
    const reply = await handleMessage(
      request(8, "tools/call", {
        name: "openspec_validate",
        arguments: { change: "add-dark-mode", cwd: "/tmp/scratch-repo" },
      }),
      stub,
    );
    assert.equal(reply?.error, undefined);
    assert.equal(textOf(reply), invalid);
    assert.equal((resultOf(reply) as { isError: boolean }).isError, false);
    assert.deepEqual(stub.calls, [
      { change: "add-dark-mode", cwd: "/tmp/scratch-repo" },
    ]);
  });

  it("Missing CLI surfaces as UNAVAILABLE", async () => {
    const stub = stubValidate(UNAVAILABLE_REPORT);
    const reply = await handleMessage(
      request(9, "tools/call", {
        name: "openspec_validate",
        arguments: { change: "add-dark-mode", cwd: "/tmp/scratch-repo" },
      }),
      stub,
    );
    const text = textOf(reply);
    assert.ok(text.startsWith("UNAVAILABLE:"));
    assert.match(text, /npm install -g @fission-ai\/openspec/);
    assert.equal((resultOf(reply) as { isError: boolean }).isError, false);
    assert.deepEqual(stub.calls, [
      { change: "add-dark-mode", cwd: "/tmp/scratch-repo" },
    ]);
  });

  it("anchors the UNAVAILABLE stub to core's formatting", () => {
    const source = readFileSync(
      new URL("../core/openspec.ts", import.meta.url),
      "utf8",
    );
    assert.ok(source.includes("UNAVAILABLE: ${result.stderr}"));
    assert.ok(source.includes("openspec CLI not found in PATH"));
  });

  it("forwards a missing change as undefined (validate all)", async () => {
    const stub = stubValidate("VALID: 3 item(s) passed");
    await handleMessage(
      request(10, "tools/call", { name: "openspec_validate", arguments: {} }),
      stub,
    );
    await handleMessage(
      request(11, "tools/call", { name: "openspec_validate" }),
      stub,
    );
    assert.deepEqual(stub.calls, [
      { change: undefined, cwd: undefined },
      { change: undefined, cwd: undefined },
    ]);
  });

  it("forwards an absent cwd as undefined (main() then applies process.cwd())", async () => {
    const stub = stubValidate("VALID: stub");
    await handleMessage(
      request(12, "tools/call", {
        name: "openspec_validate",
        arguments: { change: "add-dark-mode" },
      }),
      stub,
    );
    // Unit level: the absent cwd reaches deps.validate as undefined;
    // the cwd ?? process.cwd() substitution itself is main()'s wiring,
    // pinned by the source anchor in the "main() wiring" describe.
    assert.deepEqual(stub.calls, [{ change: "add-dark-mode", cwd: undefined }]);
  });

  it("trims padded change and cwd arguments, empty cwd → undefined", async () => {
    const stub = stubValidate("VALID: stub");
    await handleMessage(
      request(13, "tools/call", {
        name: "openspec_validate",
        arguments: { change: "  add-dark-mode  ", cwd: "  /tmp/scratch  " },
      }),
      stub,
    );
    await handleMessage(
      request(14, "tools/call", {
        name: "openspec_validate",
        arguments: { change: "add-dark-mode", cwd: "   " },
      }),
      stub,
    );
    assert.deepEqual(stub.calls, [
      { change: "add-dark-mode", cwd: "/tmp/scratch" },
      { change: "add-dark-mode", cwd: undefined },
    ]);
  });
});

describe("handleMessage: protocol-level errors", () => {
  it("answers -32601 for an unknown method", async () => {
    const reply = await handleMessage(
      request(20, "resources/list"),
      stubValidate("VALID: stub"),
    );
    assert.deepEqual(reply?.error, {
      code: -32601,
      message: "Method not found: resources/list",
    });
  });

  it("answers -32602 for an unknown tool name", async () => {
    const reply = await handleMessage(
      request(21, "tools/call", { name: "no-such-tool", arguments: {} }),
      stubValidate("VALID: stub"),
    );
    assert.equal(reply?.error?.code, -32602);
    assert.match(reply?.error?.message ?? "", /unknown tool: no-such-tool/);
  });

  it("answers -32602 for a non-string change argument", async () => {
    const reply = await handleMessage(
      request(22, "tools/call", {
        name: "openspec_validate",
        arguments: { change: 42 },
      }),
      stubValidate("VALID: stub"),
    );
    assert.equal(reply?.error?.code, -32602);
    assert.equal(reply?.result, undefined);
  });

  it("answers -32602 for a non-string cwd argument", async () => {
    const stub = stubValidate("VALID: stub");
    const reply = await handleMessage(
      request(23, "tools/call", {
        name: "openspec_validate",
        arguments: { change: "add-dark-mode", cwd: 42 },
      }),
      stub,
    );
    assert.equal(reply?.error?.code, -32602);
    assert.equal(reply?.result, undefined);
    assert.deepEqual(stub.calls, []); // validation never runs on bad params
  });
});

describe("main() wiring", () => {
  it("is the pure (change, cwd) => validateProject(cwd ?? process.cwd(), change) fallback", () => {
    // main() hardwires its deps (not injectable by design), so the
    // process.cwd() default for an absent cwd — design.md §4: "absent →
    // `process.cwd()` fallback, the checkout/dev behaviour" — is pinned
    // by the wiring's source shape; the stub-level tests above pin what
    // tools/call routes through, and the subprocess smoke test keeps
    // the real stdio loop green.
    const source = readFileSync(
      new URL("../codex/mcp-server.mjs", import.meta.url),
      "utf8",
    );
    assert.ok(
      source.includes("validateProject(cwd ?? process.cwd(), change)"),
      "main() must wire deps.validate as " +
        "(change, cwd) => validateProject(cwd ?? process.cwd(), change)",
    );
  });
});

describe("stdio loop (subprocess smoke test)", () => {
  it("answers initialize and tools/list, staying silent on the notification", async () => {
    const serverPath = fileURLToPath(
      new URL("../codex/mcp-server.mjs", import.meta.url),
    );
    const child = spawn(process.execPath, [serverPath], {
      stdio: ["pipe", "pipe", "inherit"],
    });
    let out = "";
    child.stdout!.setEncoding("utf8");
    child.stdout!.on("data", (chunk: string) => {
      out += chunk;
    });
    const closed = new Promise<void>((resolve) => {
      child.on("close", () => resolve());
    });
    child.stdin!.write(`${JSON.stringify(request(1, "initialize"))}\n`);
    child.stdin!.write(
      `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
    );
    child.stdin!.write(`${JSON.stringify(request(2, "tools/list"))}\n`);
    child.stdin!.end();
    await closed;

    const lines = out
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    assert.equal(
      lines.length,
      2,
      `expected 2 replies, got: ${lines.join(" | ")}`,
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
  });
});
