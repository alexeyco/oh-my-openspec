# release-publishing

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

`scripts/check.mjs` SHALL verify, collecting all failures before exiting 1 with
`✗`-prefixed lines: (1) `package.json` shape — required keys, `"type":
"module"`, exports, files array with existing paths, test/typecheck scripts,
`@fission-ai/openspec` as devDependency (`scripts/check.mjs:28-67`);
(2) `ROLE_IDS` equals the set of `agents/*.md` with valid subagent frontmatter
and no model pins (`:69-102`); (3) `FLOW_SKILL_IDS` matches `skills/` on disk
both ways (`:104-138`); (4) the vendor tree matches its manifest, each skill is
self-stamped with `generatedBy`, and `package.json` version mirrors the
manifest (`:140-197`); (5) relative links in README/CONTRIBUTING/AGENTS resolve
(`:199-218`); (6) plugin id is `"opencode-openspec"` and no stray `pi` section
exists in `package.json` (`:220-229`).

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

Releases SHALL be cut by manually checking out `master`, tagging, and pushing
the tag (`CONTRIBUTING.md:119-126`); the plugin `version` is machine-owned,
moved only by the vendor-sync workflow, with no CHANGELOG file
(`CONTRIBUTING.md:111-117`). Merged plugin code between skill releases ships
only inside the next mirror bump; a hotfix that cannot wait relies on manual
workflow dispatch, and if upstream has not released, the tag is held because
npm forbids re-publishing a version (`CONTRIBUTING.md:131-136`). The package
declares `engines.node >= 22.18` (`package.json:47-49`).

#### Scenario: Hotfix window with no upstream release

- **WHEN** a fix must ship before upstream OpenSpec releases again
- **THEN** maintainers dispatch vendor-sync manually; if it produces no PR with
  a new publishable number, the tag is held until the CLI version catches up
  (`CONTRIBUTING.md:131-136`)
