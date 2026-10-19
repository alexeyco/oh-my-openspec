// Minimal TOML emitter for the Codex plugin bundle. Emits exactly the
// subset this plugin needs — basic strings and multi-line basic
// strings — with zero new dependencies. Parsing stays with Codex.

const BARE_KEY_RE = /^[A-Za-z0-9_-]+$/;

// Control characters TOML forbids unescaped in basic strings: the C0
// range except \n and \t (both allowed raw in multi-line strings), plus
// DEL.
function isForbiddenControl(code: number): boolean {
  if (code <= 0x1f && code !== 0x0a && code !== 0x09) {
    return true;
  }
  return code === 0x7f;
}

function escapeControlCode(code: number): string {
  return "\\u" + code.toString(16).toUpperCase().padStart(4, "0");
}

// Escape a value for a TOML multi-line basic string ("""..."""):
// - backslash -> \\
// - every quote in a run of three or more -> \"
// - control characters other than \n/\t -> \uXXXX
// Runs of one or two quotes stay raw: TOML allows them inside
// multi-line basic strings, including right before the closing
// delimiter (it may be preceded by up to two quotes).
export function escapeTomlMultiline(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    if (ch === "\\") {
      out += "\\\\";
      i += 1;
    } else if (ch === '"') {
      let run = 0;
      while (s[i + run] === '"') {
        run += 1;
      }
      const quote = run >= 3 ? '\\"' : '"';
      out += quote.repeat(run);
      i += run;
    } else if (isForbiddenControl(ch.charCodeAt(0))) {
      out += escapeControlCode(ch.charCodeAt(0));
      i += 1;
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
}

// Escape a value for a TOML basic string ("..."): backslash, quote,
// and all control characters — \n and \t included, because a
// single-line string cannot carry them raw.
export function escapeTomlBasic(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (ch === "\\") {
      out += "\\\\";
    } else if (ch === '"') {
      out += '\\"';
    } else if (ch === "\n") {
      out += "\\n";
    } else if (ch === "\t") {
      out += "\\t";
    } else if (isForbiddenControl(code)) {
      out += escapeControlCode(code);
    } else {
      out += ch;
    }
  }
  return out;
}

// Render a TOML document of multi-line basic string blocks: each field
// becomes `key = """\n<escaped>"""` followed by a newline. LF line
// endings only, one trailing newline at the end of the document. Keys
// must be bare TOML keys (letters, digits, `_`, `-`).
export function renderTomlDoc(fields: [string, string][]): string {
  let out = "";
  for (const [key, value] of fields) {
    if (!BARE_KEY_RE.test(key)) {
      throw new Error(`toml: not a bare key: ${JSON.stringify(key)}`);
    }
    out += `${key} = """\n${escapeTomlMultiline(value)}"""\n`;
  }
  return out;
}
