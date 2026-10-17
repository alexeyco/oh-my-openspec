# Add README comparison section and package metadata

## Why now

The unscoped name `opencode-openspec` is already used by an unrelated,
npm-unpublished single-commit repo (AngDrew/opencode-openspec), and its
README tells users to run `npm install opencode-openspec` — a command
that cannot resolve (verified 2026-10-17:
`GET https://registry.npmjs.org/opencode-openspec → 404`). Searches for
this plugin surface name collisions, and catalog editors will ask
"what's different" as their first question. Meanwhile the npm page for
`@alexeyco/opencode-openspec` carries no homepage/bugs/author links back
to the repo, and the README Install lead-in advertised "Node.js ≥ 20.19"
while `engines.node`, CI (`.github/workflows/ci.yml:15`,
`node-version: 22`), CONTRIBUTING.md:12, and the README's own development
note all said ≥ 22.18 — the lone outlier (fixed by this change's group 2;
the restructure preserves the fix inside the new Install lead-in). The
README also front-loads setup and mechanics before the reader sees what
the plugin does: the user confirmed a sales-oriented reorder that leads
with QuickStart and the Comparison matrix and reduces the two mechanics
sections (vendor sync, upstream coexistence) to pointers into `docs/`.

## What changes

Touches exactly three project files with edits — `README.md`,
`package.json`, and the new `docs/using-both.md`; `docs/vendor-sync.md`
is in scope as a merge-audit target and is expected to stay unchanged
(item 4).

1. **README sales reorder.** New section order after title, tagline, and
   banner (all byte-identical): `## QuickStart` → `## Comparison` →
   `## Why` → `## What you get` → `## Install` →
   `## Keeping skills current` → `## Using both?` → `## See also`, with
   the closing MIT line kept after See also. QuickStart, Why, and What
   you get (incl. Commands/Roles/Skills) move unchanged.
   `## Requirements` is removed; its four bullets are fully accounted
   for: OpenCode v2 rescued into the Install lead-in (item 3),
   version-mirror rescued into the Keeping-skills-current pointer
   (item 4), OpenSpec-CLI and Node-development facts deduplicated into
   the Install section.
2. **README `## Comparison` section** between `## QuickStart` and
   `## Why`, in the user-confirmed hybrid format from revision 1
   (content unchanged, new position): intro sentence + disambiguation
   sentence → legend line (`✅ documented in the linked sources ·
   ⚠️ partial or implemented differently · ❌ not found in the public
   sources checked`) → at-a-glance matrix (5 columns × 7 binary axes:
   OpenCode-native plugin, AI-drafted artifacts pipeline, adversarial
   review in planning, parallel subagent implementation waves,
   mechanical `openspec validate` gate, retro, published on npm) →
   numbered footnote block (`[^1]`–`[^13]`: single-line link-backed
   definitions directly under the matrix, markers unique and assigned in
   reading order, none reused — identical evidence at two positions
   yields duplicate definitions with identical text) → the "checked
   2026-10-17" line → a `<details>` block "Detailed comparison" holding
   the detailed text table (structural axes: delivery form, plan
   drafting, apply model, validation, commands & roles, retro, npm
   package; its npm-package AngDrew cell references `[^14]`, defined
   directly under that table inside the block with text identical to
   `[^13]`) → positioning
   paragraph. Column headers in both tables use short display labels
   (`@alexeyco`, `AngDrew`, `Octane0411`, `oso`, `openflow`), each still
   linking its target (self → npm page, competitors → GitHub repos).
   Sourcing contract: every matrix row ties to a detailed-table row or
   is fully footnoted; every ⚠️ cell and every footnoted ❌/✅ cell
   carries a uniquely numbered footnote whose definition carries a
   public link; detailed cells keep their per-cell public-source links;
   a bare ❌ matrix cell — the six in the waves and Retro rows — means
   "not documented in the public sources checked" (negative searches
   performed 2026-10-17). The AngDrew footnote (`[^13]`, repeated as
   `[^14]`) keeps its pinned facts (1 commit, 2026-02-01; npm
   registry 404). One disambiguation sentence states
   `@alexeyco/opencode-openspec` is not the AngDrew package. One
   positioning paragraph claims only the defensible unique combination:
   dependency-ordered parallel subagent waves + mechanical upstream
   `openspec validate` gate + role-based plan flow
   (interview/research/grill/critique). No uniqueness claim for retro
   (oso has a `retrospective` artifact) or grill (lininn/openflow has a
   grill phase); no "better/worse" language anywhere.
3. **Install lead-in with the rescued OpenCode v2 fact**, pinned as:
   `Requires [OpenCode v2](https://opencode.ai) (plugin API), [Node.js ≥ 22.18](https://nodejs.org) and the [OpenSpec CLI](https://openspec.dev/docs/installation) — the plugin delegates every mechanical gate to it:`
   — the Node.js ≥ 22.18 clause, its nodejs.org link, and the
   delegation clause survive verbatim from the landed engines fix; the
   rest of the Install section is unchanged, and the `#install` anchor
   keeps working (the heading survives the reorder).
4. **Two mechanics sections reduced to pointers; prose moved to docs.**
   `## Keeping skills current` reduces to the vendoring + version-mirror
   facts ("all 12 upstream workflow skills are vendored byte-identically;
   a daily CI job re-vendors and opens a PR on drift; plugin `vX.Y.Z`
   bundles exactly the skills of CLI `vX.Y.Z`") plus the
   `docs/vendor-sync.md` link; the merge audit (already performed
   against the current doc) shows every fact of the removed prose exists
   in `docs/vendor-sync.md` — generatedBy stamp, daily CI re-vendor +
   PR-on-drift, version mirror, Dependabot staying off
   `@fission-ai/openspec` — so nothing is imported (no duplication).
   `## Using both?` reduces to one sentence + link; its full prose moves
   word-for-word into the new file `docs/using-both.md`.
5. **See also alternatives bullet** — new final bullet, neutral framing:
   "Alternatives in the same niche" naming the four competitor repos
   (each linked to its GitHub repo) with a `#comparison` pointer; no
   evaluative words.
6. **package.json additive metadata** — after the existing
   `repository` block:
   `"homepage": "https://github.com/alexeyco/opencode-openspec"`,
   `"bugs": "https://github.com/alexeyco/opencode-openspec/issues"`,
   `"author": { "name": "Alexeyco", "url": "https://github.com/alexeyco" }`
   (no email). No `funding` field. `engines.node` stays `">=22.18"`.
   All three keys are additive and conflict with no `scripts/check.mjs`
   invariant: group 1 requires only the presence of
   name/version/description/license and fixed shapes
   (`scripts/check.mjs:39-54`), and group 6's package.json check
   forbids only a stray `pi` section (`scripts/check.mjs:228`).

## Impact on capabilities

- `public-positioning`: new capability — 5 ADDED requirements /
  11 scenarios (sourced dated hybrid matrix with uniquely numbered
  footnotes `[^1]`–`[^14]` + detailed table with legend
  and short headers, neutrality + narrow uniqueness claim + neutral
  See also alternatives bullet, AngDrew footnote, name disambiguation,
  sales section ordering with the two mechanics pointers).
- `release-publishing`: 2 ADDED requirements (package.json
  homepage/bugs/author; Install lead-in matches engines) — wording
  updated for the reorder: README citations are section-anchored, no
  README line numbers; `package.json` citations by key name. No
  baseline requirement header is modified or renamed; the existing
  "check.mjs enforces six invariant groups" requirement is untouched
  because the new fields trip no invariant and the new relative link
  (`docs/using-both.md`) is created before the README references it.

## Out of scope

- GitHub repo `homepageUrl` setting, catalog submissions/PRs, package
  rename, `funding` field, any `engines` change.
- fastknifes/openflow — the user chose lininn/openflow when told of the
  name ambiguity; only lininn's appears in the tables.
- Any evaluative claim about competitors' quality, licensing gaps, or
  star counts beyond the pinned factual cells.
- Mechanical guarding of external links — `scripts/check.mjs:210`
  resolves only relative links by design; the dated footnote is the
  staleness mitigation, not a new gate.
- Rewriting QuickStart, Why, or What you get prose — those sections
  move, they do not change.
- Editing `docs/vendor-sync.md` — the merge audit found every fact of
  the reduced README section already documented there; the file is in
  scope only as the audit target, and an edit happens only if the
  implementer's audit disagrees, reported as a divergence.
- The Requirements bullet's decline-behavior clause ("only continues
  critic-only (plan) if you decline") — dropped under the
  user-confirmed dedup; it is not part of the pinned Install lead-in.

## Assumptions

ASSUMPTION: comparison-table axes are structural and unlikely to churn — delivery form, plan drafting, apply model, validation, commands & roles, retro, npm package — not per-feature minutiae (untested — user rejects an axis during critique).
ASSUMPTION: table, footnotes, and disambiguation sentence are English, per AGENTS.md "All content in English" (untested — user asks for another language).
ASSUMPTION: section titled `## Comparison`, placed between `## QuickStart` and `## Why` per the sales ordering, with the "checked 2026-10-17" line directly under the footnote block covering both the matrix and the detailed table, and each competitor column header linking to its repo (untested — user prefers another title or placement).
ASSUMPTION: `bugs` uses the plain-string npm form — tested `npm publish --dry-run --json` (npm 11.20.0, probe package with `"bugs": "https://github.com/alexeyco/opencode-openspec/issues"`) → `"id": "bugsfmt-probe@0.0.0"`, no warning.
ASSUMPTION: the Octane0411 plan-drafting cell follows its published npm README ("**Allow** creating and editing OpenSpec documents … **Prevent** modifications to the implementation code") rather than the research paraphrase "forbids generating spec docs", which that source contradicts — tested `GET https://registry.npmjs.org/opencode-plugin-openspec` → v0.1.4 readme, quote above.
ASSUMPTION: npm-row cells carry competitor versions as of 2026-10-17 (bounded by the checked-date footnote) but omit this package's own version, which is machine-owned and changes on every vendor bump (untested — user wants versions dropped or added uniformly).
ASSUMPTION: the seven matrix axes and cell values are the user-approved pinned set; GitHub renders `<details>` markdown tables (verified convention for README pages) — untested here because rendering is host-side.
ASSUMPTION: README section order (QuickStart→Comparison→Why→What you get→Install→Keeping skills current→Using both?→See also) is the user-approved sales ordering — untested externally, host-independent.
ASSUMPTION: footnote markers are unique by construction; GitHub-style numbered footnotes renumber automatically at render, source-level uniqueness is what the contract pins (untested — host-side rendering; a GitHub render showing literal or colliding `[^n]` markers would disprove it).

## Risks

No REJECTED-RISK: the user dismissed none during the grill.
