## MODIFIED Requirements

### Requirement: Flow skills registered from fixed ids

The plugin SHALL register exactly the five flow skills named in
`FLOW_SKILL_IDS` (`omos-init`, `omos-plan`, `omos-quick`, `omos-apply`,
`omos-retro`), each read from `skills/<id>/SKILL.md`. Each flow skill's
frontmatter `name` SHALL equal its directory id and its body SHALL be
non-empty.

#### Scenario: Quick flow skill added to host catalog

- **WHEN** plugin setup runs the skill transform
- **THEN** a `Skill.Info` is added for `omos-quick` using the doc's
  frontmatter `name` and `description` and its body as content

#### Scenario: Flow skill added to host catalog

- **WHEN** plugin setup runs the skill transform
- **THEN** a `Skill.Info` is added for each of the five ids using the doc's
  frontmatter `name`/`description` and the file body as content

### Requirement: Vendored skills discovered from manifest and disk

Vendored skill ids SHALL be discovered by scanning `vendor/openspec/skills/`
for subdirectories containing a readable `SKILL.md`, sorted for deterministic
order, and the manifest SHALL be validated at load: `package`, `version`,
`generatedBy` must be strings and `skills` must be an array of strings,
otherwise loading throws. The current manifest vendors 12 upstream skills,
for 17 skills total with the flow set.

#### Scenario: Unreadable SKILL.md directory skipped in discovery

- **WHEN** a directory under `vendor/openspec/skills/` has no readable `SKILL.md`
- **THEN** `listVendoredSkillIds` omits it

#### Scenario: Manifest shape enforced

- **WHEN** `manifest.json` lacks a string `generatedBy` or has a non-string entry in `skills`
- **THEN** `loadVendorManifest` throws with the key named in the message

### Requirement: Catalog reload after transform

After all skill entries are added, the plugin SHALL call `ctx.skill.reload()`
once so the host picks up the full catalog.

#### Scenario: Skills visible post-setup

- **WHEN** plugin setup completes without throwing
- **THEN** the host skill catalog includes the five flow skills and every
  vendored skill id, in manifest order after the flow skills
