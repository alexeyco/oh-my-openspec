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

The repository SHALL generate the Codex bundle from its single-source assets, keep the committed bundle byte-identical to a fresh render, and publish it through the declared marketplace manifest with the required plugin metadata and exact file set.

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

### Requirement: Codex catalog listing metadata

The Codex listing SHALL include all required package metadata and document
the URL requirements for its current MCP submission type.

#### Scenario: Required catalog metadata and icon are bundled

- **WHEN** the Codex bundle is rendered
- **THEN** its manifest contains non-empty `longDescription`,
  `developerName`, `category`, and `capabilities`, sets `logo` and
  `composerIcon` to `./assets/icon.svg`, and the referenced square SVG is
  included in the bundle

#### Scenario: Documentation explains conditional remote MCP URL requirements

- **WHEN** a maintainer reads `docs/codex.md` about Codex listing metadata
- **THEN** it names `websiteURL`, `supportURL`, `privacyPolicyURL`, and
  `termsOfServiceURL`, states that these accessible HTTPS URLs are
  required for an attached remote MCP app submitted for public MCP review,
  and says they are not required for the current local stdio package

#### Scenario: Local stdio MCP does not require remote-service URLs

- **WHEN** the bundled plugin uses the current local stdio MCP server
- **THEN** its listing metadata omits `websiteURL`, `supportURL`,
  `privacyPolicyURL`, and `termsOfServiceURL`

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

The renderer SHALL produce seven managed role TOMLs with the role metadata and shared contract, no model or sandbox pins, and correctly escaped values. The installer SHALL safely copy, skip, update managed files, and refuse unmanaged conflicts unless forced.

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

Codex flow skills SHALL be generated from the OpenCode sources with host-specific dispatch and mention substitutions. Rendering SHALL fail when a required substitution is absent or an OpenCode slash alias remains.

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

The bundle SHALL expose one stdio MCP tool, openspec_validate, with optional change and cwd inputs and the shared VALID/INVALID/UNAVAILABLE/ERROR text report. The server SHALL use the bundled core implementation and add no npm dependency.

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

The Codex invocation surface SHALL include the six plugin skill mentions, the skills picker, and twelve vendored skill mentions only; it SHALL advertise no hooks or slash aliases, and rendered descriptions SHALL end with the supported mention hint.

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

Core SHALL import no host adapters, Codex SHALL depend only on core and Node builtins, and the npm package SHALL remain OpenCode-only. Codex bundle checks SHALL stay in the existing test gate.

#### Scenario: core never imports codex

- **WHEN** `tests/codex-bundle.test.ts` scans the import statements of
  every `core/*.ts` file
- **THEN** no import references `codex/`, `opencode/`, or `plugins/`

#### Scenario: OpenCode gates stay green

- **WHEN** `make codex` has regenerated the bundle and `make check` runs
- **THEN** `scripts/check.mjs` prints `check: ok` unchanged, the
  pre-existing OpenCode test suite passes, and `npm pack --dry-run`
  lists no `codex` or `plugins` entries
