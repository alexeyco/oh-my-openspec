// Tests for core/markdown.ts — frontmatter parse and asset validation.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseMarkdown,
  validateRoleDoc,
  validateSkillDoc,
  vendoredGeneratedBy,
} from "../core/markdown.ts";

describe("parseMarkdown", () => {
  it("splits frontmatter and body", () => {
    const { frontmatter, body } = parseMarkdown<{ name: string }>(
      "---\nname: demo\n---\nBody text\n",
    );
    assert.equal(frontmatter.name, "demo");
    assert.equal(body, "Body text\n");
  });

  it("accepts CRLF frontmatter", () => {
    const { frontmatter } = parseMarkdown<{ a: number }>(
      "---\r\na: 1\r\n---\r\nbody",
    );
    assert.equal(frontmatter.a, 1);
  });

  it("throws without frontmatter", () => {
    assert.throws(() => parseMarkdown("no fm here"), /missing or invalid/);
  });

  it("throws on malformed YAML", () => {
    assert.throws(
      () => parseMarkdown("---\nkey: [unclosed\n---\nbody"),
      /failed to parse frontmatter YAML/,
    );
  });

  it("throws when frontmatter is not an object", () => {
    assert.throws(() => parseMarkdown("---\n- a\n- b\n---\nbody"), /object/);
  });
});

describe("validateRoleDoc", () => {
  const base = { description: "Does a thing.", mode: "subagent" };

  it("accepts a minimal role", () => {
    assert.deepEqual(validateRoleDoc(base), base);
  });

  it("rejects color — subagents ship no colors", () => {
    assert.throws(
      () => validateRoleDoc({ ...base, color: "#38bdf8" }),
      /'color' is not allowed/,
    );
  });

  it("rejects missing description", () => {
    assert.throws(
      () => validateRoleDoc({ mode: "subagent" }),
      /missing string 'description'/,
    );
  });

  it("rejects mode other than subagent", () => {
    assert.throws(
      () => validateRoleDoc({ ...base, mode: "primary" }),
      /must be "subagent"/,
    );
  });

  it("rejects model pins", () => {
    assert.throws(
      () => validateRoleDoc({ ...base, model: "anthropic/claude" }),
      /inherit the session model/,
    );
  });
});

describe("validateSkillDoc", () => {
  it("accepts name + description", () => {
    assert.deepEqual(validateSkillDoc({ name: "a", description: "b" }), {
      name: "a",
      description: "b",
    });
  });

  it("ignores extra keys (vendored skills carry metadata)", () => {
    const doc = validateSkillDoc({
      name: "a",
      description: "b",
      license: "MIT",
      metadata: { generatedBy: "1.14.2" },
    });
    assert.equal(doc.name, "a");
  });

  it("rejects missing name or description", () => {
    assert.throws(() => validateSkillDoc({ description: "b" }), /'name'/);
    assert.throws(() => validateSkillDoc({ name: "a" }), /'description'/);
  });
});

describe("vendoredGeneratedBy", () => {
  it("extracts metadata.generatedBy", () => {
    assert.equal(
      vendoredGeneratedBy({ metadata: { generatedBy: "1.14.2" } }),
      "1.14.2",
    );
  });

  it("returns undefined when absent", () => {
    assert.equal(vendoredGeneratedBy({ name: "a" }), undefined);
    assert.equal(vendoredGeneratedBy({ metadata: "junk" }), undefined);
    assert.equal(vendoredGeneratedBy(null), undefined);
  });
});
