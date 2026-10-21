// Tests for codex/skills.ts — Codex bundle skill rendering. The OpenCode
// sources under skills/ are read, never written.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CODEX_SKILL_HEADER,
  FLOW_SKILL_IDS,
  SUBSTITUTIONS,
  TOKEN_SUBSTITUTIONS,
  renderArchiveSkill,
  renderFlowSkill,
  renderSetupSkill,
} from "../codex/skills.ts";
import { parseMarkdown, validateSkillDoc } from "../core/markdown.ts";
import { archiveInstruction } from "../core/prompts.ts";

const repoRoot = join(import.meta.dirname, "..");
const CODEX_ARCHIVE_MENTION = "$oh-my-openspec:omos-archive";

function readFlowSkill(id: string): string {
  return readFileSync(join(repoRoot, "skills", id, "SKILL.md"), "utf-8");
}

function interpolatedHeader(id: string): string {
  return CODEX_SKILL_HEADER.replaceAll("<id>", id);
}

describe("renderFlowSkill", () => {
  it("Shared apply source stays host-neutral while Codex renders namespaced skills", () => {
    const applySource = readFlowSkill("omos-apply");
    assert.ok(
      applySource.includes("archive with `/omos.archive <change-id>`"),
      "shared apply source retains its host-neutral archive command",
    );
    assert.ok(
      !applySource.includes(CODEX_ARCHIVE_MENTION),
      "shared apply source contains no Codex-only archive mention",
    );

    const renderedApply = parseMarkdown<unknown>(
      renderFlowSkill(applySource),
    ).body;
    assert.ok(
      renderedApply.includes(
        `archive with \`${CODEX_ARCHIVE_MENTION} <change-id>\``,
      ),
      "Codex renderer converts the shared archive command",
    );

    for (const id of FLOW_SKILL_IDS) {
      const rendered = renderFlowSkill(readFlowSkill(id));
      const { frontmatter, body } = parseMarkdown<unknown>(rendered);
      const doc = validateSkillDoc(frontmatter);
      assert.ok(doc.description.includes(`$oh-my-openspec:${id}`));
      for (const target of FLOW_SKILL_IDS) {
        const unnamespaced = new RegExp(`\\$${target}(?![\\w:-])`);
        assert.doesNotMatch(
          body,
          unnamespaced,
          `${id}: ${target} must be namespaced`,
        );
      }
    }
  });

  it("Rendered flow skill carries the Codex host header", () => {
    assert.equal(FLOW_SKILL_IDS.length, 4, "exactly four flow skills render");
    for (const id of FLOW_SKILL_IDS) {
      const rendered = renderFlowSkill(readFlowSkill(id));
      const { body } = parseMarkdown<unknown>(rendered);
      const header = interpolatedHeader(id);
      assert.ok(
        body.startsWith("\n" + header + "\n"),
        `${id}: body must start with the Codex host header`,
      );
      // The header block names the primitives the scenario pins.
      assert.ok(header.includes("`spawn_agent`"), "spawn_agent named");
      assert.ok(header.includes("`wait_agent`"), "wait_agent named");
      assert.ok(
        header.includes("`mcp__openspec__openspec_validate`"),
        "MCP tool name given",
      );
      // The launch-form re-decision bullet: the tool must be called with
      // `cwd` (the server runs in the plugin cache, not the project), the
      // `change` filter is optional, and the report format is pinned.
      assert.ok(
        header.includes(
          "call it with `cwd` set to your session's project directory",
        ),
        "cwd instruction named",
      );
      assert.ok(
        header.includes("(the `change` filter optional)"),
        "change filter marked optional",
      );
      assert.ok(
        header.includes(
          "the VALID/INVALID/UNAVAILABLE/ERROR one-look report format is identical to OpenCode",
        ),
        "report-format parity stated",
      );
      assert.ok(
        !header.includes("same input"),
        "pre-repin 'same input' wording dropped",
      );
      assert.ok(
        header.includes("There is no argument substitution"),
        "no-substitution rule stated",
      );
      assert.ok(
        header.includes("run `$oh-my-openspec:omos-setup` once"),
        "namespaced $omos-setup remedy present",
      );
      // The invocation bullet advertises the mention form (and the
      // /skills picker) only — no slash alias.
      assert.ok(
        header.includes(`\`$oh-my-openspec:${id}\` mention`),
        `${id}: mention form named`,
      );
      assert.ok(
        header.includes("(or picked from /skills)"),
        "/skills picker named",
      );
      assert.ok(!header.includes("/omos."), "no slash alias advertised");
      // The id is interpolated into both placeholder positions.
      assert.ok(header.includes(`skills/${id}/SKILL.md`));
      // No placeholder leaks into the interpolated header. (The source
      // body may legitimately use `<id>` as a change-id placeholder.)
      assert.ok(!header.includes("<id>"), `${id}: <id> leaked`);
    }
  });

  it("OpenCode dispatch sentence is replaced", () => {
    const raw = readFlowSkill("omos-apply");
    const rendered = renderFlowSkill(raw);
    const sourceBody = parseMarkdown<unknown>(raw).body;
    const renderedBody = parseMarkdown<unknown>(rendered).body;

    // The OpenCode dispatch sentence is gone…
    assert.ok(
      !rendered.includes(
        "On OpenCode the batch is one set of background dispatches",
      ),
      "OpenCode dispatch sentence must be dropped",
    );

    // …the spawn_agent batch / wait_agent collection sentence is in…
    const sub = SUBSTITUTIONS.find(
      (s) => s.skillId === "omos-apply" && s.key.startsWith("On OpenCode"),
    );
    assert.ok(sub, "omos-apply dispatch substitution entry exists");
    assert.ok(renderedBody.includes(sub.replacement));
    assert.ok(sub.replacement.includes("`spawn_agent`"));
    assert.ok(sub.replacement.includes("`wait_agent`"));

    // …and everything outside the substituted span is byte-identical
    // modulo the pinned machinery: the rendered remainder equals the
    // source body with the full substitution stack composed — every
    // phrase-table entry for omos-apply (the dispatch entry plus the
    // archive/next-step rewrites) and the whole-body token pass — and
    // nothing else. The dispatch replacement occurs exactly once.
    const header = interpolatedHeader("omos-apply");
    const rest = renderedBody.slice(("\n" + header + "\n").length);
    assert.equal(rest.split(sub.replacement).length - 1, 1);
    let expected = sourceBody;
    for (const s of SUBSTITUTIONS) {
      if (s.skillId !== "omos-apply") continue;
      expected = expected.replaceAll(s.key, () => s.replacement);
    }
    for (const [from, to] of TOKEN_SUBSTITUTIONS) {
      expected = expected.replaceAll(from, () => to);
    }
    assert.equal(rest, expected);
  });

  it("Removed substitution key fails the build", () => {
    // Every key is present in the committed sources — the moment a
    // skills/ edit drops one, this assertion fails the suite.
    for (const sub of SUBSTITUTIONS) {
      const raw = readFlowSkill(sub.skillId);
      assert.ok(
        raw.includes(sub.key),
        `substitution key missing from skills/${sub.skillId}/SKILL.md`,
      );
    }

    // A mutated source without the key makes renderFlowSkill throw,
    // naming the missing key.
    const sub = SUBSTITUTIONS.find((s) => s.skillId === "omos-apply");
    assert.ok(sub);
    const mutated = readFlowSkill("omos-apply").replace(
      sub.key,
      "The batch dispatch text was rewritten upstream.",
    );
    assert.throws(
      () => renderFlowSkill(mutated),
      (err: unknown) => err instanceof Error && err.message.includes(sub.key),
      "renderFlowSkill must throw naming the missing key",
    );
  });

  it("Descriptions advertise the mention form", () => {
    for (const id of FLOW_SKILL_IDS) {
      const rendered = renderFlowSkill(readFlowSkill(id));
      const { frontmatter } = parseMarkdown<unknown>(rendered);
      // The emitted frontmatter re-parses and still passes validation.
      const doc = validateSkillDoc(frontmatter);
      assert.equal(doc.name, id);
      const suffix = ` Invoke via $oh-my-openspec:${id}.`;
      assert.ok(
        doc.description.endsWith(suffix),
        `${id}: description must end with "${suffix}"`,
      );
      // No slash-alias advertisement ships in the description.
      assert.ok(
        !doc.description.includes("/omos."),
        `${id}: description must not advertise a /omos.* alias`,
      );
      // The source description is preserved in full except for the
      // slash self-reference swap to the mention form.
      const sourceDoc = validateSkillDoc(
        parseMarkdown<unknown>(readFlowSkill(id)).frontmatter,
      );
      const adapted = sourceDoc.description.replaceAll(
        `/${id.replaceAll("-", ".")}`,
        `$oh-my-openspec:${id}`,
      );
      assert.equal(doc.description, adapted + suffix);
    }
  });

  it("Rendered bodies advertise no slash commands", () => {
    // Scenario (specs/codex-host-integration, add-codex-cli-support):
    // "Rendered bodies advertise no slash commands" — WHEN any flow
    // skill is rendered THEN its body contains no `/omos.` text and
    // every plugin-owned next-step hint names a namespaced mention.
    // (The delta spec wording is current: spec.md:171-173 says archive
    // hints name the "bundled" `$openspec-archive-change` skill, synced
    // with the round-6 bundled-vendored-skills redesign — the assertion
    // below, design.md §3, and the spec all agree.)
    const bodies = new Map<string, string>();
    for (const id of FLOW_SKILL_IDS) {
      const rendered = renderFlowSkill(readFlowSkill(id));
      const { body } = parseMarkdown<unknown>(rendered);
      bodies.set(id, body);
      assert.ok(
        !body.includes("/omos."),
        `${id}: rendered body must contain no /omos. text`,
      );
      // The vendored `/openspec-<name>` branch is false-in-Codex text;
      // design.md §3 audit pins exactly two occurrences, both consumed
      // by the phrase table (entries 3/4), so none may survive either.
      assert.ok(
        !body.includes("/openspec-<name>"),
        `${id}: rendered body must contain no vendored /openspec-<name> command`,
      );
    }

    // Every next-step hint names a namespaced plugin skill mention…
    assert.ok(
      bodies
        .get("omos-init")!
        .includes(
          "future work goes through `$oh-my-openspec:omos-plan <idea>`",
        ),
      "omos-init next-step hint names namespaced $omos-plan",
    );
    assert.ok(
      bodies
        .get("omos-plan")!
        .includes("next step\n  `$oh-my-openspec:omos-apply <change-id>`"),
      "omos-plan next-step hint names namespaced $omos-apply",
    );
    assert.ok(
      bodies
        .get("omos-apply")!
        .includes("run `$oh-my-openspec:omos-plan` and stop"),
      "omos-apply plan-pointer hint names namespaced $omos-plan",
    );
    assert.ok(
      bodies
        .get("omos-apply")!
        .includes("`$oh-my-openspec:omos-plan` fix round"),
      "omos-apply fix-round hint names namespaced $omos-plan",
    );
    assert.ok(
      bodies.get("omos-init")!.includes("unlike `$oh-my-openspec:omos-plan`"),
      "omos-init gate-comparison hint names namespaced $omos-plan",
    );
    assert.ok(
      bodies
        .get("omos-retro")!
        .includes("(`$oh-my-openspec:omos-plan` there, or direct"),
      "omos-retro repository hint names namespaced $omos-plan",
    );

    // The host-neutral shared hint is rendered as the namespaced Codex
    // archive skill mention.
    assert.ok(
      bodies
        .get("omos-apply")!
        .includes("archive with `$oh-my-openspec:omos-archive <change-id>`"),
      "omos-apply archive hint names the namespaced Codex skill",
    );

    // The pinned offered-invocations rewrites replace both
    // "Offered commands" wrappings (design.md §3 entries 3/4).
    assert.ok(
      bodies
        .get("omos-apply")!
        .includes(
          "Offered invocations are the\n  plugin's `$oh-my-openspec:omos-*` skill mentions whenever one exists for the action;\n  the upstream `openspec` CLI is offered only where the plugin has no\n  equivalent.",
        ),
      "omos-apply carries the pinned offered-invocations rewrite",
    );
    assert.ok(
      bodies
        .get("omos-plan")!
        .includes(
          "Offered invocations are the plugin's `$oh-my-openspec:omos-*` skill mentions\n  whenever one exists for the action; the upstream `openspec` CLI is\n  offered only where the plugin has no equivalent.",
        ),
      "omos-plan carries the pinned offered-invocations rewrite",
    );
    for (const [id, body] of bodies) {
      assert.ok(
        !body.includes("Offered commands"),
        `${id}: the offered-commands sentence must be gone`,
      );
    }

    // The retro enumeration is swapped mechanically by the token pass.
    assert.ok(
      bodies
        .get("omos-retro")!
        .includes(
          "commands run (`$oh-my-openspec:omos-init`, `$oh-my-openspec:omos-plan`, `$oh-my-openspec:omos-apply`,\n  `$oh-my-openspec:omos-archive`) and",
        ),
      "omos-retro enumeration names the mention forms",
    );

    // Scenario, second WHEN: a source skill grows a `/omos.` reference
    // the token pass and the pinned table cannot cover, leaving a
    // residual after substitution — THEN rendering throws naming the
    // phrase, so slash hints can never silently leak into Codex.
    const mutated = readFlowSkill("omos-init").replace(
      "future work goes through `/omos.plan <idea>`",
      "future work goes through `/omos.bogus <idea>`",
    );
    assert.throws(
      () => renderFlowSkill(mutated),
      (err: unknown) =>
        err instanceof Error && err.message.includes("/omos.bogus"),
      "renderFlowSkill must throw naming the residual slash phrase",
    );
  });
});

describe("renderArchiveSkill", () => {
  it("Archive surface mirrors OpenCode", () => {
    // Scenario (specs/codex-host-integration, add-codex-cli-support):
    // "Archive surface mirrors OpenCode" — WHEN a Codex user invokes
    // `$oh-my-openspec:omos-archive` THEN the wrapper resolves from the bundle,
    // delegates to the bundled `$openspec-archive-change` skill
    // (`$openspec-bulk-archive-change` for two or more change ids), and
    // its instruction carries the validation gate line verbatim from
    // `core/prompts.ts::archiveInstruction`.
    // This test covers the renderer half (delegation targets + the
    // verbatim gate line); "resolves from the bundle" joins when task
    // 5.6 wires renderArchiveSkill into renderBundle.
    const rendered = renderArchiveSkill();
    const { frontmatter, body } = parseMarkdown<unknown>(rendered);
    const doc = validateSkillDoc(frontmatter);
    assert.equal(doc.name, "omos-archive");
    const suffix = " Invoke via $oh-my-openspec:omos-archive.";
    assert.ok(
      doc.description.endsWith(suffix),
      `description must end with "${suffix}"`,
    );
    assert.ok(
      body.includes("`$oh-my-openspec:omos-archive` mention"),
      "archive wrapper self-reference is namespaced",
    );
    assert.ok(
      !doc.description.includes("/omos."),
      "description must not advertise a /omos.* alias",
    );

    // Both delegation targets are named as `$`-mentions of the bundled
    // vendored skills — the load lines of the pinned id-count branches.
    assert.ok(
      body.includes(
        "Load the `$openspec-archive-change` skill and follow it exactly.",
      ),
      "single-archive delegation target named as a $-mention",
    );
    assert.ok(
      body.includes(
        "Load the `$openspec-bulk-archive-change` skill and follow it exactly.",
      ),
      "bulk-archive delegation target named as a $-mention",
    );

    // The id-count branches are pinned statically from archiveInstruction
    // renders (the archiveSkillId mapping: zero or one id binds the
    // single-archive skill, two or more bind the bulk one).
    assert.ok(
      body.includes(
        "No change ids given — list active changes, confirm with the user which to archive.",
      ),
      "zero-ids branch carries the elicitation line",
    );
    assert.ok(
      body.includes("Change: <change-id>"),
      "one-id branch carries the change line",
    );
    assert.ok(
      body.includes("Changes: <id-1>, <id-2>"),
      "two-or-more-ids branch carries the changes line",
    );

    // The initial validation gate remains verbatim from the shared builder.
    const gateLine =
      "Validate first with the openspec_validate tool; stop on INVALID unless the user explicitly overrides.";
    assert.ok(
      body.includes(gateLine),
      "initial gate line must appear verbatim",
    );
    assert.equal(
      archiveInstruction("").split("\n")[2],
      gateLine,
      "core/prompts.ts gate line matches the pinned literal",
    );

    const orderedSteps = [
      "Use the delegated archive skill for its other checks. These plugin-mandated steps override any conflicting upstream sync or archive choices: do not ask whether to sync, and stop before archiving if required sync is blocked.",
      "Sync the selected change's specification deltas into the main specs before archiving; do not ask whether to sync.",
      "When sync creates a new openspec/specs/<capability>/spec.md, give it a readable top-level title derived from the capability's purpose or meaning. Preserve existing authored titles and machine-named capability paths.",
      "If required specification sync is blocked, stop without archiving and report the blocker.",
      "After archiving, validate the resulting specifications. Repair issues that are safely fixable within OpenSpec artifacts, then validate again.",
      "If a post-archive issue requires code changes or cannot be safely repaired within OpenSpec artifacts, stop and report it without claiming validation passed.",
    ];
    let previous = body.indexOf(gateLine);
    for (const step of orderedSteps) {
      const current = body.indexOf(step);
      assert.ok(current > previous, `archive step appears in order: ${step}`);
      previous = current;
    }

    // The wrapper body advertises no slash commands either.
    assert.ok(
      !body.includes("/omos."),
      "rendered body must contain no /omos. text",
    );
  });
});

describe("renderSetupSkill", () => {
  it("Rendered setup skill has valid frontmatter and names the installer", () => {
    const rendered = renderSetupSkill();
    const { frontmatter, body } = parseMarkdown<unknown>(rendered);
    const doc = validateSkillDoc(frontmatter);
    assert.equal(doc.name, "omos-setup");
    assert.ok(
      doc.description.endsWith("Invoke via $oh-my-openspec:omos-setup."),
    );
    assert.ok(body.startsWith("\n# omos-setup"));

    // The pinned setup content: installer path, marketplace lookup,
    // role TOMLs, clone alternative.
    assert.ok(
      rendered.includes("plugins/oh-my-openspec/assets/install-agents.mjs"),
      "installer path named",
    );
    assert.ok(
      rendered.includes("codex plugin marketplace list"),
      "marketplace root lookup named",
    );
    assert.ok(
      rendered.includes("~/.codex/agents/omos-*.toml"),
      "role TOML location named",
    );
    assert.ok(rendered.includes("git clone"), "clone alternative offered");
    assert.ok(rendered.includes("MCP server"), "MCP approval present");
    // No hooks ship — the hook-hash approval reminder is gone from the
    // body and the rendered description alike.
    assert.ok(
      !rendered.includes("hook"),
      "no hook-hash approval reminder present",
    );
  });
});
