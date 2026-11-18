## MODIFIED Requirements

### Requirement: Invocation surface — guaranteed mentions only

The Codex invocation surface SHALL include the seven plugin skill mentions,
the skills picker, and twelve vendored skill mentions only; it SHALL advertise
no hooks or slash aliases, and rendered descriptions SHALL end with the
supported mention hint.

#### Scenario: Quick flow is available as a Codex mention

- **WHEN** the Codex plugin bundle is rendered
- **THEN** it includes `omos-quick` with a description ending in
  `Invoke via $oh-my-openspec:omos-quick.` and the rendered body contains no
  OpenCode slash command alias

#### Scenario: Descriptions advertise the mention form

- **WHEN** a flow skill is rendered
- **THEN** its frontmatter description ends with `Invoke via $<id>.` for its
  own skill id, contains no `/omos.` text, and the frontmatter still passes
  `validateSkillDoc`

#### Scenario: Archive and per-step workflows come from the bundle

- **WHEN** a Codex user needs the archive flow
- **THEN** `$openspec-archive-change` resolves from the installed plugin
  bundle with no project-level `openspec init`, `docs/codex.md` does not
  instruct `init --tools codex`, and the bulk archive skill ships the same way

#### Scenario: Archive surface mirrors OpenCode

- **WHEN** a Codex user invokes `$oh-my-openspec:omos-archive`
- **THEN** the wrapper resolves from the bundle, delegates to the bundled
  `$openspec-archive-change` skill (`$openspec-bulk-archive-change` for two
  or more change ids), and its instruction carries the validation gate line
  verbatim from `core/prompts.ts::archiveInstruction`

#### Scenario: Renderer adapts the apply archive recommendation

- **WHEN** a Codex user completes the apply flow
- **THEN** `codex/skills.ts` renders `/omos.archive <change-id>` as
  `$oh-my-openspec:omos-archive <change-id>` and the Codex skill test asserts
  the rendered text

#### Scenario: Plugin skill recommendations are namespaced

- **WHEN** a Codex-generated skill recommends another skill shipped by this
  plugin
- **THEN** the mention uses `$oh-my-openspec:<skill-id>`

#### Scenario: Shared apply source retains its host-neutral command

- **WHEN** the OpenCode apply source skill is read
- **THEN** `skills/omos-apply/SKILL.md` recommends `/omos.archive
<change-id>` and does not contain the Codex-only
  `$oh-my-openspec:omos-archive` form

### Requirement: Generated Codex plugin bundle and git-marketplace delivery

The repository SHALL generate the Codex bundle from its single-source assets,
keep the committed bundle byte-identical to a fresh render, and publish it
through the declared marketplace manifest with the required plugin metadata
and exact file set.

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
- **THEN** the plugin is listed as installed, its seven flow-family
  skills are visible namespaced `oh-my-openspec:omos-*` alongside the
  twelve vendored `openspec-*` skills, and the plugin cache tree holds
  exactly the 32 bundle files, and the manifest's icon path resolves
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
