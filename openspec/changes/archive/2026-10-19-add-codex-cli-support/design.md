# add-codex-cli-support — design

Approach: a `codex/` adapter layer renders the existing single-source
assets (`agents/*.md`, `skills/*/SKILL.md`, `vendor/openspec/skills/`,
`core/prompts.ts`, `core/openspec.ts`) into a committed, generated Codex
plugin bundle at
`plugins/oh-my-openspec/`, delivered as a git marketplace from this repo.
`openspec_validate` parity comes from a bundled MCP stdio server that
imports the host-agnostic core — not from shell commands in prompts.
OpenCode paths are reuse-only: nothing under `opencode/`, `core/`,
`skills/`, `agents/`, `vendor/`, `package.json`, or `scripts/check.mjs`
changes behavior.

## 1. Bundle layout and delivery

Committed generated bundle — 30 files: 18 skills (6 omos flow-family +
12 vendored upstream), 7 role TOMLs,
`.codex-plugin/plugin.json`, `.mcp.json`, `assets/mcp-server.mjs`,
`assets/openspec-core.ts`, `assets/install-agents.mjs` (every file
produced by `node codex/render.ts`;
`make codex` regenerates; `tests/codex-bundle.test.ts` fails on drift —
the `vendor/` precedent):

```
.agents/plugins/marketplace.json          [static, committed — repo metadata]
plugins/oh-my-openspec/
  .codex-plugin/plugin.json               [generated — codex/manifest.ts]
  .mcp.json                               [generated — codex/manifest.ts]
  skills/omos-init/SKILL.md               [generated — codex/skills.ts]
  skills/omos-plan/SKILL.md               [generated]
  skills/omos-apply/SKILL.md              [generated]
  skills/omos-retro/SKILL.md              [generated]
  skills/omos-archive/SKILL.md            [generated — codex/skills.ts renderArchiveSkill()]
  skills/omos-setup/SKILL.md              [generated — codex/setup-skill.md]
  skills/openspec-apply-change/SKILL.md   [generated — copy of vendor/openspec/skills/]
  skills/openspec-archive-change/SKILL.md [generated]
  skills/openspec-bulk-archive-change/SKILL.md [generated]
  skills/openspec-continue-change/SKILL.md [generated]
  skills/openspec-explore/SKILL.md        [generated]
  skills/openspec-ff-change/SKILL.md      [generated]
  skills/openspec-new-change/SKILL.md     [generated]
  skills/openspec-onboard/SKILL.md        [generated]
  skills/openspec-propose/SKILL.md        [generated]
  skills/openspec-sync-specs/SKILL.md     [generated]
  skills/openspec-update-change/SKILL.md  [generated]
  skills/openspec-verify-change/SKILL.md  [generated]
  assets/agents/omos-critic.toml          [generated — codex/agents.ts]
  assets/agents/omos-implementer.toml     [generated]
  assets/agents/omos-planner.toml         [generated]
  assets/agents/omos-researcher.toml      [generated]
  assets/agents/omos-retrospector.toml    [generated]
  assets/agents/omos-reviewer.toml        [generated]
  assets/agents/omos-verifier.toml        [generated]
  assets/mcp-server.mjs                   [generated — copy of codex/mcp-server.mjs, import rewritten]
  assets/openspec-core.ts                 [generated — verbatim copy of core/openspec.ts]
  assets/install-agents.mjs               [generated — verbatim copy of codex/install-agents.mjs]
```

Vendored upstream skills (12, under `skills/`): byte-identical to
upstream via the daily `scripts/sync-vendor.mjs` pipeline (manifest +
generatedBy mirror invariants; drift already CI-gated), copied from
`vendor/openspec/skills/` through the §3 substitution machinery — the
phrase table is empty for them today, and the residual guard is the
invariant that makes bundling safe: any future host-bound upstream text
fails the build loudly. Grep audit 2026-10-19: zero
`opencode`/`.opencode`/`/omos`/`opsx.` host references in the vendored
bodies — "slash command" appears only generically describing user
behaviour (e.g. openspec-apply-change/SKILL.md:23-24,
openspec-explore/SKILL.md:27-28, openspec-verify-change +
openspec-new-change similar lines), and descriptions cite plain
utterances ("when the user says openspec archive or opsx archive").
Vendored frontmatter carries `name`, `description`, plus
`allowed-tools: Bash(openspec:*)`, `license`, `compatibility`
(openspec-archive-change/SKILL.md:1-6). Codex skill-loader acceptance
of the extra keys is UNVERIFIED on 0.163.0 (proposal ASSUMPTION) —
pinned fallback: if the loader rejects or stalls, the renderer
normalizes frontmatter to name+description only at render time for the
vendored copies (documented transform; the drift gate then compares
against fresh render, and vendor byte-equality is asserted on the BODY
(post-frontmatter bytes) rather than the whole file).

`marketplace.json` path and shape follow the documented convention
(evidence: `~/.codex/.tmp/plugins/.agents/skills/plugin-creator/references/plugin-json-spec.md`,
"Repo/team plugin: `<repo-root>/.agents/plugins/marketplace.json`", path
`./plugins/<plugin-name>`):

```json
{
  "name": "oh-my-openspec",
  "interface": { "displayName": "oh-my-openspec" },
  "plugins": [
    {
      "name": "oh-my-openspec",
      "source": { "source": "local", "path": "./plugins/oh-my-openspec" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Productivity"
    }
  ]
}
```

Delivery: `codex plugin marketplace add alexeyco/oh-my-openspec` then
`codex plugin add oh-my-openspec@oh-my-openspec` (both subcommands
verified present on 0.163.0: `codex plugin marketplace add --help →
"Marketplace source: a local path, owner/repo[@ref], HTTPS Git URL, or
SSH Git URL"`). Precedent: oh-my-openagent Light ships the same
marketplace-repo + installer-copying-TOMLs pattern.

`.codex-plugin/plugin.json` (generated; `version` read from
`package.json` at render time — stays in sync with the mirror invariant):

```json
{
  "name": "oh-my-openspec",
  "version": "<package.json version>",
  "description": "OpenSpec multi-agent flow for Codex CLI: $omos-init / $omos-plan / $omos-apply / $omos-retro with seven role subagents and a mechanical openspec_validate MCP gate",
  "author": { "name": "Alexeyco", "url": "https://github.com/alexeyco" },
  "homepage": "https://github.com/alexeyco/oh-my-openspec",
  "repository": "https://github.com/alexeyco/oh-my-openspec",
  "license": "MIT",
  "keywords": ["codex", "codex-plugin", "openspec", "spec-driven-development", "workflow", "subagents"],
  "skills": "./skills/",
  "mcpServers": "./.mcp.json"
}
```

Only spec-permitted fields are used; there is NO `commands` or `agents`
field in the Codex manifest (that absence is exactly why roles install as
TOMLs), and no `hooks` field — no hooks ship (slash aliases descoped,
§5). No `apps`/`interface` block.

Relation to existing gates: `scripts/check.mjs` is NOT modified — its
group 3 pins `skills/` against `FLOW_SKILL_IDS` from `opencode/index.ts`
(scripts/check.mjs:104-138), and bundle skills live under `plugins/`, so
no collision; group 6 keeps reading `opencode/index.ts` (:220-229).
`package.json` is NOT modified: `exports["."]` stays
`./opencode/index.ts`, the `files` allow-list stays as-is (npm remains
OpenCode-only; the release-publishing "Pack preview" scenario keeps
holding verbatim), no `bin`. New tests run under the existing
`npm test` glob `tests/**/*.test.ts`, so `make check` picks them up with
no Makefile gate change.

## 2. Role TOML renderer

`codex/toml.ts` — minimal TOML emitter, no new dependencies:
`escapeTomlMultiline(s)` for multi-line basic strings (`\` → `\\`, every
`"` in a run of three or more → `\"`, `"""` sequences broken by escaping,
control characters other than `\n`/`\t` → `\uXXXX`), and
`renderTomlDoc(fields: [string, string][])` emitting
`key = """\n<escaped>"""` blocks with LF endings and a trailing newline.

`codex/agents.ts` — `renderAgentToml(role: RoleAsset, contract: string,
pkgVersion: string)`: roles come from `core/roles.ts::loadRoles(agents/)`
(frontmatter validation via `core/markdown.ts::validateRoleDoc` reused
unchanged). Output is the provenance marker line
`# managed-by: oh-my-openspec@<pkgVersion>` as the exact first line,
followed by exactly three keys — the required agents-TOML field set
(evidence: `strings /usr/local/bin/codex` on the installed 0.163.0 binary
contains the validation strings "must define a non-empty \`name\`",
"must define a description", "must define \`developer_instructions\`"):

```toml
# managed-by: oh-my-openspec@<package.json version>
name = "omos-planner"
description = """
<frontmatter description>"""
developer_instructions = """
<role.body.trim()>

<SUBAGENT_CONTRACT verbatim from core/prompts.ts:21-37>"""
```

No `model`, no sandbox/approval keys — Codex inherits sandbox and
approval from the session and per-agent overrides are not possible; this
also matches the repo's no-model-pins rule. The marker version and the
`plugin.json` version come from the same single `package.json` read at
render time (§6), so they can never diverge. The contract is baked at
render time (single source: `core/prompts.ts`), replacing OpenCode's
runtime `ctx.session.hook("context")` injection
(opencode/index.ts:126-134) — same text, different delivery, forced by
the host (plugins cannot register agents; TOML files carry no runtime
hooks).

Install step (lazycodex / oh-my-openagent pattern):
`codex/install-agents.mjs` (plain Node, no TS, runs from the installed
bundle as `assets/install-agents.mjs` or from a checkout). Contract:

- Pure function `planAgentInstalls(sourceDir, targetDir, { force })` →
  per file one of four statuses: `copy` (absent target), `skip`
  (byte-identical target), `update` (differing target whose first line
  matches `# managed-by: oh-my-openspec@` — our own file from the
  current or any older version, replaced silently and reported as an
  update), `conflict` (differing target without the marker).
  Unit-testable without a home dir.
- CLI: source defaults to `./agents` next to the script (bundle layout);
  target defaults to `~/.codex/agents` (created if missing). Conflicts
  are refused with a per-file report and exit 1 unless `--force`, which
  overrides conflicts; copy/skip/update counts are printed — idempotent
  and safely re-runnable after a plugin upgrade, never clobbering
  foreign files it did not create.
- Prints next steps: approve the `openspec` MCP server, restart the
  session. Warns when
  `process.version` < 22.18 (the MCP server imports `.ts` and needs Node
  type stripping).
- Does NOT write `~/.codex/config.toml` — `codex plugin add` owns the
  `[plugins."oh-my-openspec@oh-my-openspec"]` enablement state.

Pinned decision (user-approved, accepted trade-off): the marker means
machine-owned — a user EDIT to a managed TOML is overwritten silently by
the next `update` run. The supported customization path is a
differently-named agent file: the installer only ever plans its own
seven file names, so a foreign name is never touched. Rationale: after
`codex plugin marketplace upgrade` the bundle TOMLs change, and
re-running `$omos-setup` must converge without a conflict dialog over
files the user never hand-wrote.

The bundled `omos-setup` skill drives this in-session: locate the
marketplace root via `codex plugin marketplace list`, run
`node <root>/plugins/oh-my-openspec/assets/install-agents.mjs`, verify
seven `~/.codex/agents/omos-*.toml` exist; alternative one-liner via a
fresh `git clone` for users who prefer it. Source: `codex/setup-skill.md`
(host-specific by nature — no OpenCode counterpart); the renderer adds
the frontmatter (`name: omos-setup` + description).

## 3. Flow-skill adaptation: single source, host-native rendering

`codex/skills.ts` renders each `skills/<id>/SKILL.md` (the exact bytes
OpenCode registers) into the bundle:

1. Frontmatter: `name` unchanged; `description` = source description +
   mention suffix ` Invoke via $<id-with-dashes>.` — no slash map, no
   `/omos.*` text (aliases descoped, §5).
2. Body: prepend the generated host-adaptation header (the
   `CODEX_SKILL_HEADER` template with `<id>` interpolated to the skill
   id), then apply the substitution machinery pinned below: phrase
   table → whole-body token pass → residual guard, in that order.

`CODEX_SKILL_HEADER` (rendered as a blockquote so it is visibly
generated context; pinned here verbatim except the `<id>`
interpolation):

```
> Codex host adaptation (generated from skills/<id>/SKILL.md — source of truth stays there):
> - Dispatch roles with `spawn_agent` / `send_input` / `wait_agent` / `close_agent`. Subagents are asynchronous (default up to 6 concurrent threads), so a wave is one batch of `spawn_agent` calls followed by `wait_agent` collection — never poll.
> - `openspec_validate` is provided by this plugin's bundled MCP server as `mcp__openspec__openspec_validate` — call it with `cwd` set to your session's project directory (the `change` filter optional); the VALID/INVALID/UNAVAILABLE/ERROR one-look report format is identical to OpenCode.
> - This skill is invoked as a `$<id>` mention (or picked from /skills). There is no argument substitution: arguments arrive as plain text in the user's message after the mention — read them from there; when absent, follow this skill's elicitation steps.
> - Roles run from `~/.codex/agents/omos-*.toml`. If `spawn_agent` reports an unknown agent, stop and tell the user to run `$omos-setup` once.
```

Substitution machinery (three layers, applied in this order — phrase
table first so its byte-exact keys are not mutated by the token pass):

Pinned phrase table — one entry per host-bound sentence a token swap
cannot fix (exact-match keys, byte-verbatim from the sources; the
renderer throws when a key is absent — the existing drift rule):

1. Dispatch semantics (skills/omos-apply/SKILL.md:47-49 — the original
   single entry):
   - key: `On OpenCode the batch is one set of background dispatches,\n  each returning \`sessionID\` and status \`running\` — collect results from\n  completion notifications, never by polling.`
   - replacement: `On Codex the batch is one set of \`spawn_agent\` calls that return\n  immediately — collect each report with \`wait_agent\`, relay follow-ups\n  with \`send_input\`, and release threads with \`close_agent\`; never poll.`
2. Archive next-step (skills/omos-apply/SKILL.md:133):
   - key: `archive with \`/omos.archive <change-id>\`.`
   - replacement: `archive with the bundled \`$openspec-archive-change\` skill, passing \`<change-id>\`.`
     (Round-6 re-pin: the landed renderer still emits the pre-bundling
     "(after `openspec init --tools codex`)" clause — task 2.5 aligns
     it.)
3. Offered-commands sentence, apply wrapping
   (skills/omos-apply/SKILL.md:133-137):
   - key: `Offered commands are this\n  plugin's slash commands (\`/omos.<name>\`) whenever one exists for the\n  action; a skill id is never offered as a command; the upstream \`openspec\`\n  CLI or a vendored \`/openspec-<name>\` command is offered only where the\n  plugin has no equivalent.`
   - replacement: `Offered invocations are the\n  plugin's \`$omos-*\` skill mentions whenever one exists for the action;\n  the upstream \`openspec\` CLI is offered only where the plugin has no\n  equivalent.`
4. Offered-commands sentence, plan wrapping
   (skills/omos-plan/SKILL.md:134-137):
   - key: `Offered commands are this plugin's slash commands (\`/omos.<name>\`)\n  whenever one exists for the action; a skill id is never offered as a\n  command; the upstream \`openspec\` CLI or a vendored \`/openspec-<name>\`\n  command is offered only where the plugin has no equivalent.`
   - replacement: `Offered invocations are the plugin's \`$omos-*\` skill mentions\n  whenever one exists for the action; the upstream \`openspec\` CLI is\n  offered only where the plugin has no equivalent.`

The vendored `/openspec-<name>` slash-command branch inside entries 3/4
is still false-in-Codex (no slash surface) and dies with them; the
vendored skills themselves ARE bundled (§1) and invoke as
`$openspec-<name>` mentions. Those two occurrences are the only
`/openspec-<name>` references in the four bodies (audit-verified), so
the residual guard below stays scoped to `/omos.`.

Whole-body token pass — mechanical swaps over the body after the phrase
table: `/omos.init` → `$omos-init`, `/omos.plan` → `$omos-plan`,
`/omos.apply` → `$omos-apply`, `/omos.retro` → `$omos-retro`,
`/omos.archive` → `$openspec-archive-change` (the bundle has no
`omos-archive` slash form; flow next-step hints route straight to the
bundled upstream archive skill — the `$omos-archive` wrapper below is
the user-facing surface-parity entry point). This covers the audited
mechanical references:
skills/omos-apply/SKILL.md:19,30; skills/omos-init/SKILL.md:20,60,78;
skills/omos-plan/SKILL.md:133; skills/omos-retro/SKILL.md:17-18 (the
enumeration — mechanical, as preferred) and :38.

Recorded fallback (proposal ASSUMPTION): whether a bare
`$openspec-archive-change` mention resolves to the bundled skill or
requires the `oh-my-openspec:` namespace prefix is UNVERIFIED on
0.163.0 — acceptance step 6 probes the bare mention; if only the
namespaced form resolves, the archive-hint replacements (entry 2 and
the token-pass mapping) and the wrapper's delegation lines switch to
the namespaced form and re-render.

Residual guard — after both passes, any remaining `/omos.` occurrence
in a rendered body makes the renderer throw naming the offending
phrase, mirroring the description guard: future `skills/` edits can
never silently leak a slash hint into Codex.

Correction, recorded honestly (this round was user-report driven): the
first draft claimed "every other sentence in the four flow skills is
host-neutral and survives verbatim". The 2026-10-19 audit falsified
it — the bodies carry 16 slash-reference leaks (14 `/omos.*` +
2 `/openspec-<name>`), which reach Codex as bogus next-step hints
because Codex has no slash-command surface. Genuinely host-neutral
sentences (`Dispatch omos-planner with MODE: waves`, `Run
openspec_validate with the change id`) do still survive verbatim — the
UX-parity win stands for those — but next-step hints MUST differ per
host, and the pinned table above now carries an entry for every
host-bound sentence. The renderer throws when a substitution key is
absent from its source file, so editing `skills/` can never silently
drop a Codex adaptation; `tests/codex-skills.test.ts` asserts every key
is present. OpenCode `skills/` files are never written by this path.

Rejected alternative: host markers inside `skills/*/SKILL.md`
(`<!-- host:codex -->`) — rejected because it changes the bytes OpenCode
registers (skill-registration territory) and forks content ownership.

Archive wrapper (round 7, user-requested surface parity): the bundle
gains a sixth flow-family skill `omos-archive`, the Codex twin of
OpenCode's `/omos.archive` command — itself a thin prompt binding over
the vendored archive workflow (`ctx.command.transform` adds it from
`archiveInstruction`, opencode/index.ts:149-151,190-195).
`codex/skills.ts::renderArchiveSkill()` single-sources the body from
`core/prompts.ts::archiveInstruction(argText: string, skillPath?:
string): string` (core/prompts.ts:118-152), rendered at build time
once per id-count branch — the empty-argText render forms the spine,
the one-id and two-or-more branch lines are byte-exact from core, and
the gate-line equality is pinned by test (reviewer ruling,
keep-code-correct-artifacts: the landed code wins, the text syncs to
it). The id-count branches are pinned statically (Codex arguments
arrive as plain message text, not runtime interpolation): no ids →
list active changes and confirm first; one id
→ perform via the bundled `$openspec-archive-change` skill; two or more
→ `$openspec-bulk-archive-change` (the `archiveSkillId` mapping,
core/prompts.ts:107-113). The validation gate line — "Validate first
with the openspec_validate tool; stop on INVALID unless the user
explicitly overrides." (core/prompts.ts:144) — is carried verbatim, the
Codex twin of the live slash-commands requirement "Archive instruction
always carries the validation gate line"
(openspec/specs/slash-commands/spec.md:144). Frontmatter:
`name: omos-archive` + description ending with the mention suffix
` Invoke via $omos-archive.`. No content fork: every behavior line
derives from core/prompts.ts; the only transform is skill names in the
load lines rendered as `$`-mentions of the bundled vendored skills.

Landed-code note: the alias-wording fix (tasks.md 2.1/2.3) has landed.
The current re-pin — the `openspec_validate` header bullet gaining the
`cwd` instruction (§4 launch-matrix consequence) — is task 2.1's job
again (unticked): `codex/skills.ts` and `tests/codex-skills.test.ts` on
disk still carry the previous "same input (`change?`)" bullet. This
round adds task 2.4: the landed renderer has the single-entry table and
the description token swap only — the body phrase entries (2–4 above),
the whole-body token pass, and the residual guard are missing.

## 4. Validation via bundled MCP stdio server

Decision (user re-decision, UX parity as top criterion): NOT
shell-in-prompts. `codex/mcp-server.mjs` is a hand-rolled
newline-delimited JSON-RPC 2.0 stdio server (~120 lines, zero new npm
dependencies — `@modelcontextprotocol/sdk` rejected to keep the runtime
dependency-free like `core/`):

- `import { validateProject } from "../core/openspec.ts"` — the source
  file lives in `codex/` (importable by unit tests). The renderer copies
  it to `assets/mcp-server.mjs` rewriting that one specifier to
  `"./openspec-core.ts"` (throwing unless exactly one occurrence) and
  copies `core/openspec.ts` verbatim to `assets/openspec-core.ts`.
  WHY (cache-containment finding, 2026-10-19 acceptance run — checklist
  steps 1–2 passed): Codex copies ONLY the bundle directory into
  `~/.codex/plugins/cache/<mkt>/<plugin>/<version>/`, so the previous
  `"../../../core/openspec.ts"` rewrite died with `ERR_MODULE_NOT_FOUND`
  in the cache for every marketplace layout (local copy AND git clone);
  the bundle must be self-contained — the pattern the curated
  `data-analytics` plugin follows. The copy is safe and host-agnostic:
  `core/openspec.ts` imports only `node:child_process` (verified), and
  the bundled copy is generated, never hand-edited, drift-gated (§6).
  Requires Node ≥ 22.18 type stripping
  on the user's machine — the same floor the project already declares;
  the rendered server still imports a `.ts` file, so the floor is
  unchanged and the installer warns below it. Rejected alternative: a
  tsc compile pipeline into plain JS — rejected because `typescript` is
  a dev-only tool here (v7, API surface in flux) and type stripping is
  stable at the declared floor.
- Exports `handleMessage(msg, deps)` (pure, `deps.validate(changeId?,
  cwd?) → Promise<string>` injectable for tests) and `main()` wiring
  `deps.validate = (change, cwd) => validateProject(cwd ??
  process.cwd(), change)`.
- Methods: `initialize` → `{protocolVersion: "2024-11-05", capabilities:
  {tools: {}}, serverInfo: {name: "openspec", version: <pkg version>}}`;
  `notifications/initialized` → no response; `tools/list` → the single
  tool; `tools/call` name `openspec_validate` reads `arguments.change`
  and `arguments.cwd` →
  `{content: [{type: "text", text: report}], isError: false}`.
  Outcome-is-content-never-a-throw: any validation result (VALID,
  INVALID, UNAVAILABLE, ERROR) returns as tool text; JSON-RPC errors only
  for protocol-level problems (unknown method/tool → -32601/-32602).
- Tool input schema: the `change` property identical to
  opencode/index.ts:229-237 (`{type: "string", description: "Change id
  to validate (default: validate all changes and specs)"}` —
  description string copied verbatim), plus the Codex-only optional
  `cwd` property (`{type: "string", description: "Absolute project
  directory to validate (default: the server working directory)."}`).
  The OpenCode tool's schema stays `{change?}` — the host split is the
  launch-matrix consequence recorded below.
- Exposed in-session as `mcp__openspec__openspec_validate` (naming
  pattern confirmed in the 0.163.0 binary: `strings /usr/local/bin/codex
  | grep -o 'mcp__[a-zA-Z_]*' → mcp__server__tool`). Role prompts that
  say "call `openspec_validate`" therefore read identically on both
  hosts; the skill header states the fully qualified name once.

`.mcp.json` (generated; launch form PROVEN live on 0.163.0 — the curated
`data-analytics` plugin ships the same plugin-root-relative shape, bare
executable command + contained `./` arg):

```json
{
  "mcpServers": {
    "openspec": {
      "type": "stdio",
      "title": "OpenSpec validate",
      "description": "Mechanical OpenSpec artifact validation gate (openspec_validate).",
      "command": "node",
      "args": ["./assets/mcp-server.mjs"],
      "cwd": "./"
    }
  }
}
```

Launch-matrix findings (2026-10-19, codex-cli 0.163.0, `codex exec`
matrix over the installed plugin cache; a probe server wrote
`process.cwd()` + argv to /tmp — all facts empirical, reproducible):

1. NO `cwd` key: the process runs with `process.cwd()` = the SESSION
   project dir, but node resolves the `args` strings relative to that
   cwd, so `"./assets/mcp-server.mjs"` never exists → the process starts
   and dies with MODULE_NOT_FOUND ("handshaking with MCP server failed"
   in the TUI). This is the defect that blocked acceptance step 1 — the
   previous "server inherits the session project directory" assumption
   is dead.
2. `cwd: "${PLUGIN_ROOT}"`: the loader SILENTLY DROPS the server (no
   process at all). The token is spec-legal per
   agent-plugins.org/schemas/1.0.0/mcp.schema.json's pattern, but the
   0.163.0 loader does not apply it here.
3. `cwd: "./"` (also bare `"."`, the curated `data-analytics` form,
   which works in production) + `args: ["./assets/mcp-server.mjs"]`:
   the process runs WITH cwd = plugin root. Proven live. ← the pinned
   form above.
4. Absolute `args` with no `cwd`: runs with cwd = session project — not
   portable, cannot be generated into a committed bundle.
5. `${PLUGIN_ROOT}` inside `args` is NOT expanded; the loader injects NO
   PLUGIN_ROOT/PLUGIN_DATA env into stdio server processes (probe: both
   null), and no session-directory env either.

Consequence (user-approved re-decision): with the only working launch
form (#3) the server's cwd is the plugin cache, so
`validateProject(process.cwd(), …)` would validate the cache dir, and by
#5 the session directory is unknowable to the server — the ONLY viable
live gate is a tool input parameter. `openspec_validate` in the Codex
MCP server takes `{ change?: string, cwd?: string }` (`cwd` = absolute
project directory; absent → `process.cwd()` fallback, the checkout/dev
behaviour). The OpenCode tool schema is NOT changed (npm package stays
OpenCode-only). The report contract (VALID/INVALID/UNAVAILABLE/ERROR
one-look, never-throw) is unchanged and identical across hosts; only the
input surface gains one optional property — parity-by-report.
Trade-off, recorded: roles MUST pass the project dir explicitly in
Codex, where the OpenCode host injects it; the flow skills carry that
instruction via `CODEX_SKILL_HEADER` (§3).

Rejected alternatives (all empirically excluded by the matrix above):
`${PLUGIN_ROOT}` in `cwd` (loader silently drops the server, #2) and in
`args` (never expanded, #5); absolute `args` (unportable, #4); a
`node -e` wrapper (the loader rejects option args); session-directory
env discovery (no vars injected, #5).

Trade-offs, recorded per contract: (a) a separate stdio Node process per
session — negligible (spawned once, idle between calls); (b) per-plugin
MCP approval — users approve once under
`[plugins."oh-my-openspec@oh-my-openspec".mcp_servers."openspec"]` in
`~/.codex/config.toml`; (c) public plugin-directory submission prefers
remote HTTPS MCP servers — we self-distribute via our own git
marketplace, so stdio is fine and keeps the zero-network, zero-secret
property.

## 5. Invocation surface

The invocation surface is `$omos-*` skill mentions — six: `$omos-init`,
`$omos-plan`, `$omos-apply`, `$omos-retro`, `$omos-archive`,
`$omos-setup` — the /skills picker (plugin skills namespace as
`oh-my-openspec:omos-*`), and the twelve bundled `$openspec-*`
vendored-skill mentions for the upstream workflows (§1).
The best-effort `/omos.*` slash aliases (alias-suffix description hint +
hash-trust-gated `UserPromptSubmit` hook running `alias-context.mjs`)
were descoped by user re-decision mid-implementation: single invocation
surface, fewer moving parts, no hook trust step. Consequences: the
bundle ships no `hooks.json` and no alias script, `plugin.json` carries
no `hooks` field, the installer's next steps name only MCP approval and
session restart (§2), and rendered descriptions advertise `$<id>` only
(§3).

Archive flow: BUNDLED (round-6 user-driven redesign — the per-project
`openspec init --tools codex` delegation was rejected as inelegant UX:
"as convenient as OpenCode; mixing two skill sets is a bad idea"). The
bundle ships the twelve vendored upstream workflow skills itself (§1) —
exactly what the OpenCode plugin registers at startup — plus the
`$omos-archive` wrapper (§3) for surface parity with `/omos.archive`, so
installing the plugin gives the complete set with no project-level
step. The vendor pipeline is unchanged: `scripts/sync-vendor.mjs`
(:86,95 untouched) keeps rendering `--tools opencode` as the single
render target — we COPY its output, never re-render for Codex.
Non-goal, stated explicitly: we do not require or expect project-level
`openspec init` output for any part of the Codex experience.

## 6. Renderer entry and determinism

`codex/manifest.ts`: `renderPluginJson(pkgVersion: string)`,
`renderMcpJson()` returning the exact JSON of §1/§4 — including the
proven launch-form fields (`"type": "stdio"`, `"cwd": "./"`). No
`renderHooksJson` — hooks were descoped (§5).

`codex/render.ts`: `renderBundle({ out })` writes the whole tree of §1 —
roles via `loadRoles(join(root, "agents"))` + `SUBAGENT_CONTRACT` + the
`package.json` version (the `# managed-by:` marker), skills
via §3, setup skill via `codex/setup-skill.md`, archive wrapper via
`renderArchiveSkill()` (§3), the twelve `vendor/openspec/skills/`
entries through the §3 substitution machinery + residual guard (phrase
table empty for them today; frontmatter normalization only if the
acceptance probe requires it, §1), manifests via
`codex/manifest.ts`, `assets/mcp-server.mjs` via the one-specifier
rewrite (`"../core/openspec.ts"` → `"./openspec-core.ts"`, exactly one
occurrence or throw), `assets/openspec-core.ts` and
`assets/install-agents.mjs` as verbatim copies. The single-source rule
stays intact: `assets/openspec-core.ts` is generated from
`core/openspec.ts`, never hand-edited, and the drift gate fails on any
difference. CLI: `node
codex/render.ts [--out <dir>]` (default `plugins/oh-my-openspec`). Determinism rules: sorted file order, LF
endings, trailing newline everywhere, `JSON.stringify(x, null, 2) + "\n"`
for JSON, version read from `package.json` once. `tests/codex-bundle.test.ts`
calls `renderBundle({out: tmpdir})` and byte-compares every file against
the committed tree (file list equality both ways).

Makefile addition (no change to `check`):

```
.PHONY: codex
codex: node_modules ## Regenerate the Codex plugin bundle under plugins/
	@node codex/render.ts
```

`tsconfig.json`: `include` gains `"codex/**/*.ts"` (the `.mjs` scripts are
covered by tests instead; `allowJs` stays off).

## 7. Host isolation

- `core/` imports nothing from `codex/`, `opencode/`, or `plugins/` —
  enforced by `tests/codex-bundle.test.ts` (regex over `core/*.ts`
  import lines). No core change is needed for this release; if a future
  refactor extracts shared helpers, it must be reuse-only.
- `codex/` imports only `core/` + Node builtins (`node:fs`, `node:path`,
  `node:os`, `node:readline`, `node:process`). No `yaml` needed (TOML is
  emitted, not parsed; role parsing reuses `core/`).
- AGENTS.md gains two convention lines: the `codex/`→`core/` import rule
  and "`plugins/` is generated by `make codex` — never edit by hand"
  (mirrors the `vendor/` rule).

## 8. File inventory

New: `codex/toml.ts`, `codex/agents.ts`, `codex/skills.ts`,
`codex/manifest.ts`, `codex/render.ts`, `codex/mcp-server.mjs`,
`codex/install-agents.mjs`, `codex/install-agents.d.mts` (type
declarations for the plain-Node installer, added by the implementer —
tsconfig keeps `allowJs` off, tests import through this shim),
`codex/setup-skill.md`, `.agents/plugins/marketplace.json`,
`plugins/oh-my-openspec/**` (30 generated files),
`tests/codex-toml.test.ts`, `tests/codex-agents.test.ts`,
`tests/codex-skills.test.ts`, `tests/codex-mcp.test.ts`,
`tests/codex-install.test.ts`, `tests/codex-bundle.test.ts`,
`docs/codex.md`.
Removed mid-implementation by the alias descope (task 4.3):
`codex/alias-context.mjs`, `tests/codex-alias.test.ts`.
Modified: `tsconfig.json` (include), `Makefile` (`codex` target),
`AGENTS.md` (two convention lines), `README.md` (Codex collapsible
only, task 6.4), `.prettierignore` (`plugins/` entry — mirrors the
accepted W2 divergence).
Untouched: `package.json`, `scripts/check.mjs`, `opencode/**`,
`core/**`, `skills/**`, `agents/**`, `vendor/**`,
`.github/**`, `scripts/sync-vendor.mjs`.

## 9. Testing and acceptance

Unit tests (all under the existing `npm test` glob): TOML escaping edges
(`"""`, backslashes, control chars); role rendering over the seven real
`agents/*.md` (marker first line, contract suffix verbatim); skill rendering (header,
substitution applied, key-presence drift, description suffix, frontmatter
passes `validateSkillDoc`); skill rendering now also covers the body
token pass and the residual-`/omos.` guard (§3), and the archive
wrapper (frontmatter valid, the `archiveInstruction` gate line
verbatim, both delegation targets named); MCP `handleMessage`
(initialize, tools/list
shape — the `change` property equal to opencode/index.ts:229-237 plus
the Codex-only optional `cwd`, tools/call `cwd` routing with stubbed
validate, UNAVAILABLE passthrough); installer planning (copy/skip/
update/conflict/force, marker detection); bundle drift (including
per-vendored-skill body byte-equality against `vendor/openspec/skills/`)
+ import
direction + the launch-form smoke (spawn the server exactly as
`.mcp.json` declares — `node ./assets/mcp-server.mjs` with cwd = a copy
of the committed tree, from an unrelated working directory — the
`initialize` handshake completes, no module-resolution escape error).

Manual acceptance checklist (Codex 0.163.0, dev machine, scratch repo —
recorded in `docs/codex.md`, executed as task 6.3):

1. `codex plugin marketplace add alexeyco/oh-my-openspec` → marketplace
   listed by `codex plugin marketplace list`.
2. `codex plugin add oh-my-openspec@oh-my-openspec` → plugin listed;
   eighteen skills visible (six `oh-my-openspec:omos-*` and twelve
   `oh-my-openspec:openspec-*` vendored); the plugin cache tree
   holds exactly the 30 bundle files.
3. Approve the `openspec` MCP server when prompted; restart the session
   → `/mcp` shows `openspec` live, and a trivial
   `mcp__openspec__openspec_validate` call with `cwd` set to the scratch
   repo returns a report about the SCRATCH repo (not the plugin cache).
4. Run `$omos-setup` → seven `~/.codex/agents/omos-*.toml` exist; second
   run reports seven skips, zero copies (idempotent). Then locally modify
   one managed TOML (keeping its `# managed-by:` first line) and re-run →
   that file is planned `update` and rewritten, not refused as a
   conflict.
5. In a scratch repo with `openspec/` initialized, run `$omos-plan <idea>`
   → the flow dispatches `spawn_agent` waves, calls
   `mcp__openspec__openspec_validate` with `cwd` = the scratch repo's
   absolute path, creates
   `openspec/changes/<id>/`, and the final report prints VALID; the
   validated project is the scratch repo (cwd-parameter check — decided
   design, §4, no fallback branch); the report's next-step line reads
   `$omos-apply <change-id>`, never `/omos.apply` (manual half of
   "Rendered bodies advertise no slash commands").
6. Archive probe in a scratch repo WITHOUT project-level skills (no
   `.agents/skills`; move any earlier `openspec init --tools codex`
   output aside for the probe): invoke `$omos-archive <id>` → the
   wrapper loads, delegates to the bundled `$openspec-archive-change`,
   and the change archives; also confirm the bare
   `$openspec-archive-change` mention resolves from the bundle (if only
   the namespaced form does, apply the §3 recorded fallback and
   re-render). No project-level `openspec init` anywhere in the probe.
7. In the plugin repo: `make check` → `check: ok`; `npm pack --dry-run`
   shows the tarball gaining only `docs/codex.md`, via the existing
   `docs` entry in the `files` allow-list (package.json:22) — no new
   `files`/`bin`/`exports` entries and no `codex/`/`plugins/` entries.
   Accepted explicitly: `docs/codex.md` rides into the otherwise
   OpenCode-only npm package.
