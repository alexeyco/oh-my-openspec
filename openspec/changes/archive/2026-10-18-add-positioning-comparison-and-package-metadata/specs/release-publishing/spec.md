# release-publishing — delta for add-positioning-comparison-and-package-metadata

## ADDED Requirements

### Requirement: package.json declares homepage, bugs, and author

`package.json` SHALL declare
`"homepage": "https://github.com/alexeyco/opencode-openspec"`,
`"bugs": "https://github.com/alexeyco/opencode-openspec/issues"` in the
plain-string npm form, and
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

### Requirement: README Node requirement matches engines

The README Install section SHALL open with a requirements lead-in
stating Node.js ≥ 22.18, pinned as
`Requires [OpenCode v2](https://opencode.ai) (plugin API), [Node.js ≥ 22.18](https://nodejs.org) and the [OpenSpec CLI](https://openspec.dev/docs/installation) — the plugin delegates every mechanical gate to it:`
— matching the `engines.node` value `">=22.18"` in `package.json`, the
development requirement at CONTRIBUTING.md:12, and CI's
`node-version: 22` (`.github/workflows/ci.yml:15`). The OpenCode v2
clause rescues the first bullet of the removed `## Requirements`
section; the `[Node.js ≥ 22.18](https://nodejs.org)` link and the
delegation clause survive verbatim from the pre-change Install line, and
the rest of the Install section stays unchanged.

#### Scenario: Install section matches engines

- **WHEN** a reader follows the Install section
- **THEN** the stated minimum is "Node.js ≥ 22.18", identical to the
  `engines.node` value and to the development requirement
  CONTRIBUTING.md states; the former `## Requirements` development
  bullet ("Node ≥ 22.18 for development") is deduplicated into this
  lead-in

#### Scenario: No stale 20.19 remains

- **WHEN** `grep -n "20\.19" README.md` runs after the fix
- **THEN** it prints nothing; before the change the sole hit was the
  Install lead-in `Requires [Node.js ≥ 20.19](https://nodejs.org) and
  the …` (verified 2026-10-17)
