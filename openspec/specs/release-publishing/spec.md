# Release publishing

## Purpose

Releases are tag-driven and machine-gated: pushing a `v*` tag runs the
`publish` workflow, which refuses to publish unless the tag equals the
`package.json` version and then runs `npm publish --provenance --access public`
with an npm token and OIDC (`.github/workflows/publish.yml:3-28`). Every pull
request and every push to `master` runs `ci`, which executes `npm ci`,
`make check`, and `npm pack --dry-run` on Node 22
(`.github/workflows/ci.yml:3-19`). `make check` composes the repo's four gates
— the six-group `scripts/check.mjs` invariant sweep, vendored-skills drift
check, typecheck, and test suite (`Makefile:12-17`,
`scripts/check.mjs:28-229`, `package.json:30-33`). Formatting is a manual
`make fmt` step developers run before committing, deliberately not CI-enforced
(`Makefile:8-10`, `CONTRIBUTING.md:33`). Because the plugin version mirrors the
vendored OpenSpec version, there is no CHANGELOG and no manual version bumps on
feature branches; merged plugin code ships inside the next mirror bump
(`CONTRIBUTING.md:109-136`).

## Requirements

### Requirement: Publishing is triggered only by a matching version tag

The `publish` workflow SHALL run on `push: tags: ["v*"]`, verify
`GITHUB_REF_NAME == "v$(package.json version)"` and exit 1 on mismatch, before
running `npm publish --provenance --access public` with `NODE_AUTH_TOKEN` from
the `NPM_TOKEN` secret and `id-token: write` permission
(`.github/workflows/publish.yml:3-5,10-12,19-28`).

#### Scenario: Tag matches package version

- **WHEN** a tag `vX.Y.Z` is pushed and `package.json` version is `X.Y.Z`
- **THEN** the workflow proceeds to `npm publish --provenance --access public`
  on Node 22 against registry.npmjs.org (`publish.yml:15-28`)

#### Scenario: Tag does not match

- **WHEN** the pushed tag differs from the computed `v<version>`
- **THEN** the gate step prints the mismatch and exits 1, and nothing is
  published (`publish.yml:19-25`)

### Requirement: CI gates every PR and master push

The `ci` workflow SHALL trigger on `pull_request` and `push` to `master` and
run, in order, `npm ci`, `make check`, and `npm pack --dry-run` on Node 22
(`.github/workflows/ci.yml:3-6,15-19`).

#### Scenario: Pack preview

- **WHEN** CI runs `npm pack --dry-run`
- **THEN** the tarball contents are listed per the `files` allow-list
  (`agents`, `core`, `docs`, `opencode`, `skills`, `vendor`, `index.ts`,
  `README.md`, `LICENSE`) without publishing (`package.json:19-29`,
  `ci.yml:19`)

### Requirement: make check composes the four repo gates

`make check` SHALL run `node scripts/check.mjs`, then
`node scripts/sync-vendor.mjs --check`, then `npm run typecheck`
(`tsc --noEmit`), then `npm test` (`node --test "tests/**/*.test.ts"`),
depending on an `npm ci`-populated `node_modules` (`Makefile:12-17,23-25`,
`package.json:30-33`).

#### Scenario: Local run mirrors CI

- **WHEN** a contributor runs `make check` after `npm ci`
- **THEN** the same sequence CI runs executes, and any failing gate stops the
  target (`Makefile:12-17`, `ci.yml:17-18`)

### Requirement: check.mjs enforces six invariant groups

scripts/check.mjs SHALL aggregate failures across six invariant groups covering package shape, roles, flow skills, vendor metadata, documentation links, and plugin identity before exiting non-zero.

#### Scenario: All invariants hold

- **WHEN** every group passes
- **THEN** the script prints `check: ok` and exits 0 (`scripts/check.mjs:233-238`)

#### Scenario: Multiple failures aggregate

- **WHEN** several invariants are broken at once
- **THEN** the script reports all of them in one run (`check: N problem(s):`)
  before exiting 1 (`scripts/check.mjs:233-236`)

### Requirement: Formatting is a manual developer step

`make fmt` SHALL run `npx --yes prettier@3 --write .` and CONTRIBUTING SHALL
instruct running it before committing; no CI workflow executes prettier or
`make fmt`, so formatting is not mechanically enforced
(`Makefile:8-10`, `CONTRIBUTING.md:17-21,33`).

#### Scenario: No CI format gate

- **WHEN** a PR with unformatted (but otherwise valid) sources is pushed
- **THEN** CI passes — none of the `ci`, `publish`, or `vendor-sync` workflows
  contains a prettier or `fmt` step (verified by grep over `.github/`: no
  matches)

### Requirement: The release record is tags and npm, not a CHANGELOG

Releases SHALL use version tags and npm; the vendor-sync workflow owns plugin version updates, so feature branches add no CHANGELOG or manual version bump.

#### Scenario: Hotfix window with no upstream release

- **WHEN** a fix must ship before upstream OpenSpec releases again
- **THEN** maintainers dispatch vendor-sync manually; if it produces no PR with
  a new publishable number, the tag is held until the CLI version catches up
  (`CONTRIBUTING.md:131-136`)

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

### Requirement: README Node requirement matches engines

The README installation lead-in SHALL state Node.js >=22.18 and remain consistent with package engines, CONTRIBUTING requirements, and the Node major used by CI.

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
