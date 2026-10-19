// Codex skill renderer — turns the OpenCode flow skills
// (skills/<id>/SKILL.md, the exact bytes OpenCode registers) into the
// Codex bundle's skills/<id>/SKILL.md. The OpenCode sources stay the
// single source of truth; this path never writes them.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseMarkdown, validateSkillDoc } from "../core/markdown.ts";
import {
  ARCHIVE_COMMAND_DESCRIPTION,
  archiveInstruction,
  archiveSkillId,
} from "../core/prompts.ts";

/** The four flow skills rendered for Codex (design.md §1, §3). */
export const FLOW_SKILL_IDS: readonly string[] = [
  "omos-init",
  "omos-plan",
  "omos-apply",
  "omos-retro",
];

/**
 * Host-adaptation header prepended to every rendered flow skill body.
 * `<id>` is interpolated to the skill id; every other byte is pinned in
 * design.md §3 of the add-codex-cli-support change.
 */
export const CODEX_SKILL_HEADER = `> Codex host adaptation (generated from skills/<id>/SKILL.md — source of truth stays there):
> - Dispatch roles with \`spawn_agent\` / \`send_input\` / \`wait_agent\` / \`close_agent\`. Subagents are asynchronous (default up to 6 concurrent threads), so a wave is one batch of \`spawn_agent\` calls followed by \`wait_agent\` collection — never poll.
> - \`openspec_validate\` is provided by this plugin's bundled MCP server as \`mcp__openspec__openspec_validate\` — call it with \`cwd\` set to your session's project directory (the \`change\` filter optional); the VALID/INVALID/UNAVAILABLE/ERROR one-look report format is identical to OpenCode.
> - This skill is invoked as a \`$<id>\` mention (or picked from /skills). There is no argument substitution: arguments arrive as plain text in the user's message after the mention — read them from there; when absent, follow this skill's elicitation steps.
> - Roles run from \`~/.codex/agents/omos-*.toml\`. If \`spawn_agent\` reports an unknown agent, stop and tell the user to run \`$omos-setup\` once.`;

/**
 * Slash-alias text the Codex bundle must not advertise (design.md §5 —
 * the invocation surface is `$omos-*` mentions and the /skills picker
 * only). This constant is the detection pattern for that ban, not an
 * advertisement: descriptions are checked against it after their
 * `/omos.<flow>` self-reference is swapped to the mention form, and
 * rendered bodies are checked against it by the residual guard after
 * the phrase table and the token pass.
 */
const SLASH_ALIAS = "/omos.";

/** One exact-match substitution applied while rendering a flow skill. */
export interface SkillSubstitution {
  readonly skillId: string;
  readonly key: string;
  readonly replacement: string;
}

/**
 * Exact-match substitution table: sentences in the flow-skill sources
 * that are OpenCode-specific (host-bound next-step hints a token swap
 * cannot fix), each replaced by its Codex-native equivalent. A key that
 * vanishes from its source fails the render — editing skills/ can
 * never silently drop a Codex adaptation. Keys are byte-verbatim from
 * the sources and pinned in design.md §3 of the add-codex-cli-support
 * change; entries are applied in the pinned order.
 */
export const SUBSTITUTIONS: readonly SkillSubstitution[] = [
  {
    // skills/omos-apply/SKILL.md:47-49 — the dispatch-sentence entry.
    skillId: "omos-apply",
    key: "On OpenCode the batch is one set of background dispatches,\n  each returning `sessionID` and status `running` — collect results from\n  completion notifications, never by polling.",
    replacement:
      "On Codex the batch is one set of `spawn_agent` calls that return\n  immediately — collect each report with `wait_agent`, relay follow-ups\n  with `send_input`, and release threads with `close_agent`; never poll.",
  },
  {
    // skills/omos-apply/SKILL.md:133 — the archive next-step hint. The
    // vendored upstream archive skills ship in the bundle itself
    // (design.md §1), so the hint routes to the bundled skill — no
    // project-level init step (round-6 re-pin; the wrapper itself is
    // renderArchiveSkill below).
    skillId: "omos-apply",
    key: "archive with `/omos.archive <change-id>`.",
    replacement:
      "archive with the bundled `$openspec-archive-change` skill, passing `<change-id>`.",
  },
  {
    // skills/omos-apply/SKILL.md:133-137 — the offered-commands
    // sentence, apply wrapping. The vendored `/openspec-<name>` branch
    // is false-in-Codex text (Codex has no slash-command surface) and
    // dies with this entry.
    skillId: "omos-apply",
    key: "Offered commands are this\n  plugin's slash commands (`/omos.<name>`) whenever one exists for the\n  action; a skill id is never offered as a command; the upstream `openspec`\n  CLI or a vendored `/openspec-<name>` command is offered only where the\n  plugin has no equivalent.",
    replacement:
      "Offered invocations are the\n  plugin's `$omos-*` skill mentions whenever one exists for the action;\n  the upstream `openspec` CLI is offered only where the plugin has no\n  equivalent.",
  },
  {
    // skills/omos-plan/SKILL.md:134-137 — the offered-commands
    // sentence, plan wrapping (different line breaks, so its own key).
    skillId: "omos-plan",
    key: "Offered commands are this plugin's slash commands (`/omos.<name>`)\n  whenever one exists for the action; a skill id is never offered as a\n  command; the upstream `openspec` CLI or a vendored `/openspec-<name>`\n  command is offered only where the plugin has no equivalent.",
    replacement:
      "Offered invocations are the plugin's `$omos-*` skill mentions\n  whenever one exists for the action; the upstream `openspec` CLI is\n  offered only where the plugin has no equivalent.",
  },
];

/**
 * Whole-body token pass (design.md §3): mechanical `/omos.<flow>` →
 * mention-form swaps applied to every occurrence of the rendered body
 * AFTER the phrase table (the pinned order — the table consumes its
 * byte-exact keys first, so the pass cannot mutate them). The first
 * four map to this plugin's own skills; `/omos.archive` routes to the
 * bundled upstream archive skill — flow next-step hints go straight
 * there, while the `$omos-archive` wrapper (renderArchiveSkill below)
 * is the user-facing surface-parity entry point.
 */
export const TOKEN_SUBSTITUTIONS: readonly (readonly [string, string])[] = [
  ["/omos.init", "$omos-init"],
  ["/omos.plan", "$omos-plan"],
  ["/omos.apply", "$omos-apply"],
  ["/omos.retro", "$omos-retro"],
  ["/omos.archive", "$openspec-archive-change"],
];

/**
 * Description suffix advertising the mention form — the only invocation
 * surface the Codex bundle ships (design.md §3, §5):
 * ` Invoke via $<id-with-dashes>.`
 */
function mentionSuffix(id: string): string {
  return ` Invoke via $${id}.`;
}

/**
 * Strip the slash-alias advertisement from a source description: the
 * OpenCode sources say `via /omos.<flow>`, which the Codex bundle must
 * not carry. The self-reference is swapped to the mention form; any
 * other `/omos.` text left over fails the render, so a skills/ edit can
 * never silently leak a slash-alias advertisement.
 */
function adaptDescription(description: string, id: string): string {
  // The alias is the id's dotted slash form: `omos-init` ↔ `/omos.init`.
  const selfAlias = "/" + id.replaceAll("-", ".");
  const adapted = description.replaceAll(selfAlias, `$${id}`);
  if (adapted.includes(SLASH_ALIAS)) {
    throw new Error(
      `codex/skills: description of skills/${id}/SKILL.md names a ${SLASH_ALIAS}* slash command that is not the skill's own — only the self-reference is swapped to the mention form. Extend adaptDescription in codex/skills.ts to cover the new wording.\ndescription: ${adapted}`,
    );
  }
  return adapted;
}

/**
 * Residual guard (design.md §3): after the phrase table and the token
 * pass, any `/omos.` occurrence left in a rendered body makes the
 * render throw naming the offending line — a future skills/ edit can
 * never silently leak a slash hint into Codex, mirroring the
 * description guard above.
 */
function assertNoSlashAliasInBody(renderedBody: string, id: string): void {
  const offendingLine = renderedBody
    .split("\n")
    .find((line) => line.includes(SLASH_ALIAS));
  if (offendingLine !== undefined) {
    throw new Error(
      `codex/skills: rendered body of skills/${id}/SKILL.md still names a ${SLASH_ALIAS}* slash command after the phrase table and the token pass — extend SUBSTITUTIONS or TOKEN_SUBSTITUTIONS in codex/skills.ts to cover it.\noffending line: ${offendingLine}`,
    );
  }
}

/**
 * Render one flow skill's SKILL.md for the Codex bundle.
 *
 * Frontmatter: `name` unchanged, `description` = source description
 * with its `/omos.<flow>` self-reference swapped to the `$<id>` mention
 * form, plus the mention suffix. Body: the interpolated
 * `CODEX_SKILL_HEADER` prepended, then the substitution machinery in
 * the pinned order (design.md §3) — phrase table first (so its
 * byte-exact keys are consumed before any mechanical pass), then the
 * whole-body token pass, then the residual guard. Throws when a
 * substitution key is missing, when the description would still
 * advertise a slash alias, or when any `/omos.` text survives both
 * body passes.
 */
export function renderFlowSkill(raw: string): string {
  const { frontmatter, body } = parseMarkdown<unknown>(raw);
  const doc = validateSkillDoc(frontmatter);
  const id = doc.name;

  const description = adaptDescription(doc.description, id) + mentionSuffix(id);
  const header = CODEX_SKILL_HEADER.replaceAll("<id>", id);

  // The header is prepended before the machinery runs, so the guard
  // below covers it too (it carries no `/omos.` text today; if a future
  // header edit adds one, the render fails here).
  let renderedBody = `${header}\n${body}`;

  // 1. Phrase table — exact-match, per-skill, in pinned order.
  for (const sub of SUBSTITUTIONS) {
    if (sub.skillId !== id) continue;
    if (!renderedBody.includes(sub.key)) {
      throw new Error(
        `codex/skills: substitution key missing from skills/${id}/SKILL.md — expected to find:\n${sub.key}\nUpdate SUBSTITUTIONS in codex/skills.ts to match the edited source.`,
      );
    }
    // Function form: the replacement is literal, `$` patterns must not
    // be interpreted.
    renderedBody = renderedBody.replaceAll(sub.key, () => sub.replacement);
  }

  // 2. Whole-body token pass — every remaining mechanical
  // `/omos.<flow>` reference becomes its mention form.
  for (const [from, to] of TOKEN_SUBSTITUTIONS) {
    renderedBody = renderedBody.replaceAll(from, () => to);
  }

  // 3. Residual guard.
  assertNoSlashAliasInBody(renderedBody, id);

  return [
    "---",
    `name: ${doc.name}`,
    `description: ${JSON.stringify(description)}`,
    "---",
    "",
    renderedBody,
  ].join("\n");
}

const ARCHIVE_SKILL_ID = "omos-archive";

// Placeholder argTexts for the statically pinned id-count branches:
// archiveInstruction renders them into template lines ("Change:
// <change-id>") that read as placeholders in the wrapper body.
const ARCHIVE_ONE_ID_ARGS = "<change-id>";
const ARCHIVE_MANY_IDS_ARGS = "<id-1> <id-2>";

// Description: the /omos.archive command description from
// core/prompts.ts (single source) + the delegation targets + the
// mention suffix. No `/omos.` text — the mention form is the only
// invocation surface the bundle advertises.
const ARCHIVE_SKILL_DESCRIPTION =
  `${ARCHIVE_COMMAND_DESCRIPTION}, delegating to the bundled $openspec-archive-change skill ($openspec-bulk-archive-change for two or more ids).` +
  mentionSuffix(ARCHIVE_SKILL_ID);

/**
 * Render the Codex omos-archive wrapper SKILL.md — the twin of
 * OpenCode's archive command (design.md §3, archive wrapper).
 *
 * Single source: core/prompts.ts. `archiveInstruction` — the exact
 * builder the OpenCode command prompts with — is rendered here at
 * build time, once per id-count branch with placeholder argTexts, and
 * every behavior line in the body is one of its rendered lines: the
 * branch OpenCode selects at runtime (argText → `archiveSkillId`) is
 * pinned statically in the body because Codex arguments arrive as
 * plain text in the user's message after the mention, not runtime
 * interpolation. The only transform: skill names in the load lines
 * become `$`-mentions of the bundled vendored skills. The validation
 * gate line — the invariant last line of every render — is carried
 * verbatim.
 */
export function renderArchiveSkill(): string {
  const noIdsLines = archiveInstruction("").split("\n");
  const oneIdLines = archiveInstruction(ARCHIVE_ONE_ID_ARGS).split("\n");
  const manyIdsLines = archiveInstruction(ARCHIVE_MANY_IDS_ARGS).split("\n");

  // Drift guards on the single source: every render keeps the pinned
  // three-line shape (load line, branch line, gate line) with the
  // validation gate as the invariant last line, and archiveSkillId
  // maps zero/one ids to the single-archive skill and two or more to
  // the bulk one. A core/prompts.ts edit that breaks any of these
  // fails the render loudly instead of silently forking the twin.
  for (const [argText, lines] of [
    ["", noIdsLines],
    [ARCHIVE_ONE_ID_ARGS, oneIdLines],
    [ARCHIVE_MANY_IDS_ARGS, manyIdsLines],
  ] as const) {
    if (lines.length !== 3) {
      throw new Error(
        `codex/skills: archiveInstruction(${JSON.stringify(argText)}) no longer renders the pinned three-line shape (load line, branch line, gate line) — update renderArchiveSkill in codex/skills.ts.\nrendered:\n${lines.join("\n")}`,
      );
    }
  }
  const gateLine = noIdsLines[2]!;
  if (oneIdLines[2] !== gateLine || manyIdsLines[2] !== gateLine) {
    throw new Error(
      "codex/skills: the archiveInstruction validation gate is no longer the invariant last line of every id-count render — update renderArchiveSkill in codex/skills.ts.",
    );
  }
  const singleSkillId = archiveSkillId(ARCHIVE_ONE_ID_ARGS);
  const bulkSkillId = archiveSkillId(ARCHIVE_MANY_IDS_ARGS);
  if (
    noIdsLines[0] !== oneIdLines[0] ||
    !noIdsLines[0]!.includes(singleSkillId)
  ) {
    throw new Error(
      `codex/skills: the no-ids and one-id archiveInstruction renders no longer agree on the single-archive skill (${singleSkillId}) — update renderArchiveSkill in codex/skills.ts.`,
    );
  }
  if (!manyIdsLines[0]!.includes(bulkSkillId)) {
    throw new Error(
      `codex/skills: the two-or-more-ids archiveInstruction render no longer loads the bulk-archive skill (${bulkSkillId}) — update renderArchiveSkill in codex/skills.ts.`,
    );
  }

  // The only transform (design.md §3): skill names in the load lines
  // rendered as `$`-mentions of the bundled vendored skills.
  const singleLoad = noIdsLines[0]!.replaceAll(
    singleSkillId,
    () => `\`$${singleSkillId}\``,
  );
  const bulkLoad = manyIdsLines[0]!.replaceAll(
    bulkSkillId,
    () => `\`$${bulkSkillId}\``,
  );

  const body = [
    `# ${ARCHIVE_SKILL_ID}`,
    "",
    "Archive completed OpenSpec changes by delegating to the bundled vendored",
    "archive skills — the Codex twin of OpenCode's archive command. Every",
    "instruction line below is rendered from `archiveInstruction` in",
    "`core/prompts.ts`, the same single source the OpenCode command prompts",
    "with; the only transforms are the id-count branches pinned statically",
    "and the skill names in the load lines rendered as `$`-mentions.",
    "",
    "Arguments arrive as plain text in the user's message after the",
    "`$omos-archive` mention — there is no argument substitution. Split the",
    "message on whitespace into change ids and follow the branch the id",
    "count selects (the `archiveSkillId` mapping: zero or one id binds the",
    "single-archive skill, two or more bind the bulk one):",
    "",
    "- Zero ids —",
    `  ${singleLoad}`,
    `  ${noIdsLines[1]}`,
    "- One id —",
    `  ${singleLoad}`,
    `  ${oneIdLines[1]}`,
    "- Two or more ids —",
    `  ${bulkLoad}`,
    `  ${manyIdsLines[1]}`,
    "",
    "Whatever the branch, the validation gate always applies:",
    "",
    gateLine,
  ].join("\n");

  assertNoSlashAliasInBody(body, ARCHIVE_SKILL_ID);

  return [
    "---",
    `name: ${ARCHIVE_SKILL_ID}`,
    `description: ${JSON.stringify(ARCHIVE_SKILL_DESCRIPTION)}`,
    "---",
    "",
    body,
  ].join("\n");
}

const SETUP_SKILL_ID = "omos-setup";
const SETUP_SKILL_DESCRIPTION =
  "Install the oh-my-openspec Codex host pieces: the seven ~/.codex/agents/omos-*.toml role agents via the bundled installer, then the openspec MCP-server approval. Invoke via $omos-setup.";

/**
 * Render the Codex-only omos-setup skill from codex/setup-skill.md.
 * The source is host-specific by nature (no OpenCode counterpart), so
 * the renderer only adds the frontmatter — the body is verbatim.
 */
export function renderSetupSkill(): string {
  const body = readFileSync(
    join(import.meta.dirname, "setup-skill.md"),
    "utf-8",
  );
  return [
    "---",
    `name: ${SETUP_SKILL_ID}`,
    `description: ${JSON.stringify(SETUP_SKILL_DESCRIPTION)}`,
    "---",
    "",
    body,
  ].join("\n");
}
