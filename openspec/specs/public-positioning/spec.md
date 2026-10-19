# public-positioning Specification

## Purpose

Governs the plugin's public README positioning: the sourced and dated
comparison tables, their legend and footnotes, neutral claims, and the
sales-order section layout of the README.

## Requirements

### Requirement: README comparison table is sourced and dated

The README SHALL carry a `## Comparison` section between `## QuickStart`
and `## Why` in the hybrid form, in this order: intro sentence, legend
line, at-a-glance matrix, numbered
footnote block (`[^1]`–`[^13]`), the checked-date line, a `<details>`
block summarized "Detailed comparison" holding the detailed text table
with its own definition `[^14]` directly under it, and the positioning
paragraph. Both tables compare `oh-my-openspec` with
AngDrew/opencode-openspec, Octane0411/opencode-plugin-openspec,
moyaspace/openspec-superpowers-opencode ("oso"), and lininn/openflow. The
matrix SHALL cover seven binary axes (OpenCode-native plugin, AI-drafted
artifacts pipeline, adversarial review in planning, parallel subagent
implementation waves, mechanical `openspec validate` gate, retro,
published on npm) with ✅/⚠️/❌ cells, and the detailed table SHALL cover
structural axes (delivery form, plan drafting, apply model, validation,
commands & roles, retro, npm package). Every matrix row SHALL correspond
to a row of the detailed table inside the `<details>` block, or be fully
footnoted. Every factual cell SHALL carry a source that supports it: an
external public link (the competitor's GitHub repo/page or its npmjs.com
package page), or — in the self-package column only — a repo-relative
link (`docs/agents.md`) or an in-page anchor (`#install`), or a reference
to a uniquely numbered footnote whose definition carries the public
links; each table's numbered definitions sit directly under that table
(`[^1]`–`[^13]` under the matrix, `[^14]` under the detailed table inside
the `<details>` block). Every ⚠️ cell and every footnoted ❌/✅ cell of
the matrix SHALL carry a uniquely numbered footnote whose definition
carries a public link; footnote markers SHALL be unique and numbered in
reading order, and no marker SHALL be reused — identical evidence used at
two positions yields two numbered definitions with identical text
(required by marker uniqueness, accepted cost). An unfootnoted ❌ matrix
cell — the six bare ❌ cells in the rows "Parallel subagent
implementation waves" and "Retro" — means the feature is not documented
in the project's public sources — negative searches performed
2026-10-17 — so bare ❌ cells remain sourced claims under the legend's
"not found in the public sources checked" state and the dated line.
Each competitor column header SHALL
link its GitHub repo in both tables; header display text SHALL be short
(author or short project name: `omos`, `AngDrew`, `Octane0411`,
`oso`, `openflow`), with the full names remaining discoverable through
the linked repos, the AngDrew footnote, and the detailed-table cells.
The self-column links SHALL target the renamed package page
`https://www.npmjs.com/package/oh-my-openspec`; the self-column display
label is the short project name `omos`. The
line `All cells checked 2026-10-17 against the linked public sources.`
SHALL sit directly under the footnote block and cover both tables.

#### Scenario: Five sourced columns

- **WHEN** a reader opens the `## Comparison` section
- **THEN** they see a matrix with one column for this package plus four
  competitor columns — each header a short display label linking the same
  target as the full-name header it replaces (self → the npmjs.com
  package page, each competitor → its GitHub repo) — and, inside the
  `<details>` block, the detailed table with the same five sourced
  columns, plus the "checked 2026-10-17" line under the footnote block

#### Scenario: Every cell carries its source

- **WHEN** any factual cell — matrix or detailed — is questioned
- **THEN** it carries a source that supports it: a detailed cell carries
  an external `https:` link (competitor repo/page or npmjs.com page), or
  — in the self-package column — a repo-relative link (`docs/agents.md`)
  or an in-page anchor (`#install`), which check.mjs group 5 resolves or
  skips (`scripts/check.mjs:210-215`), or a uniquely numbered footnote
  reference whose definition under that table carries the public links;
  every ⚠️ cell and every footnoted ❌/✅ cell of the matrix carries a
  uniquely numbered footnote — `[^1]`–`[^13]` assigned in reading order
  under the matrix, `[^14]` under the detailed table repeating `[^13]`'s
  text, markers unique, none reused, repeated evidence rendered as
  duplicate definitions with identical text — whose definition carries a
  public link, every matrix row maps to a detailed-table row or to its
  footnotes, and the six bare ❌ cells in the waves and Retro rows are
  covered by the legend's "not found in the public sources checked" rule;
  check.mjs deliberately does not resolve external `https:` links
  (`scripts/check.mjs:210` skips `https?:`), so the dated line is the
  staleness mitigation

#### Scenario: States defined by legend

- **WHEN** a reader sees ✅, ⚠️, or ❌ cells in the matrix
- **THEN** the legend line directly above the matrix defines all three
  states — `✅ documented in the linked sources · ⚠️ partial or
implemented differently · ❌ not found in the public sources checked` —
  and the ❌ wording states the bare-❌ rule that keeps unfootnoted ❌
  cells sourced negative claims (negative searches performed 2026-10-17)

#### Scenario: Relative links stay valid

- **WHEN** `node scripts/check.mjs` runs after the section lands
- **THEN** group 5 passes: every relative link the restructured README
  carries — including `docs/agents.md`, `docs/vendor-sync.md`, and the
  new `docs/using-both.md` — exists on disk, and pure in-page anchors
  are not extracted by the group-5 regex (`scripts/check.mjs:210-215`)

### Requirement: Comparison stays neutral and claims only the defensible combination

The section SHALL use neutral, factual language — no evaluative verdicts
("better", "worse", "inferior"); absences are stated as sourced facts.
Its uniqueness claim SHALL be limited to the combination of (1)
dependency-ordered parallel subagent waves in apply, (2) a mechanical
upstream `openspec validate` gate, and (3) a role-based plan flow
(interview/research/grill/critique). It SHALL NOT claim uniqueness of a
retrospective artifact — oso ships an evidence-first `retrospective` —
nor of a grill step — lininn/openflow has a grill phase. The
`## See also` section SHALL close with a bullet naming the four
competitor repositories as alternatives in the same niche — each linked
to its GitHub repo — with a pointer to the `#comparison` anchor, in
neutral framing and with no evaluative words.

#### Scenario: Absence stated neutrally

- **WHEN** the tables record what a competitor lacks (for example
  "sequential 'Ralph loop', no parallel waves" or "no parallel waves
  documented", or a matrix ❌/⚠️ cell)
- **THEN** the detailed cell states the absence as a fact linked to the
  competitor's public source, every matrix ❌ or ⚠️ cell is paired with a
  uniquely numbered footnote or a corresponding detailed-table row — no
  unsourced negatives — and no evaluative adjective appears

#### Scenario: Unique-combination claim only

- **WHEN** the section asserts what distinguishes this plugin
- **THEN** the claim names exactly the three-part combination above, no
  broader "only tool that …" statement appears, and neither retro nor
  grill is claimed as unique

#### Scenario: Alternatives linked neutrally

- **WHEN** a reader opens the `## See also` section
- **THEN** its final bullet names the four competitor repos
  (AngDrew/opencode-openspec, Octane0411/opencode-plugin-openspec,
  moyaspace/openspec-superpowers-opencode, lininn/openflow) as
  "Alternatives in the same niche", each linked to its GitHub repo, with
  a pointer to `#comparison` and no evaluative language

### Requirement: The AngDrew column carries a factual footnote

The AngDrew/opencode-openspec column SHALL carry a footnote stating two
verified facts: the repository has a single commit (2026-02-01), and the
package is not published on npm — `GET
https://registry.npmjs.org/opencode-openspec` returns 404 (verified
2026-10-17), so the `npm install opencode-openspec` line in its README
does not resolve. The footnote SHALL link the GitHub repo and the
registry URL as sources.

#### Scenario: AngDrew footnote facts

- **WHEN** a reader reaches the AngDrew column
- **THEN** the footnote states the single-commit history (2026-02-01)
  and the npm-unpublished status (registry 404), linked to
  https://github.com/AngDrew/opencode-openspec and
  https://registry.npmjs.org/opencode-openspec

### Requirement: README leads with the sales ordering

The README's `##` sections SHALL appear in exactly this order:
QuickStart, Comparison, Why, What you get, Install, Keeping skills
current, Using both?, See also — closing with the MIT license line. No
`## Requirements` heading SHALL remain. `## Keeping skills current` and
`## Using both?` SHALL be the pinned short pointers, with the full
mechanics prose living in `docs/vendor-sync.md` (pre-existing) and
`docs/using-both.md` (created by this change, word-for-word from the old
README `## Using both?` section).

#### Scenario: Eight-section sales order

- **WHEN** the rendered README is read top to bottom
- **THEN** the eight `##` headings appear in exactly the order
  QuickStart, Comparison, Why, What you get, Install, Keeping skills
  current, Using both?, See also, `## Requirements` is absent, and the
  MIT license line closes the file

#### Scenario: Mechanics prose moved, not rewritten

- **WHEN** a reader opens `docs/using-both.md`
- **THEN** its body matches the pre-change README `## Using both?`
  prose word-for-word (re-wrapping allowed), and every claim of the two
  README pointers stays backed by the corresponding docs file:
  `docs/vendor-sync.md` for the Keeping-skills-current pointer — its
  "All 12 upstream workflow skills" count backed by
  `docs/vendor-sync.md` and `vendor/openspec/manifest.json` — and
  `docs/using-both.md` for the Using-both pointer
