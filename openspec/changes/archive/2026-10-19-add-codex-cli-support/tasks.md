# add-codex-cli-support — tasks

All paths exact per design.md §8. Scenario names cited here match
`specs/codex-host-integration/spec.md` verbatim after seven revision
rounds: the alias descope renamed "Descriptions advertise the mention
form" (was "Descriptions advertise both invocation forms") and deleted
"Alias hook maps slash text to skill mentions" along with the hook
clauses of the invocation requirement; the managed-file upgrade
contract added "Reinstall after plugin upgrade updates managed files"
and narrowed "Existing user agent files are never clobbered" to targets
without our marker; the launch-form re-decision renamed "Tool list
exposes the openspec_validate tool" (was "Tool list exposes the
identical input schema") and added "Launch form starts the server in
the plugin cache"; the hint-leak fix added "Rendered bodies advertise
no slash commands"; the bundled-vendored-skills redesign renamed
"Archive and per-step workflows come from the bundle" (was "Archive
flow delegates to project-level upstream skills") and added "Vendored
bundle copies track the vendor tree"; the archive-wrapper addition
added "Archive surface mirrors OpenCode".

## 1. TOML emitter and role renderer

- [x] 1.1 Write `codex/toml.ts`: `escapeTomlMultiline(s)` (backslash →
  `\\`; every quote in a run of three or more → `\"`; control characters
  other than `\n`/`\t` → `\uXXXX`) and `renderTomlDoc(fields)` emitting
  `key = """` blocks, LF endings, trailing newline. Add
  `tests/codex-toml.test.ts` covering escaping edges (a body containing
  `"""`, a lone `\`, a control character) — scenario "Hostile body
  content stays valid TOML".
- [x] 1.2 Write `codex/agents.ts`: `renderAgentToml(role, contract)` →
  exactly `name` / `description` / `developer_instructions` (=
  `role.body.trim()` + blank line + contract), no model/sandbox/approval
  keys. Add `tests/codex-agents.test.ts` rendering all seven real roles
  via `loadRoles("agents/")` and `SUBAGENT_CONTRACT` from
  `core/prompts.ts`, asserting the contract suffix is verbatim and last —
  scenario "Developer instructions end with the shared contract".
  (Landed pre-marker: the `# managed-by:` first line is added by task
  1.4.)
- [x] 1.3 Add `"codex/**/*.ts"` to `tsconfig.json` `include`.
- [x] 1.4 Extend `codex/agents.ts`: `renderAgentToml(role, contract,
  pkgVersion)` prepends the provenance line
  `# managed-by: oh-my-openspec@<pkgVersion>` as the exact first line
  before the three-key document (design.md §2). Update
  `tests/codex-agents.test.ts`: all seven rendered roles start with the
  marker line carrying the passed version and still end with the
  verbatim contract ("Developer instructions end with the shared
  contract" stays green).

Build result after group 1 alone: `npm run typecheck` exits 0; `node
--test tests/codex-toml.test.ts tests/codex-agents.test.ts` passes
including the 1.4 marker-line assertions; no other file changed.

## 2. Skill renderer and setup skill

- [x] 2.1 Re-revise the landed `codex/skills.ts` (launch-form
  re-decision, design.md §3): re-pin the `CODEX_SKILL_HEADER`
  `openspec_validate` bullet to "`openspec_validate` is provided by
  this plugin's bundled MCP server as
  `mcp__openspec__openspec_validate` — call it with `cwd` set to your
  session's project directory (the `change` filter optional); the
  VALID/INVALID/UNAVAILABLE/ERROR one-look report format is identical
  to OpenCode."; everything else in the landed renderer stays —
  description suffix ` Invoke via $<id-with-dashes>.` ($-only, no
  `/omos.` text), `SUBSTITUTIONS` (the one exact key from
  `skills/omos-apply/SKILL.md:47-49` and its `spawn_agent`/`wait_agent`
  replacement), `renderFlowSkill(raw)` (frontmatter via
  `parseMarkdown` + `validateSkillDoc`, description + mention suffix,
  header + substituted body, throws when a key is missing),
  `renderSetupSkill()`. Update `tests/codex-skills.test.ts`: header
  present in all four rendered skills and naming the `cwd` instruction
  ("Rendered flow skill carries the Codex host header"); the apply
  output drops "On OpenCode the batch is one set of background
  dispatches" and carries the replacement with all other lines
  unchanged ("OpenCode dispatch sentence is replaced"); a mutated
  source without the key makes `renderFlowSkill` throw ("Removed
  substitution key fails the build"); descriptions end with
  ` Invoke via $<id>.`, contain no `/omos.` text, and still pass
  `validateSkillDoc` ("Descriptions advertise the mention form").
- [x] 2.2 Write `codex/setup-skill.md` (omos-setup source: check the
  seven `~/.codex/agents/omos-*.toml`; locate the marketplace root via
  `codex plugin marketplace list`; run `node
  <root>/plugins/oh-my-openspec/assets/install-agents.mjs`; git-clone
  one-liner alternative; hook/MCP approval reminders). Extend
  `tests/codex-skills.test.ts`: rendered setup skill has valid
  frontmatter (`name: omos-setup`) and names the installer path.
- [x] 2.3 Update `codex/setup-skill.md` and the rendered `omos-setup`
  description in `codex/skills.ts`: approval reminders name only the
  `openspec` MCP server — drop the hook-hash mentions (no hooks ship);
  `tests/codex-skills.test.ts` stays green.
- [x] 2.4 Add the body substitution machinery to the landed
  `codex/skills.ts` (hint-leak fix, design.md §3 — phrase table → token
  pass → residual guard, in that order): the three new pinned phrase
  entries with the byte-exact keys quoted in design.md §3 (apply
  archive sentence; the "Offered commands" sentence in its apply AND
  plan wrappings), keeping the existing dispatch-sentence entry and the
  throw-on-absent-key rule; the whole-body token pass (`/omos.init` →
  `$omos-init`, `/omos.plan` → `$omos-plan`, `/omos.apply` →
  `$omos-apply`, `/omos.retro` → `$omos-retro`, `/omos.archive` →
  `$openspec-archive-change`); and the residual guard — after both
  passes, any remaining `/omos.` occurrence in a rendered body throws
  naming the phrase. Extend `tests/codex-skills.test.ts`: all four
  rendered bodies contain no `/omos.` text and every next-step hint
  names a `$omos-*` mention, archive hints naming the project-level
  `$openspec-archive-change` ("Rendered bodies advertise no slash
  commands"); mutation case — inject a `/omos.` line no entry covers
  into a source fixture and assert `renderFlowSkill` throws naming it.
  Then rerun `make codex` so the committed bundle regenerates with the
  new bodies and group 5's drift gate stays green.
- [x] 2.5 Add `renderArchiveSkill()` to `codex/skills.ts` (surface
  parity with `/omos.archive`, design.md §3): body single-sourced from
  `core/prompts.ts::archiveInstruction` rendered with the empty argText
  — pin the id-count branches statically (no ids → list active changes
  and confirm first; one id → the bundled `$openspec-archive-change`
  skill; two or more → `$openspec-bulk-archive-change`, the
  `archiveSkillId` mapping) and carry the validation gate line
  verbatim; frontmatter `name: omos-archive` + description ending
  ` Invoke via $omos-archive.`. Align the landed phrase-table entry 2
  replacement with the bundled model: "archive with the bundled
  `$openspec-archive-change` skill, passing `<change-id>`." (drop the
  "(after `openspec init --tools codex`)" clause). Extend
  `tests/codex-skills.test.ts`: wrapper frontmatter passes
  `validateSkillDoc`, the gate line appears verbatim, and both
  delegation targets are named ("Archive surface mirrors OpenCode").
  Then rerun `make codex` so the entry-2 reword regenerates; the
  wrapper file itself joins the tree when 5.6 wires it into
  `renderBundle`.

Build result after group 2 alone: `npm run typecheck` exits 0; `node
--test tests/codex-skills.test.ts` passes; `make codex` regenerates the
bundle and the drift gate (`tests/codex-bundle.test.ts`) stays green;
`git status` shows no change under `skills/`.

## 3. MCP validate server

- [x] 3.1 Rework the landed `codex/mcp-server.mjs` (launch-form
  re-decision, design.md §4): newline-delimited JSON-RPC 2.0 stdio
  server, zero new dependencies; `import { validateProject } from
  "../core/openspec.ts"` (source form — the renderer rewrites it to
  `./openspec-core.ts`); exported `handleMessage(msg, deps)` handling
  `initialize` (protocolVersion `2024-11-05`, serverInfo name
  `openspec`), `notifications/initialized`, `tools/list` (single tool
  `openspec_validate`, schema `{change?, cwd?}` — the `change` property
  and its description string copied verbatim from
  `opencode/index.ts:229-237`, plus the Codex-only optional `cwd`
  string property), `tools/call` (reads `arguments.change` AND
  `arguments.cwd` → `{content:[{type:"text",text:report}],
  isError:false}`; protocol-level errors only as JSON-RPC
  -32601/-32602); `main()` wiring `deps.validate = (change, cwd) =>
  validateProject(cwd ?? process.cwd(), change)`.
- [x] 3.2 Rework `tests/codex-mcp.test.ts` exercising `handleMessage`
  in-process with a stubbed `deps.validate`: tools/list returns exactly
  one tool named `openspec_validate` whose `change` property matches
  the OpenCode tool's property-for-property and which adds only the
  optional `cwd` string property ("Tool list exposes the
  openspec_validate tool"); tools/call with `{change, cwd}` returns the
  stub's report as text content for VALID and INVALID alike with no
  throw, the stub receives the passed `cwd`, and an absent `cwd` falls
  back to `process.cwd()` ("Tool call returns the one-look report"); a
  stub returning the `UNAVAILABLE:` string passes through as content
  ("Missing CLI surfaces as UNAVAILABLE").

Build result after group 3 alone: `npm test` passes including
`tests/codex-mcp.test.ts`; typecheck unchanged (`.mjs` outside include).

## 4. Bundle asset scripts: installer

- [x] 4.1 Extend the landed `codex/install-agents.mjs` (keep its code as
  the base) to the managed-file contract (design.md §2): marker
  detection — a target whose first line matches
  `# managed-by: oh-my-openspec@` is ours; `planAgentInstalls` gains the
  `update` status (differing managed target → replaced silently,
  reported as update) and `conflict` narrows to differing targets
  without the marker (refused per file, exit 1 unless `--force`, which
  overrides conflicts); print copy/skip/update counts. Extend
  `tests/codex-install.test.ts` over temp dirs: fresh copy, identical
  skip, differing unmanaged target refused with non-zero plan status,
  and `--force` overwrite ("Existing user agent files are never
  clobbered"); differing managed targets carrying the current or an
  older marker version planned `update` with exit zero and no `--force`
  ("Reinstall after plugin upgrade updates managed files").
- [x] 4.3 Delete `codex/alias-context.mjs` and `tests/codex-alias.test.ts`
  (task 4.2 is deleted by the alias descope); drop the hook-hash approval
  line from the `codex/install-agents.mjs` next-steps output — MCP
  approval + session restart remain (design.md §2); installer + its tests
  stay green.

Build result after group 4 alone: `npm test` passes including the
extended `tests/codex-install.test.ts` (marker detection + `update`
status); `codex/alias-context.mjs` and `tests/codex-alias.test.ts` no
longer exist and nothing references them.

## 5. Bundle generator, committed bundle, marketplace

- [x] 5.1 Rework the landed `codex/manifest.ts`: `renderMcpJson()` emits
  the proven launch form (design.md §4) — server `openspec` with
  `"type": "stdio"`, `command: "node"`, `args:
  ["./assets/mcp-server.mjs"]`, `"cwd": "./"` (title/description
  unchanged); `renderPluginJson(pkgVersion)` stays as pinned in
  design.md §1 (no `commands`, no `agents`, no `apps`, no `interface`,
  no `hooks`); each `JSON.stringify(x, null, 2) + "\n"`. No
  `renderHooksJson` — hooks were descoped (design.md §5). After the
  manifest change, rerun `make codex` so the committed tree matches
  again (the Makefile target itself, task 5.4, is unchanged).
- [x] 5.2 Rework the landed `codex/render.ts` (cache-containment fix,
  design.md §4): `renderBundle({out})` writes the full design.md §1 tree
  — seven TOMLs (group 1, `renderAgentToml` receiving the `package.json`
  version for the `# managed-by:` marker), five skills (group 2), two
  manifests (5.1), `assets/mcp-server.mjs` (copy of
  `codex/mcp-server.mjs` with the single import specifier rewritten
  `"../core/openspec.ts"` → `"./openspec-core.ts"`, throwing unless
  exactly one occurrence), `assets/openspec-core.ts` (verbatim copy of
  `core/openspec.ts`), a verbatim copy of `codex/install-agents.mjs`;
  deterministic (sorted order, LF, trailing newline); CLI `node
  codex/render.ts [--out <dir>]` defaulting to `plugins/oh-my-openspec`.
  (Landed pre-rounds-6/7: the vendored-skill copies and the archive
  wrapper are wired by task 5.6.)
- [x] 5.3 Write `.agents/plugins/marketplace.json` exactly as pinned in
  design.md §1.
- [x] 5.4 Rerun `make codex` (the `codex` target already landed in
  `Makefile`, design.md §6) and leave the regenerated
  `plugins/oh-my-openspec/` tree (17 files at that point, now including
  `assets/openspec-core.ts`) on disk for the user to commit. (Superseded
  by 5.6: the tree is 30 files after the vendored copies + archive
  wrapper land.)
- [x] 5.5 Rework `tests/codex-bundle.test.ts`: render into a temp dir
  and byte-compare every file plus file-list equality both ways against
  the committed bundle — exactly 17 files, no `hooks.json`, no
  `assets/alias-context.mjs` ("Bundle matches fresh render
  byte-for-byte"); assert the committed `.mcp.json` shape —
  `type: "stdio"`, `command: "node"`, `args:
  ["./assets/mcp-server.mjs"]`, `cwd: "./"`; assert
  `assets/openspec-core.ts` byte-equals `core/openspec.ts` and the
  rendered `assets/mcp-server.mjs` imports `./openspec-core.ts`; run
  the start-as-declared smoke from an unrelated cwd — spawn `node
  ./assets/mcp-server.mjs` with cwd = the committed tree root (or a
  temp-dir copy of it), send `initialize`, assert the handshake reply
  and no module-resolution escape error ("Launch form starts the server
  in the plugin cache"); assert
  no `core/*.ts` import references `codex/`, `opencode/`, or `plugins/`
  ("core never imports codex"); assert `plugin.json` version equals
  `package.json` version and every bundled role TOML's first-line
  `# managed-by: oh-my-openspec@` marker carries that same version;
  assert `package.json` still has no `bin` and
  its `files` array lacks `codex`/`plugins`, and `exports["."]` is
  `./opencode/index.ts` ("OpenCode gates stay green" — automated half).
  (The 17-file count here is superseded by task 5.6's 30-file list
  equality.)
- [x] 5.6 Extend `codex/render.ts`: copy the twelve
  `vendor/openspec/skills/` entries into the bundle `skills/` through
  the §3 substitution machinery + residual guard (phrase table empty
  for them today; frontmatter normalization to name+description only if
  the acceptance probe fails, per design.md §1), and write
  `skills/omos-archive/SKILL.md` from `renderArchiveSkill()` (2.5);
  rerun `make codex`. Extend `tests/codex-bundle.test.ts`: 30-file
  list equality, per-vendored-skill BODY byte-equality against
  `vendor/openspec/skills/` — any frontmatter transform asserted
  separately ("Vendored bundle copies track the vendor tree"), and
  namespaced-name sanity (each vendored dir holds exactly one
  SKILL.md).

Build result after group 5 alone: `make check` is fully green —
`scripts/check.mjs` unchanged prints `check: ok`, sync-vendor check,
typecheck, and the whole suite including the drift gate (30-file tree
after 5.6) and the start-as-declared launch smoke pass.

## 6. Docs and manual acceptance on Codex 0.163.0

- [x] 6.1 Rework `docs/codex.md`: install quickstart (marketplace add →
  plugin add → approve the `openspec` MCP server → restart → `/mcp`
  shows `openspec` live → `$omos-setup` or
  `node codex/install-agents.mjs` from a checkout), the `cwd`
  instruction (Codex roles pass the session project directory as `cwd`
  to `mcp__openspec__openspec_validate`; the OpenCode tool schema is
  unchanged), invocation table
  (`$omos-*` mentions + /skills picker only; no slash aliases) plus the
  note that next-step hints inside flows also use `$omos-` mentions
  (archive hints route to the project-level `$openspec-archive-change`
  skill),
  archive flow via `openspec init --tools codex` and its
  `openspec-archive-change` skill (landed text, superseded in round 6 —
  the scenario is now "Archive and per-step workflows come from the
  bundle" and the init instruction is removed by task 6.4), Node ≥ 22.18
  floor for the MCP server, the upgrade note "after `codex plugin
  marketplace upgrade`, run `$omos-setup` again", and the design.md §9
  acceptance checklist.
- [x] 6.2 Add to `AGENTS.md` the two convention lines pinned in
  design.md §7 (`codex/` may import `core/`, never the reverse;
  `plugins/` is generated by `make codex`, never hand-edited). Confirm
  every relative doc link added anywhere in this change resolves
  (check.mjs group 5).
- [x] 6.4 Update `docs/codex.md` AND the `README.md` Codex collapsible
  (README is normally outside this change's inventory — round 6
  explicitly brings docs/codex.md + the README collapsible into it,
  design.md §8): drop the `openspec init --tools codex` instruction —
  docs/codex.md "Archive flow" section and checklist step 6, and the
  README collapsible's "Archive is not bundled: run `openspec init
  --tools codex`…"/"ships the five flow skills; the 12 vendored
  upstream skills stay OpenCode-side" lines; state that the archive
  flow + the per-step upstream skills ship in the bundle with the
  parity line `/omos.archive` → `$omos-archive`, delegating to the
  bundled `$openspec-archive-change` (`$openspec-bulk-archive-change`
  for 2+ ids); invocation table gains the `$omos-archive` row and a
  row-group for the twelve vendored `oh-my-openspec:openspec-*`
  mentions; verify next-step hint wording against the rendered bodies
  ("Archive and per-step workflows come from the bundle" + "Archive
  surface mirrors OpenCode" — documentation halves).
- [x] 6.3 Execute the design.md §9 acceptance checklist (7 steps after
  the alias-descope renumbering) on Codex CLI 0.163.0 — run 2026-10-19,
  recorded: marketplace/plugin add passed via the LOCAL-PATH marketplace
  (steps 1–2: installed+enabled, cache tree 30 files, eighteen namespaced
  skills listed in-session); MCP live + validate-with-cwd reported on the
  target repo (step 3, via `codex exec` probes, no interactive approval
  prompt exercised); `$omos-setup` 7 copies → 7 skips → 1 update (step 4
  PASS, manual half of "Reinstall after plugin upgrade updates managed
  files"); full `$omos-plan` e2e executed by the USER in the real project
  ~/rust/github.com/alexeyco/herdr-open-in instead of the scratch repo
  (change `focus-terminal-editor` drafted with role waves via
  `spawn_agent`, 6/6 tasks, archived same day) — NOTE: that run used
  the pre-2.4 bundle and is what surfaced the `/omos.*` next-step hint
  leak fixed in rounds 5–7; the fixed bundle's hint behavior is pinned
  by the automated half of "Rendered bodies advertise no slash
  commands", its manual half (a live report line naming
  `$omos-apply <change-id>`) not yet re-observed post-fix;
  archive chain probed (`$omos-archive` wrapper → bundled
  `$openspec-archive-change`, gate line present, bare mention resolves
  from the bundle, no project-level init in the probe — `.agents` moved
  aside); final `make check` `check: ok` and `npm pack --dry-run` shows
  no `codex/`/`plugins/` entries, only `docs/codex.md` gained
  ("OpenCode gates stay green" — manual half).

Build result after group 6 alone: `node scripts/check.mjs` prints
`check: ok` (group 5 link check passes over the new docs), full `make
check` green, acceptance outcomes recorded.
