// Tests for codex/toml.ts — multi-line basic string escaping and
// document shape. Scenario: "Hostile body content stays valid TOML" —
// values containing triple quotes, backslashes, and control characters
// must survive a TOML 1.0 parse and round-trip exactly. The parser
// below is the twin of the one in tests/codex-agents.test.ts.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  escapeTomlBasic,
  escapeTomlMultiline,
  renderTomlDoc,
} from "../codex/toml.ts";

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

describe("escapeTomlMultiline", () => {
  it("escapes backslashes", () => {
    assert.equal(escapeTomlMultiline("a\\b"), "a\\\\b");
    assert.equal(escapeTomlMultiline("a\\\\b"), "a\\\\\\\\b");
  });

  it("escapes every quote in runs of three or more, leaves shorter runs raw", () => {
    const escapedQuote = '\\"';
    assert.equal(escapeTomlMultiline('a"b'), 'a"b');
    assert.equal(escapeTomlMultiline('a""b'), 'a""b');
    assert.equal(escapeTomlMultiline('a"""b'), `a${escapedQuote.repeat(3)}b`);
    assert.equal(escapeTomlMultiline('a""""b'), `a${escapedQuote.repeat(4)}b`);
    assert.equal(escapeTomlMultiline('a"""""b'), `a${escapedQuote.repeat(5)}b`);
  });

  it("escapes control characters other than \\n and \\t", () => {
    assert.equal(escapeTomlMultiline("a\u0000b"), "a\\u0000b");
    assert.equal(escapeTomlMultiline("a\rb"), "a\\u000Db");
    assert.equal(escapeTomlMultiline("a\u000bb"), "a\\u000Bb");
    assert.equal(escapeTomlMultiline("a\u001fb"), "a\\u001Fb");
    assert.equal(escapeTomlMultiline("a\u007fb"), "a\\u007Fb");
    assert.equal(escapeTomlMultiline("a\n\tb"), "a\n\tb");
  });

  it("leaves no unescaped three-quote run in the escaped value", () => {
    const hostile = ['x"""y', 'x""""y', 'end with ""', '"""', '""', "plain"];
    for (const value of hostile) {
      const escaped = escapeTomlMultiline(value);
      assert.ok(!escaped.includes('"""'), JSON.stringify(escaped));
    }
  });
});

describe("escapeTomlBasic", () => {
  it("escapes quotes, backslashes, and control characters", () => {
    assert.equal(escapeTomlBasic("omos-planner"), "omos-planner");
    assert.equal(escapeTomlBasic('a"b'), 'a\\"b');
    assert.equal(escapeTomlBasic("a\\b"), "a\\\\b");
    assert.equal(escapeTomlBasic("nl\ntab\t"), "nl\\ntab\\t");
    assert.equal(escapeTomlBasic("a\u0000b"), "a\\u0000b");
  });
});

describe("renderTomlDoc", () => {
  it("emits key = triple-quote blocks with LF endings and a trailing newline", () => {
    assert.equal(
      renderTomlDoc([
        ["alpha", "one"],
        ["beta", "two"],
      ]),
      'alpha = """\none"""\nbeta = """\ntwo"""\n',
    );
  });

  it("rejects keys that are not bare TOML keys", () => {
    assert.throws(() => renderTomlDoc([["not a key", "v"]]), /not a bare key/);
    assert.throws(() => renderTomlDoc([["", "v"]]), /not a bare key/);
  });

  it("round-trips hostile values through a TOML parse", () => {
    const values = [
      'she said """ and """" and ended with "',
      'value ending with a pair ""',
      'a "quoted" word and a ""doubled"" one mid-value',
      "lone \\ backslash and a doubled \\\\ pair",
      "control \u0000\u0001\u000b\u000c and \r carriage",
      "raw \t tab and \n newline survive",
      "",
      "\n leading newline",
      "trailing newline\n",
      "\n",
    ];
    const fields: Array<[string, string]> = values.map((v, n) => [`k${n}`, v]);
    const doc = renderTomlDoc(fields);
    assert.ok(!doc.includes("\r"), "document must use LF endings only");
    assert.deepEqual(parseEmittedDoc(doc), fields);
  });
});
