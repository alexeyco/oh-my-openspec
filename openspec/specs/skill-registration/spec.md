# skill-registration

## Purpose

Defines how the plugin registers its skill catalog with OpenCode: four
orchestration "flow" skills authored in this repository (`openspec-init`,
`openspec-plan`, `openspec-apply`, `openspec-retro`) plus the vendored
upstream OpenSpec workflow skills generated under `vendor/openspec/`.
Registration reads each `SKILL.md`, validates its frontmatter, and adds the
parsed skill to the host. A startup integrity gate compares the vendored
directory on disk against `vendor/openspec/manifest.json` and refuses to
load on any mismatch, so a stale or hand-edited vendor tree surfaces
immediately with an actionable message.

## Requirements

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

### Requirement: Vendored skills discovered from manifest and disk

Vendored skill ids SHALL be discovered by scanning `vendor/openspec/skills/`
for subdirectories containing a readable `SKILL.md`, sorted for deterministic
order (core/vendor.ts:39-49), and the manifest SHALL be validated at load:
`package`, `version`, `generatedBy` must be strings and `skills` must be an
array of strings, otherwise loading throws (core/vendor.ts:19-35). The
current manifest vendors 12 upstream skills (vendor/openspec/manifest.json),
for 16 skills total with the flow set.

#### Scenario: Unreadable SKILL.md directory skipped in discovery

- **WHEN** a directory under `vendor/openspec/skills/` has no readable `SKILL.md`
- **THEN** `listVendoredSkillIds` omits it (core/vendor.ts:42-48,51-57)

#### Scenario: Manifest shape enforced

- **WHEN** `manifest.json` lacks a string `generatedBy` or has a non-string entry in `skills`
- **THEN** `loadVendorManifest` throws with the key named in the message (core/vendor.ts:26-33)

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

### Requirement: SKILL.md frontmatter validation

Every registered `SKILL.md` (flow and vendored) SHALL be parsed with the
shared markdown parser and validated: frontmatter must be an object with
string `name` and string `description`, otherwise setup throws
(core/markdown.ts:85-97, opencode/index.ts:101-105). A vendored skill's
frontmatter SHALL also carry `metadata.generatedBy` equal to the manifest's
`generatedBy`, checked by the assets test (core/markdown.ts:101-111,
tests/assets.test.ts:120-135).

#### Scenario: Skill missing description

- **WHEN** a `SKILL.md` frontmatter has `name` but no `description`
- **THEN** setup throws `skill doc: frontmatter missing string 'description'`

### Requirement: Catalog reload after transform

After all skill entries are added, the plugin SHALL call `ctx.skill.reload()`
once so the host picks up the full catalog (opencode/index.ts:118).

#### Scenario: Skills visible post-setup

- **WHEN** plugin setup completes without throwing
- **THEN** the host skill catalog includes the four flow skills and every vendored skill id, in manifest order after the flow skills (opencode/index.ts:90-118)

UNVERIFIED: Which skill the host ultimately serves when a vendored id also
exists as a project-local skill written by `openspec init` is decided by the
host's resolution ("the host resolves one of them", opencode/index.ts:76-78)
— the plugin itself registers only its own copies and does not observe the
outcome.
