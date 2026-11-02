# Public positioning

## Purpose

Governs the plugin's public README positioning: the sourced and dated
comparison tables, their legend and footnotes, neutral claims, and the
sales-order section layout of the README.

## Requirements

### Requirement: README comparison table is sourced and dated

The README comparison section SHALL present the defined matrix and detailed table in the required order, with every factual claim linked or footnoted to its source and a checked-date line covering both tables.

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

Comparison language SHALL remain factual and neutral. Any uniqueness claim SHALL be limited to the documented combination of parallel apply waves, mechanical validation, and role-based planning, with the named alternatives linked.

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

README sections SHALL follow the required sales order, end with the MIT license, remove the old Requirements section, and keep detailed vendor and combined-use guidance in their dedicated docs.

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
