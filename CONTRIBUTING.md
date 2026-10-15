# Contributing

## Branching

- Never push to `master`.
- Branch from `master`: `git checkout -b feat/<topic>`.
- Commit messages: no conventional prefixes (`feat:`, `fix:`, …), past tense —
  e.g. `Added openspec-plan skill`, `Fixed validateProject empty-report check`.

## Development

Install dependencies and run the checks — same as CI. Tests require Node ≥ 22.18
(default type stripping). `make check` runs `scripts/check.mjs`, verifies the
vendored OpenSpec skills against the pinned CLI, typechecks the plugin, and runs
the test suite:

```sh
npm ci
make fmt
make check
```

Test locally without publishing (local installs are not copied, edits are live):

```sh
# sandbox opencode.jsonc
{ "plugins": ["/absolute/path/to/opencode-openspec"] }
```

Point OpenCode at the absolute path; edits take effect on the next session
or `/reload` — no copying, no reinstall.

- Run `make fmt` before committing.
- Keep `package.json` `files` in sync when adding paths. Assets are read at
  runtime relative to `import.meta.dirname`.
- Permission/tool scoping is intentionally absent from agent frontmatter —
  behavior is bounded by role prompt + injected `SUBAGENT_CONTRACT` + the
  OpenSpec artifacts themselves.

## Vendored OpenSpec skills

`vendor/openspec/` is generated, never hand-edited:

- `make sync` runs `scripts/sync-vendor.mjs`: it drives the CLI pinned in
  `devDependencies` (`@fission-ai/openspec`), renders all workflow skills for
  the `opencode` tool into a throwaway project, and copies them byte-identically.
- `scripts/sync-vendor.mjs --check` (part of `make check`) fails when the tree
  drifts from the pinned CLI version.
- A daily CI workflow installs the latest CLI, runs `make sync`, mirrors the
  new CLI version into the plugin `version`, and opens a PR when anything
  changes. Dependabot deliberately **excludes** `@fission-ai/openspec` —
  dependency bump, re-vendor, and version mirror must land atomically in
  that PR.
- When an upstream adds a workflow, a sync PR teaches the plugin about it
  without a code change: the plugin discovers vendored skills from
  `vendor/openspec/manifest.json`, not a hardcoded list.

## Layout

```
opencode-openspec/
├── index.ts                     # shim: export { default } from "./opencode/index.ts"
├── package.json                 # opencode plugin (exports "." → ./opencode/index.ts)
├── core/                        # framework-agnostic logic
│   ├── markdown.ts              # frontmatter parse/validate (uses `yaml` package)
│   ├── roles.ts                 # load agents/*.md into RoleAsset[]
│   ├── vendor.ts                # vendored-skills manifest + on-disk discovery
│   ├── openspec.ts              # openspec CLI wrapper + validation report formatting
│   └── prompts.ts               # command instruction texts + SUBAGENT_CONTRACT
├── opencode/
│   ├── index.ts                 # plugin entry: agents + skills + commands + contract injection + openspec_validate
│   └── background.ts            # forceBackgroundEvent pure helper
├── agents/                      # 7 role definitions, shared markdown
│   ├── openspec-researcher.md   # facts + quality bar (read-only)
│   ├── openspec-planner.md      # change artifacts (plan) / baseline specs (baseline) / wave table (waves)
│   ├── openspec-critic.md       # mechanical + editorial review: CLEAN or NEEDS-FIX
│   ├── openspec-implementer.md  # exactly one task group
│   ├── openspec-verifier.md     # scenarios verified by execution
│   ├── openspec-reviewer.md     # diff vs proposal, spec delta, design
│   └── openspec-retrospector.md # run evidence → ≤8 cited prompt defects
├── skills/
│   ├── openspec-init/SKILL.md   # flow: discovery → capability map → baseline specs → critique → approval
│   ├── openspec-plan/SKILL.md   # flow: interview → research → draft → critique → validate
│   ├── openspec-apply/SKILL.md  # flow: waves → verify → review → report
│   └── openspec-retro/SKILL.md  # flow: evidence bundle → retrospector → relay
├── vendor/openspec/             # GENERATED — skills/ + manifest.json, via `make sync`
├── docs/
│   ├── agents.md                # role catalog + dispatch mechanics
│   ├── vendor-sync.md           # keeping vendored skills fresh
│   └── gallery/banner.svg       # hero banner (upstream-style dither + neon)
├── scripts/
│   ├── check.mjs                # repo sanity checks behind `make check`
│   └── sync-vendor.mjs          # regenerate/verify vendor/openspec/
├── tests/                       # node --test, TypeScript files run via node type-stripping
├── Makefile  tsconfig.json  .gitignore  .prettierignore
├── .github/                     # workflows/{ci,publish,vendor-sync}.yml, dependabot.yml,
│                                # ISSUE_TEMPLATE/improvement.md, PULL_REQUEST_TEMPLATE.md
├── README.md  AGENTS.md  CONTRIBUTING.md  LICENSE
```

## Testing

- Test runner: `node --test "tests/**/*.test.ts"` (TypeScript via Node type stripping).
- Tests live in `tests/` and mirror the `core/` module structure;
  `tests/assets.test.ts` guards the real repo assets (agents, flow skills,
  vendor tree) against the adapter's invariants.
- No external test frameworks — use `node:test` and `node:assert`.

## Publishing

The plugin `version` in `package.json` mirrors the vendored OpenSpec version
and is **machine-owned**: only the daily `vendor-sync` workflow moves it, in
the same PR that re-vendors `vendor/openspec/` — and it also self-heals a
mismatch without vendor drift. `scripts/check.mjs` fails any PR where
`version != manifest.generatedBy`. Never edit `version` in a
feature branch — no CHANGELOG file either; merged PRs and npm history are the
record.

1. The daily workflow opens `Release vX.Y.Z — vendored OpenSpec skills`
   whenever upstream changes. Review the `vendor/**` diff, merge to `master`.
2. Tag what is now the canonical version and push the tag:

   ```sh
   git checkout master && git pull
   git tag vX.Y.Z && git push origin vX.Y.Z
   ```

3. The `publish` workflow checks the tag against `package.json` and runs
   `npm publish --provenance`.

Consequence of strict mirroring: plugin code merged between two skill
releases is not published on its own — it ships inside the next mirror bump.
For a fix that cannot wait, dispatch the workflow manually; if upstream has
not released, no PR with a publishable number appears, and npm forbids
re-publishing the same version — hold the tag until the CLI catches up.
Choose the wait deliberately; it is the price of `version == skills version`.
