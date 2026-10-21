## MODIFIED Requirements

### Requirement: Invocation surface — guaranteed mentions only

The invocation surface SHALL be the six `$omos-*` skill mentions
(`$omos-init`, `$omos-plan`, `$omos-apply`, `$omos-retro`,
`$omos-archive`, `$omos-setup`), the /skills picker, and the twelve
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

The Codex renderer in `codex/skills.ts` SHALL transform the shared apply recommendation `/omos.archive <change-id>` into `$oh-my-openspec:omos-archive <change-id>`, without changing `skills/omos-apply/SKILL.md`. Codex-generated recommendations for every other plugin-owned skill SHALL also use the `$oh-my-openspec:<skill-id>` form. The renderer's substitutions SHALL be pinned by `tests/codex-skills.test.ts`.

#### Scenario: Renderer adapts the apply archive recommendation

- **WHEN** a Codex user completes the apply flow
- **THEN** `codex/skills.ts` renders the shared `/omos.archive <change-id>` recommendation as `$oh-my-openspec:omos-archive <change-id>` and `tests/codex-skills.test.ts` asserts the rendered text

#### Scenario: Plugin skill recommendations are namespaced

- **WHEN** a Codex-generated skill recommends another skill shipped by this plugin
- **THEN** the mention uses `$oh-my-openspec:<skill-id>`

#### Scenario: Shared apply source retains its host-neutral command

- **WHEN** the OpenCode apply source skill is read
- **THEN** `skills/omos-apply/SKILL.md` recommends `/omos.archive <change-id>` and does not contain the Codex-only `$oh-my-openspec:omos-archive` form

#### Scenario: Descriptions advertise the mention form

- **WHEN** a flow skill is rendered
- **THEN** its frontmatter description ends with `Invoke via $<id>.`
  for its own skill id, contains no `/omos.` text, and the frontmatter
  still passes `validateSkillDoc`

#### Scenario: Archive and per-step workflows come from the bundle

- **WHEN** a Codex user needs the archive flow
- **THEN** `$oh-my-openspec:omos-archive` resolves from the installed
  plugin bundle with no project-level `openspec init`,
  `docs/codex.md` no longer instructs `init --tools codex`, and the
  wrapper delegates to the bundled single or bulk archive skill

#### Scenario: Archive surface mirrors OpenCode

- **WHEN** a Codex user invokes `$oh-my-openspec:omos-archive`
- **THEN** the wrapper resolves from the bundle, delegates to the
  bundled `$openspec-archive-change` skill
  (`$openspec-bulk-archive-change` for two or more change ids), and its
  instruction carries the validation gate line verbatim from
  `core/prompts.ts::archiveInstruction`
