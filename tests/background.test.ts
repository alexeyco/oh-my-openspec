// Tests for opencode/background.ts — forceBackgroundEvent pure helper.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { forceBackgroundEvent } from "../opencode/background.ts";

const ROLES = new Set(["omos-implementer", "omos-verifier"]);

describe("forceBackgroundEvent", () => {
  it("forces background for a matching role on subagent dispatch", () => {
    const out = forceBackgroundEvent(
      "subagent",
      { agent: "omos-implementer", prompt: "p" },
      ROLES,
    );
    assert.deepEqual(out, {
      agent: "omos-implementer",
      prompt: "p",
      background: true,
    });
  });

  it("overrides an explicit background:false", () => {
    const out = forceBackgroundEvent(
      "subagent",
      { agent: "omos-verifier", background: false },
      ROLES,
    );
    assert.equal((out as Record<string, unknown>).background, true);
  });

  it("matches the legacy task tool and subagent_type field", () => {
    const out = forceBackgroundEvent(
      "task",
      { subagent_type: "omos-implementer" },
      ROLES,
    );
    assert.equal((out as Record<string, unknown>).background, true);
  });

  it("passes through non-matching roles untouched", () => {
    const input = { agent: "explore", background: false };
    assert.equal(forceBackgroundEvent("subagent", input, ROLES), input);
  });

  it("passes through other tools and non-object inputs", () => {
    const input = { agent: "omos-verifier" };
    assert.equal(forceBackgroundEvent("bash", input, ROLES), input);
    assert.equal(forceBackgroundEvent("subagent", "string", ROLES), "string");
    assert.equal(forceBackgroundEvent("subagent", null, ROLES), null);
  });

  it("never mutates the original input", () => {
    const input = { agent: "omos-verifier" };
    forceBackgroundEvent("subagent", input, ROLES);
    assert.deepEqual(input, { agent: "omos-verifier" });
  });
});
