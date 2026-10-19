# release-publishing — delta for rename-plugin-to-oh-my-openspec

## MODIFIED Requirements

### Requirement: check.mjs enforces six invariant groups

`scripts/check.mjs` SHALL verify, collecting all failures before exiting 1 with
`✗`-prefixed lines: (1) `package.json` shape — required keys, `"type":
"module"`, exports, files array with existing paths, test/typecheck scripts,
`@fission-ai/openspec` as devDependency (`scripts/check.mjs:28-67`);
(2) `ROLE_IDS` equals the set of `agents/*.md` with valid subagent frontmatter
and no model pins (`:69-102`); (3) `FLOW_SKILL_IDS` matches `skills/` on disk
both ways (`:104-138`); (4) the vendor tree matches its manifest, each skill is
self-stamped with `generatedBy`, and `package.json` version mirrors the
manifest (`:140-197`); (5) relative links in README/CONTRIBUTING/AGENTS resolve
(`:199-218`); (6) plugin id is `"oh-my-openspec"` and no stray `pi` section
exists in `package.json` (`:220-229`).

#### Scenario: All invariants hold

- **WHEN** every group passes
- **THEN** the script prints `check: ok` and exits 0 (`scripts/check.mjs:233-238`)

#### Scenario: Multiple failures aggregate

- **WHEN** several invariants are broken at once
- **THEN** the script reports all of them in one run (`check: N problem(s):`)
  before exiting 1 (`scripts/check.mjs:233-236`)

### Requirement: package.json declares homepage, bugs, and author

`package.json` SHALL declare
`"homepage": "https://github.com/alexeyco/oh-my-openspec"`,
`"bugs": "https://github.com/alexeyco/oh-my-openspec/issues"` in the
plain-string npm form,
`"repository.url": "git+https://github.com/alexeyco/oh-my-openspec.git"`,
and
`"author": { "name": "Alexeyco", "url": "https://github.com/alexeyco" }`
with no email key. It SHALL NOT declare a `funding` field, and the
`engines.node` key SHALL remain `">=22.18"` unchanged.

#### Scenario: Metadata renders on npm

- **WHEN** the next version is published by the tag-driven publish
  workflow
- **THEN** the npm page shows Homepage linking the GitHub repo, Issues
  linking the repo issues URL, and author "Alexeyco" with the profile
  URL; npm accepts the string form of `bugs` (verified 2026-10-17:
  `npm publish --dry-run --json` on a probe package with a string
  `bugs` → `"id": "bugsfmt-probe@0.0.0"`, no warning)

#### Scenario: check.mjs invariants unaffected

- **WHEN** `node scripts/check.mjs` runs against the updated
  `package.json`
- **THEN** it prints `check: ok`: the three keys are additive — group 1
  requires only the presence of `name`/`version`/`description`/`license`
  plus the fixed `type`/`exports`/`files`/`scripts`/devDependency shapes
  (`scripts/check.mjs:39-54`), and group 6's package.json check
  forbids only a stray `pi` section (`scripts/check.mjs:228`)
