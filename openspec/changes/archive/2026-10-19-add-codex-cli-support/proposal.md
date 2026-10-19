# add-codex-cli-support — proposal

## Why

The plugin is OpenCode-only: the README Delivery row, the npm package, and
every runtime surface (agents, skills, commands, `openspec_validate` tool)
register through OpenCode's `ctx.*` transforms (opencode/index.ts:53-249).
The rename change explicitly deferred this: "Out of scope: Codex host
support (future change)"
(openspec/changes/archive/2026-10-19-rename-plugin-to-oh-my-openspec/proposal.md:81).
Codex CLI now offers every primitive the flows need — plugin marketplaces,
native subagents (`spawn_agent`/`wait_agent`, async, up to 6 concurrent
threads), skills invoked as `$name` mentions, and plugin MCP servers —
all verified locally on codex-cli 0.163.0. The governing principle
confirmed by the user: **the Codex experience must be as close as
possible to OpenCode** — same role prompts, same `openspec_validate`
contract, same flow skills.

## What Changes

- New `codex/` adapter layer, parallel to `opencode/`: renderers
  (role TOML, flow skills, manifests), a hand-rolled MCP stdio server
  wrapping `core/openspec.ts::validateProject`, and an idempotent role
  installer. `codex/` may import `core/`; `core/` never imports `codex/`.
- New generated, committed Codex plugin bundle at
  `plugins/oh-my-openspec/` (18 skills = 6 omos flow-family incl. the
  `$omos-archive` wrapper + 12 vendored upstream workflow skills copied
  from `vendor/openspec/skills/`, 7 role
  TOMLs with `SUBAGENT_CONTRACT` baked at render time, `.mcp.json`,
  `.codex-plugin/plugin.json`), byte-for-byte reproducible
  via `node codex/render.ts` (`make codex`), drift-gated by a test —
  the `vendor/` precedent.
- New `.agents/plugins/marketplace.json` at the repo root so
  `codex plugin marketplace add alexeyco/oh-my-openspec` +
  `codex plugin add oh-my-openspec@oh-my-openspec` install the plugin.
- `openspec_validate` reaches Codex sessions as
  `mcp__openspec__openspec_validate` with the identical
  VALID/INVALID/UNAVAILABLE/ERROR one-look report and the identical
  `change` property, plus one Codex-only optional `cwd` property — the
  live gate: roles pass the session project directory, and the launch
  form is pinned to the proven plugin-root shape (`"cwd": "./"`). The
  OpenCode tool schema stays `{change?}`, so role
  and skill prompts read the same on both hosts.
- Invocation surface: native `$omos-*` skill mentions and the /skills
  picker only — no slash-command aliases, no plugin hooks, no hook
  trust step.
- Archive flow and the per-step upstream workflows ship IN the bundle:
  the twelve vendored skills copied from `vendor/openspec/skills/` plus
  a `$omos-archive` wrapper single-sourced from
  `core/prompts.ts::archiveInstruction` — no project-level `openspec
  init` step for any part of the Codex experience; the vendor pipeline
  stays `--tools opencode` only (we copy its output, never re-render).
- New `docs/codex.md`, AGENTS.md convention lines, `make codex` target,
  `tsconfig.json` include for `codex/**/*.ts`, and unit tests for every
  renderer plus a manual acceptance checklist for Codex 0.163.0.

Decision note: `/omos.*` slash aliases were descoped by user re-decision mid-implementation — single invocation surface (`$omos-*` mentions + /skills picker), fewer moving parts, no hook trust step.

Decision note: acceptance step 1 (2026-10-19, Codex 0.163.0) exposed the cache-containment defect — Codex copies only the bundle directory into the plugin cache, so the rendered MCP server could not resolve `../../../core/openspec.ts` (`ERR_MODULE_NOT_FOUND`); the bundle (now 30 files) ships its own drift-gated verbatim copy `assets/openspec-core.ts`, keeping the zero-network stdio server self-contained like the curated plugins.

Decision note: Codex MCP launch form + tool-level cwd (discovered empirically on 0.163.0 after the no-cwd form proved unlaunchable — user approved the optional cwd parameter for schema parity-by-report).

Decision note: user-reported hint leak fixed by body substitution + fail-loud guard — the rendered bodies carried 16 slash-reference leaks (14 `/omos.*` + 2 `/openspec-<name>`), falsifying the first draft's "only one host-bound sentence" audit assumption; the pinned table now covers every host-bound sentence and any residual `/omos.` throws at render time.

Decision note: bundled-vendored-skills redesign (round 6, user-driven) — the per-project `openspec init --tools codex` delegation was rejected as inelegant UX ("as convenient as OpenCode; mixing two skill sets is a bad idea"); the bundle ships the twelve vendored upstream workflow skills itself, so installing the plugin gives the complete set; the residual guard + body byte-equality against `vendor/openspec/skills/` make bundling safe, and the vendor pipeline is unchanged (`--tools opencode` single render target — we copy its output, never re-render).

Decision note: `$omos-archive` wrapper (round 7, user-requested surface parity with `/omos.archive`) — single-sourced from `core/prompts.ts::archiveInstruction` (no content fork), delegating to the bundled `$openspec-archive-change` / `$openspec-bulk-archive-change` and carrying the validation gate line verbatim.

OpenCode runtime behavior is NOT changed. `package.json` (exports,
files, no bin), `scripts/check.mjs` (six groups), `opencode/`, `core/`,
`skills/`, `agents/`, and `vendor/` stay untouched; `README.md` gains
only the Codex-collapsible update (task 6.4) — the comparison table and
the rest of README positioning stay untouched and belong to a follow-up
change under public-positioning/comparison-freshness.

## Impact

- New capability: `codex-host-integration` (one delta spec, ADDED
  requirements only). No MODIFIED deltas against any live spec.
- Success metric: a manual run in Codex CLI 0.163.0 on the dev machine —
  a flow creates `openspec/changes/<id>/`, `mcp__openspec__openspec_validate`
  prints VALID, flows behave equivalently to the OpenCode flows; unit
  tests cover the `codex/` generators; no live-Codex CI.
- Out of scope: other hosts (Claude Code, Cursor), live Codex E2E in CI,
  any change to OpenCode behavior, upstream openspec CLI reimplementation,
  npm packaging changes.

ASSUMPTION: Codex version floor 0.117.0+ (post custom-prompt removal, plugins feature stable); behavior verified on 0.163.0 only (`codex --version → codex-cli 0.163.0`).
ASSUMPTION: the git marketplace ships from this repo root via `.agents/plugins/marketplace.json` pointing at `./plugins/oh-my-openspec` (`sed -n '103p;147p' ~/.codex/.tmp/plugins/.agents/skills/plugin-creator/references/plugin-json-spec.md → "Repo/team plugin: <repo-root>/.agents/plugins/marketplace.json"` and "Repo/team plugin: ./plugins/<plugin-name>"`).
ASSUMPTION: plugin MCP tools surface to the model as `mcp__<server>__<tool>`, so the bundled `openspec` server exposes `mcp__openspec__openspec_validate` (`strings /usr/local/bin/codex | grep -o 'mcp__[a-zA-Z_]*' → mcp__server__tool`).
ASSUMPTION: the Codex 0.163.0 skill loader accepts the extra vendored frontmatter keys (`allowed-tools: Bash(openspec:*)`, `license`, `compatibility` — openspec-archive-change/SKILL.md:1-6) in the bundled copies (untested — disproved if the loader rejects or stalls listing the bundled vendored skills; pinned fallback: the renderer normalizes frontmatter to name+description only for the vendored copies at render time, documented transform, and the drift gate asserts BODY (post-frontmatter bytes) equality against `vendor/openspec/skills/` instead of whole-file equality).
ASSUMPTION: a bare `$openspec-archive-change` mention resolves to the bundled vendored skill without the `oh-my-openspec:` namespace prefix (bundle skill mentions surfaced namespaced as `oh-my-openspec:omos-*`) (untested — disproved if acceptance step 6 finds only the namespaced form resolves; pinned fallback: the archive-hint replacements (design.md §3 entry 2 + the `/omos.archive` token mapping) and the wrapper's delegation lines switch to the namespaced form and re-render).
ASSUMPTION: the role installer runs from the installed bundle (`assets/install-agents.mjs`, located via `codex plugin marketplace list` roots) or from a repo checkout; npm `files`/`bin` stay unchanged so the npm package remains OpenCode-only.
