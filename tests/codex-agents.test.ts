// Tests for codex/agents.ts — the seven real roles render with the
// shared SUBAGENT_CONTRACT baked in, verbatim and last, and every
// document starts with the provenance marker line. Scenarios:
// "Developer instructions end with the shared contract" and the
// agent-level half of "Hostile body content stays valid TOML". The
// parser below is the twin of the one in tests/codex-toml.test.ts.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadRoles, ROLE_IDS } from "../core/roles.ts";
import { SUBAGENT_CONTRACT } from "../core/prompts.ts";
import { renderAgentToml } from "../codex/agents.ts";

// Version passed to renderAgentToml in these tests — a fixed literal,
// so the marker assertions prove the argument is interpolated rather
// than accidentally matching package.json.
const PKG_VERSION = "9.9.9-test";
const MARKER_LINE = `# managed-by: oh-my-openspec@${PKG_VERSION}`;

// Minimal TOML 1.0 parser for exactly the subset this emitter
// produces: documents of `key = "value"` lines and
// `key = """\nvalue"""` blocks. It implements the rules that matter —
// escape sequences, the newline trimmed right after an opening
// delimiter, and a closing delimiter that may be preceded by up to two
// content quotes — so a clean round-trip is evidence of valid TOML.
function readBasicString(
  doc: string,
  start: number,
  multiline: boolean,
): { value: string; end: number } {
  let i = start;
  let value = "";
  if (multiline) {
    assert.equal(doc[i], "\n", 'parser: expected newline after opening """');
    i += 1;
  }
  while (true) {
    assert.ok(i < doc.length, "parser: unterminated basic string");
    const ch = doc[i]!;
    if (ch === "\\") {
      assert.ok(i + 1 < doc.length, "parser: dangling escape");
      const next = doc[i + 1]!;
      if (next === "\\") {
        value += "\\";
        i += 2;
      } else if (next === '"') {
        value += '"';
        i += 2;
      } else if (next === "n") {
        value += "\n";
        i += 2;
      } else if (next === "t") {
        value += "\t";
        i += 2;
      } else if (next === "u") {
        const hex = doc.slice(i + 2, i + 6);
        assert.match(hex, /^[0-9A-Fa-f]{4}$/, "parser: bad \\u escape");
        value += String.fromCharCode(Number.parseInt(hex, 16));
        i += 6;
      } else {
        assert.fail(`parser: unknown escape \\${next}`);
      }
    } else if (ch === '"') {
      if (!multiline) {
        return { value, end: i + 1 };
      }
      let run = 1;
      while (doc[i + run] === '"') {
        run += 1;
      }
      // The last three quotes of a run of 3+ close a multi-line basic
      // string; up to two before them are content. Shorter runs (1-2
      // quotes) are plain content (TOML 1.0).
      assert.ok(run <= 5, `parser: quote run of ${run} cannot terminate`);
      if (run >= 3) {
        value += '"'.repeat(run - 3);
        return { value, end: i + run };
      }
      value += '"'.repeat(run);
      i += run;
    } else {
      value += ch;
      i += 1;
    }
  }
}

function parseEmittedDoc(doc: string): Array<[string, string]> {
  const fields: Array<[string, string]> = [];
  let i = 0;
  while (i < doc.length) {
    const header = /([A-Za-z0-9_-]+) = /y;
    header.lastIndex = i;
    const match = header.exec(doc);
    assert.ok(match, `parser: expected "key = " at offset ${i}`);
    const key = match[1]!;
    i = header.lastIndex;
    assert.ok(doc[i] === '"', `parser: expected a quoted value for ${key}`);
    const multiline = doc.startsWith('"""\n', i);
    i += multiline ? 3 : 1;
    const { value, end } = readBasicString(doc, i, multiline);
    i = end;
    assert.equal(doc[i], "\n", `parser: expected LF after the value for ${key}`);
    i += 1;
    fields.push([key, value]);
  }
  return fields;
}

describe("renderAgentToml over the seven real roles", () => {
  const roles = loadRoles(join(import.meta.dirname, "..", "agents"));

  it("loads exactly the seven real roles", () => {
    assert.deepEqual(
      roles.map((r) => r.id),
      [...ROLE_IDS].sort(),
    );
  });

  it("developer instructions end with the shared contract", () => {
    assert.equal(roles.length, 7);
    for (const role of roles) {
      const doc = renderAgentToml(role, SUBAGENT_CONTRACT, PKG_VERSION);

      assert.ok(
        doc.startsWith(`${MARKER_LINE}\n`),
        `provenance marker as the exact first line for ${role.id}`,
      );
      assert.ok(!doc.includes("\r"), `LF endings only for ${role.id}`);

      const body = doc.slice(MARKER_LINE.length + 1);
      assert.ok(
        body.startsWith(`name = "${role.id}"\n`),
        `name line for ${role.id}`,
      );

      const fields = parseEmittedDoc(body);
      assert.deepEqual(
        fields.map((f) => f[0]),
        ["name", "description", "developer_instructions"],
        `exactly three keys for ${role.id}`,
      );
      assert.ok(!/^model = /m.test(doc), `no model key for ${role.id}`);

      const byKey = new Map(fields);
      assert.equal(byKey.get("name"), role.id, `name for ${role.id}`);
      assert.equal(
        byKey.get("description"),
        role.description,
        `description for ${role.id}`,
      );

      const instructions = byKey.get("developer_instructions");
      const expected = `${role.body.trim()}\n\n${SUBAGENT_CONTRACT}`;
      assert.equal(
        instructions,
        expected,
        `developer_instructions for ${role.id}`,
      );
      assert.ok(
        instructions?.endsWith(SUBAGENT_CONTRACT),
        `contract must be the verbatim suffix for ${role.id}`,
      );
    }
  });
});

describe("renderAgentToml with hostile body content", () => {
  it("keeps exactly the three keys and round-trips hostile values", () => {
    const dir = mkdtempSync(join(tmpdir(), "o-omos-codex-agents-"));
    try {
      writeFileSync(
        join(dir, "omos-hostile.md"),
        [
          "---",
          'description: "Hostile \\"\\"\\" description"',
          "mode: subagent",
          "---",
          "",
          'Body with """ triple quotes, a lone \\ backslash,',
          "and a \u0001 control character.",
          "",
        ].join("\n"),
        "utf-8",
      );
      const roles = loadRoles(dir);
      assert.equal(roles.length, 1);
      const role = roles[0]!;

      const doc = renderAgentToml(role, "CONTRACT TEXT", PKG_VERSION);
      assert.ok(
        doc.startsWith(`${MARKER_LINE}\n`),
        "provenance marker as the exact first line",
      );
      const fields = parseEmittedDoc(doc.slice(MARKER_LINE.length + 1));
      assert.deepEqual(
        fields.map((f) => f[0]),
        ["name", "description", "developer_instructions"],
      );

      const byKey = new Map(fields);
      assert.equal(byKey.get("name"), "omos-hostile");
      assert.equal(byKey.get("description"), 'Hostile """ description');
      assert.equal(
        byKey.get("developer_instructions"),
        'Body with """ triple quotes, a lone \\ backslash,\nand a \u0001 control character.\n\nCONTRACT TEXT',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
