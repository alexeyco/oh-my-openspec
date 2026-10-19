# skill-registration — delta for rename-plugin-to-oh-my-openspec

## MODIFIED Requirements

### Requirement: Flow skills registered from fixed ids

The plugin SHALL register exactly the four flow skills named in
`FLOW_SKILL_IDS` (`omos-init`, `omos-plan`, `omos-apply`,
`omos-retro`), each read from `skills/<id>/SKILL.md`
(opencode/index.ts:39-44,90-95). Each flow skill's frontmatter `name` SHALL
equal its directory id and its body SHALL be non-empty, as enforced by the
assets test (tests/assets.test.ts:52-60).

#### Scenario: Flow skill added to host catalog

- **WHEN** plugin setup runs the skill transform
- **THEN** a `Skill.Info` is added for each of the four ids using the doc's frontmatter `name`/`description` and the file body as content (opencode/index.ts:101-115)

### Requirement: Startup integrity gate against the manifest

Before registering any skill, the plugin SHALL compare the discovered vendored
ids against `manifest.skills`; if the counts differ or any id differs at any
position, setup SHALL throw
`oh-my-openspec: vendor/openspec tree does not match its manifest — run `make sync``
(opencode/index.ts:79-88). The assets test additionally asserts the sorted
disk ids equal the sorted manifest ids and that at least 12 skills are
vendored (tests/assets.test.ts:114-118).

#### Scenario: Hand-edited vendor tree blocks startup

- **WHEN** a skill directory is added under `vendor/openspec/skills/` without regenerating the manifest
- **THEN** plugin setup throws the "run `make sync`" error instead of registering a partial catalog
