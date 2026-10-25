# Codex host integration

## Purpose

Integrate OpenAI Codex CLI as a second host alongside OpenCode: a generated
plugin bundle (six flow skills, twelve vendored upstream workflow skills,
seven role TOMLs, and an MCP `openspec_validate` server), distributed from
this repository as a git marketplace, keeping the user experience as close
to the OpenCode flows as the host allows while the OpenCode path stays
untouched.

## Requirements

### Requirement: Generated Codex plugin bundle and git-marketplace delivery

The repository SHALL ship a Codex plugin bundle at
`plugins/oh-my-openspec/` generated entirely by `node codex/render.ts`
from the single-source assets (`agents/*.md` via `core/roles.ts`,
`skills/*/SKILL.md`, `vendor/openspec/skills/`, `core/prompts.ts`,
`core/openspec.ts`, and the `codex/` sources), and
the committed tree SHALL match a fresh render byte-for-byte, gated by
`tests/codex-bundle.test.ts`. The repo root SHALL carry
`.agents/plugins/marketplace.json` declaring the plugin
`oh-my-openspec` with `source.path` `./plugins/oh-my-openspec`, a
`policy` block (`installation: AVAILABLE`, `authentication:
ON_INSTALL`), and a `category`, so that `codex plugin marketplace add
alexeyco/oh-my-openspec` followed by `codex plugin add
oh-my-openspec@oh-my-openspec` installs it. The bundle manifest
`.codex-plugin/plugin.json` SHALL use only spec-permitted fields
(`name`, `version` mirroring `package.json`, `description`, `author`,
`homepage`, `repository`, `license`, `keywords`, `skills`,
`mcpServers`, and `interface`) and SHALL NOT declare `commands` or
`agents` fields — the Codex manifest has none — nor a `hooks` field,
since no hooks ship. Its `interface` SHALL contain `displayName`,
`shortDescription`, and `composerIcon` pointing to `./assets/icon.svg`.
The square SVG at `assets/icon.svg` SHALL have dimensions of at least
48 by 48 pixels and be smaller than 50 KiB. The
bundle SHALL contain exactly six flow-family skills (`omos-init`,
`omos-plan`, `omos-apply`, `omos-retro`, `omos-archive`, `omos-setup`),
the twelve
vendored upstream workflow skills under `skills/` copied verbatim from
`vendor/openspec/skills/` (subject to the documented frontmatter
normalization only if the Codex loader requires it), seven role TOMLs
under `assets/agents/`, `assets/mcp-server.mjs`,
`assets/openspec-core.ts` (a verbatim copy of `core/openspec.ts`),
`assets/install-agents.mjs`, `assets/icon.svg`, and `.mcp.json` —
thirty-one files, no
`hooks.json`, no alias-mapping script.

#### Scenario: Bundle matches fresh render byte-for-byte

- **WHEN** `tests/codex-bundle.test.ts` renders the bundle into a
  temporary directory and compares it with the committed
  `plugins/oh-my-openspec/` tree
- **THEN** the file lists are equal both ways and every file is
  byte-identical, or the test fails naming the drifted files

#### Scenario: Marketplace install succeeds on Codex 0.164.0

- **WHEN** a user runs `codex plugin marketplace add
<local-checkout-path>` for the current checkout and then runs
  `codex plugin add oh-my-openspec@oh-my-openspec` on Codex CLI
  0.164.0
- **THEN** the plugin is listed as installed, its six flow-family
  skills are visible namespaced `oh-my-openspec:omos-*` alongside the
  twelve vendored `openspec-*` skills, and the plugin cache tree holds
  exactly the 31 bundle files, and the manifest's icon path resolves
  inside the plugin cache (manual acceptance steps 1–2)

#### Scenario: Vendored bundle copies track the vendor tree

- **WHEN** `tests/codex-bundle.test.ts` compares each bundled vendored
  skill against its source in `vendor/openspec/skills/`
- **THEN** the bodies (post-frontmatter bytes) match byte-for-byte —
  any frontmatter transform is asserted separately — so one vendor
  sync refreshes both hosts

#### Scenario: Catalog interface references the bundled icon

- **WHEN** the plugin manifest is read from a fresh bundle render
- **THEN** its `interface` contains `displayName`, `shortDescription`,
  and `composerIcon: "./assets/icon.svg"`, and the referenced square
  SVG exists in the bundle, has dimensions of at least 48 by 48, and
  is smaller than 50 KiB

### Requirement: Catalog security policy and scanner workflow

Root `SECURITY.md` SHALL direct vulnerability reports to GitHub Security
Advisories and discourage public disclosure before a fix. Each remote
`uses:` reference under `.github/workflows/` SHALL pin a full commit SHA
and retain a release comment. `.github/workflows/hol-plugin-scanner.yml`
SHALL run on pull requests and pushes to `master`, use the catalog's
reviewed scanner action, set `min_score: 80`, and upload SARIF with the
permissions required by the scanner.

#### Scenario: Security policy gives a private reporting route

- **WHEN** a user finds a security vulnerability in the repository
- **THEN** `SECURITY.md` directs them to GitHub Security Advisories for
  private reporting and tells them not to disclose the issue in a public
  issue before a fix is available

#### Scenario: Scanner checks pull requests and default-branch pushes

- **WHEN** a pull request targets `master` or a commit is pushed to
  `master`
- **THEN** the HOL Plugin Scanner workflow runs with `min_score: 80`,
  produces a SARIF report, and uploads it using the scanner action

#### Scenario: All workflow actions use immutable references

- **WHEN** a maintainer reads every `uses:` entry in
  `.github/workflows/*.yml`
- **THEN** each action reference is a full commit SHA with its release
  version retained in a comment, including checkout, setup-node,
  create-pull-request, and the HOL Plugin Scanner action

### Requirement: Role agents rendered to TOML with the contract baked in

The renderer SHALL map each of the seven `agents/*.md` roles to
`plugins/oh-my-openspec/assets/agents/<role-id>.toml`. Each rendered
TOML SHALL start with the provenance comment line
`# managed-by: oh-my-openspec@<package.json version>` — whose version
equals the bundle manifest `.codex-plugin/plugin.json` version —
followed by a document with exactly the keys `name` (role id),
`description` (frontmatter description), and `developer_instructions`
(trimmed body, a blank line, then `SUBAGENT_CONTRACT` from
`core/prompts.ts` verbatim, baked at render time). Rendered TOML SHALL
pin no model, sandbox, or approval keys — Codex sessions inherit them.
Multi-line values SHALL use TOML multi-line basic strings with
backslashes, runs of three or more quotes, and control characters
escaped. `assets/install-agents.mjs` — driven in-session by the
`omos-setup` skill or run from a checkout — SHALL install the seven
TOMLs into `~/.codex/agents/` idempotently and re-runnably:
`planAgentInstalls` SHALL yield per file `copy` (absent target), `skip`
(byte-identical target), `update` (differing target whose first line
carries our `# managed-by:` marker — replaced silently and reported as
an update), or `conflict` (differing target without the marker —
refused with a per-file report and a non-zero exit unless `--force` is
given), so user files the installer did not create are never clobbered
while managed files are refreshed after a plugin upgrade.

#### Scenario: Developer instructions end with the shared contract

- **WHEN** any of the seven real roles is rendered
- **THEN** `developer_instructions` equals the trimmed role body, a
  blank line, and the `SUBAGENT_CONTRACT` text verbatim, and the
  document contains no `model` key

#### Scenario: Hostile body content stays valid TOML

- **WHEN** a role body contains `"""`, backslashes, or control
  characters
- **THEN** the emitter escapes them (`\` → `\\`, every quote in a run of
  three or more → `\"`, control characters other than `\n`/`\t` →
  `\uXXXX`), the emitted values contain no unescaped three-quote run,
  and the document keeps exactly the three required keys

#### Scenario: Existing user agent files are never clobbered

- **WHEN** the installer runs against a `~/.codex/agents/` holding a
  differing `omos-planner.toml` WITHOUT our `# managed-by:` marker and
  an identical `omos-critic.toml`
- **THEN** it copies nothing for the conflict, skips the identical file,
  reports the conflict per file, and exits non-zero unless `--force` was
  given

#### Scenario: Reinstall after plugin upgrade updates managed files

- **WHEN** the installer runs against targets whose files differ from
  the fresh render and all carry the current or an older
  `# managed-by: oh-my-openspec@` marker
- **THEN** every differing managed file is planned `update`, identical
  ones are planned `skip`, the run exits zero, and no `--force` is
  needed

### Requirement: Flow skills rendered with Codex-native primitives, never forked

The renderer SHALL produce the Codex `SKILL.md` for the four flow skills
from the same `skills/<id>/SKILL.md` sources OpenCode registers, by
prepending the generated host-adaptation header from `codex/skills.ts`
(spawn_agent/send_input/wait_agent/close_agent semantics with the async
default of up to six concurrent threads; `openspec_validate` exposed as
`mcp__openspec__openspec_validate` and called with `cwd` set to the
session's project directory; the `$oh-my-openspec:omos-*` mention as the only
invocation shape; arguments as plain text after the mention with no
substitution) and by applying the pinned substitution machinery: a
phrase table carrying an entry for every host-bound sentence — the
OpenCode dispatch sentence at `skills/omos-apply/SKILL.md:47-49`
replaced with its `spawn_agent`/`wait_agent` equivalent, and the
next-step hint sentences rewritten to the Codex reality — followed by a
whole-body token pass swapping `/omos.init`, `/omos.plan`,
`/omos.apply`, `/omos.retro`, and `/omos.archive` to their
`$oh-my-openspec:omos-*` mention forms.
After both passes the renderer SHALL fail naming the phrase when any
`/omos.` text remains in the body. Rendering SHALL fail when a
substitution key is absent from its source file. The OpenCode `skills/`
files SHALL NOT be modified by this path.

#### Scenario: Rendered flow skill carries the Codex host header

- **WHEN** any flow skill is rendered into the bundle
- **THEN** its body starts with the `CODEX_SKILL_HEADER` blockquote
  naming `spawn_agent`/`wait_agent` dispatch, the
  `mcp__openspec__openspec_validate` tool, the no-argument-substitution
  rule, and the `$oh-my-openspec:omos-setup` remedy for missing role TOMLs

#### Scenario: OpenCode dispatch sentence is replaced

- **WHEN** `skills/omos-apply/SKILL.md` is rendered
- **THEN** the output no longer contains "On OpenCode the batch is one
  set of background dispatches" and instead carries the `spawn_agent`
  batch / `wait_agent` collection sentence, with every other line of the
  source body unchanged

#### Scenario: Removed substitution key fails the build

- **WHEN** a substitution key string disappears from its source skill
  file
- **THEN** `renderBundle` throws naming the missing key and
  `tests/codex-skills.test.ts` fails before any bundle is written

#### Scenario: Rendered bodies advertise no slash commands

- **WHEN** any flow skill is rendered
- **THEN** its body contains no `/omos.` text and every plugin-owned
  next-step hint names a `$oh-my-openspec:omos-*` mention, with archive
  hints naming `$oh-my-openspec:omos-archive`
- **WHEN** a source skill grows a `/omos.` reference the token pass and
  the pinned table cannot cover, leaving a residual after substitution
- **THEN** rendering throws naming the phrase, so slash hints can never
  silently leak into Codex

### Requirement: openspec_validate parity via bundled MCP stdio server

The bundle SHALL declare in `.mcp.json` a stdio MCP server named
`openspec` with `type: "stdio"`, `command: "node"`, `args:
["./assets/mcp-server.mjs"]`, and `cwd: "./"` — the plugin-root-relative
launch form proven live on Codex 0.163.0; the no-`cwd` form proved
unlaunchable there (node resolves the `args` strings against the session
project cwd, where the bundle-relative path does not exist). The
server SHALL be a hand-rolled newline-delimited JSON-RPC 2.0 stdio loop
with zero new npm dependencies. The source `codex/mcp-server.mjs` SHALL
import `core/openspec.ts::validateProject` for unit tests, and the
rendered `assets/mcp-server.mjs` SHALL import `./openspec-core.ts` — the
bundle's verbatim copy of `core/openspec.ts` — with the renderer failing
unless it rewrites that specifier exactly once. The server SHALL expose
exactly one tool `openspec_validate` whose input schema is
`{ change?: string, cwd?: string }` — `cwd` is an absolute project
directory and defaults to the server's working directory when absent,
and the `change` property's description string is copied verbatim from
`opencode/index.ts:229-237`. The OpenCode tool's schema stays
`{ change?: string }`: the added OPTIONAL `cwd` property exists only in
the Codex MCP surface. The tool's result SHALL be the identical
VALID/INVALID/UNAVAILABLE/ERROR one-look report as text content —
outcome is content, never a throw; JSON-RPC errors are reserved for
protocol-level failures. In Codex sessions the tool SHALL surface as
`mcp__openspec__openspec_validate`.

#### Scenario: Tool list exposes the openspec_validate tool

- **WHEN** the server handles `tools/list`
- **THEN** the response holds exactly one tool named `openspec_validate`
  whose `change` property matches the OpenCode tool's
  property-for-property and which adds only the optional `cwd` string
  property

#### Scenario: Tool call returns the one-look report

- **WHEN** the server handles `tools/call` for `openspec_validate` with
  arguments `{change: "some-id", cwd: "/abs/project"}`
- **THEN** the response content is the text
  `validateProject(cwd ?? process.cwd(), change)` produced — no
  exception escapes for INVALID, UNAVAILABLE, or ERROR outcomes

#### Scenario: Missing CLI surfaces as UNAVAILABLE

- **WHEN** the `openspec` binary is absent from PATH and
  `openspec_validate` is called
- **THEN** the tool content begins `UNAVAILABLE:` and carries the
  install offer, exactly as `core/openspec.ts:160-162` formats it

#### Scenario: Launch form starts the server in the plugin cache

- **WHEN** a copy of the committed bundle tree is spawned exactly as
  `.mcp.json` declares — `node ./assets/mcp-server.mjs` with the working
  directory set to the bundle root — from an unrelated working
  directory
- **THEN** the process runs with its cwd at the bundle root and the
  `initialize` handshake completes; this is the drift gate's launch
  smoke

### Requirement: Invocation surface — guaranteed mentions only

The invocation surface SHALL be the six `$oh-my-openspec:omos-*` skill mentions
(`$oh-my-openspec:omos-init`, `$oh-my-openspec:omos-plan`,
`$oh-my-openspec:omos-apply`, `$oh-my-openspec:omos-retro`,
`$oh-my-openspec:omos-archive`, `$oh-my-openspec:omos-setup`), the /skills picker, and the twelve
bundled `$openspec-*` vendored-skill mentions for the upstream
workflows, and nothing else: the bundle SHALL NOT ship `hooks.json`, any
alias-mapping hook script, or any `/omos.*` slash-alias advertisement —
the alias hint previously advertised in rendered descriptions
(`/omos.<flow>`) is no longer emitted (descoped by user re-decision
mid-implementation). Each rendered flow skill's description SHALL append
a mention hint ending `Invoke via $<id>.`. The archive flow and the
per-step upstream workflows are served by the bundled vendored skills
copied from `vendor/openspec/skills/`; no project-level `openspec init
--tools codex` is required for any part of the Codex experience.

#### Scenario: Descriptions advertise the mention form

- **WHEN** a flow skill is rendered
- **THEN** its frontmatter description ends with `Invoke via $<id>.`
  for its own skill id, contains no `/omos.` text, and the frontmatter
  still passes `validateSkillDoc`

#### Scenario: Archive and per-step workflows come from the bundle

- **WHEN** a Codex user needs the archive flow
- **THEN** `$openspec-archive-change` (bare or bundled-namespaced form
  per acceptance) resolves from the installed plugin bundle with no
  project-level `openspec init`, `docs/codex.md` no longer instructs
  `init --tools codex`, and the bulk archive skill ships the same way

#### Scenario: Archive surface mirrors OpenCode

- **WHEN** a Codex user invokes `$oh-my-openspec:omos-archive`
- **THEN** the wrapper resolves from the bundle, delegates to the
  bundled `$openspec-archive-change` skill
  (`$openspec-bulk-archive-change` for two or more change ids), and its
  instruction carries the validation gate line verbatim from
  `core/prompts.ts::archiveInstruction`

The Codex renderer in `codex/skills.ts` SHALL transform the shared apply
recommendation `/omos.archive <change-id>` into
`$oh-my-openspec:omos-archive <change-id>`, without changing
`skills/omos-apply/SKILL.md`. Codex-generated recommendations for every
other plugin-owned skill SHALL also use the `$oh-my-openspec:<skill-id>`
form. The renderer's substitutions SHALL be pinned by
`tests/codex-skills.test.ts`.

#### Scenario: Renderer adapts the apply archive recommendation

- **WHEN** a Codex user completes the apply flow
- **THEN** `codex/skills.ts` renders the shared `/omos.archive <change-id>` recommendation as `$oh-my-openspec:omos-archive <change-id>` and `tests/codex-skills.test.ts` asserts the rendered text

#### Scenario: Plugin skill recommendations are namespaced

- **WHEN** a Codex-generated skill recommends another skill shipped by this plugin
- **THEN** the mention uses `$oh-my-openspec:<skill-id>`

#### Scenario: Shared apply source retains its host-neutral command

- **WHEN** the OpenCode apply source skill is read
- **THEN** `skills/omos-apply/SKILL.md` recommends `/omos.archive <change-id>` and does not contain the Codex-only `$oh-my-openspec:omos-archive` form

### Requirement: Host isolation keeps the OpenCode path intact

`core/` SHALL NOT import from `codex/`, `opencode/`, or `plugins/`,
enforced by an import-direction assertion in
`tests/codex-bundle.test.ts`; `codex/` SHALL import only `core/` and
Node builtins. `package.json` SHALL keep `exports["."]` as
`./opencode/index.ts` and its `files` allow-list unchanged, with no
`bin` entry — the npm package remains OpenCode-only.
`scripts/check.mjs` SHALL remain six invariant groups, with the Codex
drift gate living in `tests/` under the existing `npm test` glob, and
the vendor pipeline SHALL stay `openspec init --tools opencode` only.
After bundle regeneration, `make check` SHALL print `check: ok` with all
pre-existing tests passing.

#### Scenario: core never imports codex

- **WHEN** `tests/codex-bundle.test.ts` scans the import statements of
  every `core/*.ts` file
- **THEN** no import references `codex/`, `opencode/`, or `plugins/`

#### Scenario: OpenCode gates stay green

- **WHEN** `make codex` has regenerated the bundle and `make check` runs
- **THEN** `scripts/check.mjs` prints `check: ok` unchanged, the
  pre-existing OpenCode test suite passes, and `npm pack --dry-run`
  lists no `codex` or `plugins` entries
