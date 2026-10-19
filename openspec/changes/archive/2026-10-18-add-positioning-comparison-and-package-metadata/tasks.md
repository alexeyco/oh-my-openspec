# Tasks

## 1. package.json metadata

- [x] 1.1 In `package.json`, directly after the existing `repository`
      block, add exactly:
      `"homepage": "https://github.com/alexeyco/opencode-openspec"`,
      `"bugs": "https://github.com/alexeyco/opencode-openspec/issues"`
      (plain string, not an object), and
      `"author": { "name": "Alexeyco", "url": "https://github.com/alexeyco" }`
      — no `email` key inside `author`, no `funding` field anywhere,
      `engines.node` stays `">=22.18"`, every existing key and value
      unchanged. Covers scenarios "Metadata renders on npm" and
      "check.mjs invariants unaffected".
- [x] 1.2 Run `node scripts/check.mjs` → expected `check: ok` (the three
      keys are additive; group 1 checks only required keys and fixed
      shapes at `scripts/check.mjs:39-54`, group 6's package.json check
      only forbids a stray `pi` section at `scripts/check.mjs:228`). Expected state after
      group 1 alone: `check: ok`; the tracked diff (`git diff --stat`)
      lists only `package.json`, and this change's artifacts under
      `openspec/changes/` appear as untracked entries in `git status`,
      not in the diff.

## 2. README engines line

- [x] 2.1 Edit the README Install lead-in (landed at pre-reorder
      `README.md:9`): replace `Requires [Node.js ≥ 20.19](https://nodejs.org)`
      with `Requires [Node.js ≥ 22.18](https://nodejs.org)` — link
      target and the rest of the line unchanged. The group-4 restructure
      keeps the `[Node.js ≥ 22.18](https://nodejs.org)` link and the
      delegation clause verbatim inside the new lead-in, where the
      `Requires` prefix now governs the merged list (task 4.5).
      Covers scenario "Install section matches engines".
- [x] 2.2 Run `grep -n "20\.19" README.md` → expected: no output (line 9
      was the sole occurrence). Covers scenario
      "No stale 20.19 remains". Expected state after group 2 alone: one changed README
      line, `node scripts/check.mjs` still `check: ok`.

## 3. Docs moves

- [x] 3.1 Create `docs/using-both.md` with exactly this content — the
      current `## Using both?` prose word-for-word (README.md:109-117),
      re-wrapped from the README's hard line breaks as the only
      difference:

      ```markdown
      # Using both?

      Skill ids match upstream exactly (`openspec-propose`, `openspec-apply-change`, …), so a project with `openspec init --tools opencode` alongside the plugin loads the same workflows — the plugin just keeps them current on every release instead of on every manual `openspec update`. The five commands this plugin adds (`/openspec.init`, `/openspec.plan`, `/openspec.apply`, `/openspec.archive`, `/openspec.retro`) and the upstream ones coexist: upstream skills are single-workflow steps, the flow commands are the multi-agent runs over the whole change.
      ```

      Covers scenario "Mechanics prose moved, not rewritten"
      (word-for-word body).

- [x] 3.2 Merge audit of `docs/vendor-sync.md`: verify every fact of the
      current `## Keeping skills current` prose (README.md:98-105)
      already exists there — the `generatedBy` stamp ("How each file
      stays provable"), the daily CI re-vendor + PR on drift (pipeline
      step 1), the plugin-version mirror ("Versioning: a strict
      mirror"), and Dependabot staying off `@fission-ai/openspec`
      (pipeline step 3). Expected outcome: no import, file unchanged
      (merge without duplication). If — and only if — the audit at
      apply time finds a fact the doc lacks, add exactly that fact to
      the matching section and report the divergence.
- [x] 3.3 Run `node scripts/check.mjs` → expected `check: ok` (the
      README does not link `docs/using-both.md` yet; the existing
      `docs/vendor-sync.md` links stay valid). Expected state after
      group 3 alone: group 3 adds one new untracked file
      (`docs/using-both.md`) and itself changes no tracked file; the
      `README.md` and `package.json` diffs from groups 1–2 remain.

## 4. README sales restructure

- [x] 4.1 Rewrite `README.md` to the pinned section order — title,
      tagline, and banner image byte-identical, then:
      `## QuickStart` (current content moved as-is) →
      `## Comparison` (tasks 4.2-4.4) →
      `## Why` (moved as-is) →
      `## What you get` (moved as-is, incl. Commands/Roles/Skills
      subsections) →
      `## Install` (task 4.5) →
      `## Keeping skills current` (task 4.6) →
      `## Using both?` (task 4.7) →
      `## See also` (task 4.8) →
      the closing MIT line verbatim after See also.
      Remove `## Requirements` entirely; its four bullets are accounted
      for: OpenCode v2 → the Install lead-in (4.5); OpenSpec CLI and
      the Node-development note → deduplicated into the Install
      lead-in and body; version mirror → the Keeping-skills-current
      pointer (4.6). Covers scenario "Eight-section sales order" (the
      pinned order and the absence of `## Requirements`).
- [x] 4.2 Place the `## Comparison` section between `## QuickStart` and
      `## Why`, replacing the landed named-footnote matrix and its
      footnote block with the numbered scheme. Open
      with the intro sentence
      `How this plugin compares to the other OpenSpec×OpenCode tools.`
      and the disambiguation sentence pinned as:
      `Despite the shared name, @alexeyco/opencode-openspec is unrelated to AngDrew's [opencode-openspec](https://github.com/AngDrew/opencode-openspec).`
      Directly under them the legend line, pinned as:
      `✅ documented in the linked sources · ⚠️ partial or implemented differently · ❌ not found in the public sources checked`
      Then the at-a-glance matrix below, verbatim (short header labels
      linking the same targets as the headers they replace — self → npm
      page, each competitor → its GitHub repo; cell values pinned from
      research verified 2026-10-17; footnote markers unique and numbered
      in reading order, none reused — every ⚠️ cell and every footnoted
      ❌/✅ cell references a numbered footnote from task 4.3; the six
      bare ❌ cells in the "Parallel subagent implementation waves" and
      "Retro" rows mean "not documented in the project's public
      sources").
      Covers scenarios "Collision disambiguated",
      "States defined by legend", "Five sourced columns" (matrix), and
      "Every cell carries its source" (matrix cells).

      ```markdown
      | | [@alexeyco](https://www.npmjs.com/package/@alexeyco/opencode-openspec) | [AngDrew](https://github.com/AngDrew/opencode-openspec) | [Octane0411](https://github.com/Octane0411/opencode-plugin-openspec) | [oso](https://github.com/moyaspace/openspec-superpowers-opencode) | [openflow](https://github.com/lininn/openflow) |
      |---|---|---|---|---|---|
      | OpenCode-native plugin | ✅ | ✅ | ✅ | ❌[^1] | ❌[^2] |
      | AI-drafted artifacts pipeline | ✅ | ❌[^3] | ❌[^4] | ✅ | ✅ |
      | Adversarial review in planning | ✅ | ❌[^5] | ❌[^6] | ⚠️[^7] | ✅ |
      | Parallel subagent implementation waves | ✅ | ❌ | ❌ | ❌[^8] | ❌ |
      | Mechanical `openspec validate` gate | ✅ | ❌[^9] | ❌[^10] | ✅ | ⚠️[^11] |
      | Retro | ✅ | ❌ | ❌ | ✅[^12] | ❌ |
      | Published on npm | ✅ | ❌[^13] | ✅ | ✅ | ✅ |
      ```

- [x] 4.3 Under the matrix place the footnote block verbatim — the
      thirteen numbered definitions `[^1]`–`[^13]` directly under the
      matrix in numerical order (single-line definitions, no blank lines
      between them; markers unique, none reused — `[^5]` repeats `[^3]`'s
      text and `[^6]`/`[^10]` repeat `[^4]`'s, because identical evidence
      at two positions yields duplicate numbered definitions with
      identical text; the detailed table's `[^14]` is pinned in task
      4.4) — then a blank line and the checked-date line, pinned as:

      ```markdown
      [^1]: oso ships as a global CLI (`oso init`), not an OpenCode plugin entry — [source](https://github.com/moyaspace/openspec-superpowers-opencode).
      [^2]: lininn/openflow ships as a global CLI (`openflow init`), not an OpenCode plugin entry — [source](https://github.com/lininn/openflow).
      [^3]: AngDrew's `openspec_ff` writes fixed Markdown templates, not AI-drafted content — [source](https://github.com/AngDrew/opencode-openspec).
      [^4]: Octane0411 registers a single planning agent and defines no artifact pipeline; users are sent to an external command — [source](https://github.com/Octane0411/opencode-plugin-openspec).
      [^5]: AngDrew's `openspec_ff` writes fixed Markdown templates, not AI-drafted content — [source](https://github.com/AngDrew/opencode-openspec).
      [^6]: Octane0411 registers a single planning agent and defines no artifact pipeline; users are sent to an external command — [source](https://github.com/Octane0411/opencode-plugin-openspec).
      [^7]: oso has an interactive brainstorm step; no separate critic loop is documented — [source](https://github.com/moyaspace/openspec-superpowers-opencode).
      [^8]: oso parallelizes via git worktrees, one change per worktree — not execution waves — [source](https://github.com/moyaspace/openspec-superpowers-opencode).
      [^9]: AngDrew claims "no external dependencies"; its only spec inspection is a regex requirement counter — [source](https://github.com/AngDrew/opencode-openspec).
      [^10]: Octane0411 registers a single planning agent and defines no artifact pipeline; users are sent to an external command — [source](https://github.com/Octane0411/opencode-plugin-openspec).
      [^11]: lininn/openflow calls the openspec CLI and reads its output, with a manual fallback; no separate validate command is documented — [source](https://github.com/lininn/openflow).
      [^12]: the `superpowers-bridge` schema keeps an evidence-first `retrospective` artifact — [source](https://github.com/moyaspace/openspec-superpowers-opencode).
      [^13]: [AngDrew/opencode-openspec](https://github.com/AngDrew/opencode-openspec) has a single commit (2026-02-01, [history](https://github.com/AngDrew/opencode-openspec/commits)) and is not published on npm — the registry returns 404 ([registry.npmjs.org/opencode-openspec](https://registry.npmjs.org/opencode-openspec)), so the `npm install opencode-openspec` line in its README does not resolve.

      All cells checked 2026-10-17 against the linked public sources.
      ```

      Covers scenarios "AngDrew footnote facts" (`[^13]` keeps the
      pinned facts) and "Every cell carries its source" (footnote
      definitions carry the public links).

- [x] 4.4 Place the detailed table in a `<details>` block pinned as
      below: short header labels, the seven landed body rows
      byte-identical to the current ones except the "npm package" row's
      AngDrew cell, where the footnote reference `[^angdrew]` becomes
      the uniquely numbered `[^14]`, and the Retro row between
      "Commands & roles" and "npm package" (mirroring the matrix row
      order). Each table's numbered definitions sit directly under that
      table: `[^14]`'s single-line definition — text identical to
      `[^13]` — goes directly under the detailed table, inside the
      `<details>` block, after the table and before `</details>`. Blank
      lines after `<summary>`, around the `[^14]` definition, and before
      `</details>` are part of the pin — GitHub needs them to render the
      table and the footnote as Markdown. After `</details>` the
      positioning paragraph verbatim,
      pinned as:
      `Among the tools above, none combines all three: dependency-ordered parallel subagent waves in /openspec.apply, a mechanical upstream openspec validate gate, and a role-based plan flow (interview → parallel research → grill → critique). Single features exist elsewhere — lininn/openflow has a grill phase, oso keeps a retrospective artifact and parallelizes via git worktrees — the combination is what this plugin adds.`
      Covers scenarios "Five sourced columns" (detailed table),
      "Every cell carries its source" (detailed cells), and
      "Unique-combination claim only".

      ```markdown
      <details>
      <summary>Detailed comparison</summary>

      | | [@alexeyco](https://www.npmjs.com/package/@alexeyco/opencode-openspec) | [AngDrew](https://github.com/AngDrew/opencode-openspec) | [Octane0411](https://github.com/Octane0411/opencode-plugin-openspec) | [oso](https://github.com/moyaspace/openspec-superpowers-opencode) | [openflow](https://github.com/lininn/openflow) |
      |---|---|---|---|---|---|
      | Delivery | OpenCode plugin ([npm](https://www.npmjs.com/package/@alexeyco/opencode-openspec)) | OpenCode plugin ([repo](https://github.com/AngDrew/opencode-openspec)) | OpenCode plugin ([npm](https://www.npmjs.com/package/opencode-plugin-openspec)) | Global CLI + project template (`oso`), not a plugin package ([npm](https://www.npmjs.com/package/@moyaspace/openspec-superpowers-opencode)) | Global CLI generating skills for Claude Code/Codex/Cursor/OpenCode ([npm](https://www.npmjs.com/package/@lininn/openflow)) |
      | Plan drafting | Interview → parallel research → grill → draft → critique loop ([docs/agents.md](docs/agents.md)) | Writes fixed Markdown templates, no AI drafting ([repo](https://github.com/AngDrew/opencode-openspec)) | Single `openspec-plan` agent: edits OpenSpec documents, implementation code read-only ([npm](https://www.npmjs.com/package/opencode-plugin-openspec)) | 13 `/opsx-*` commands, Superpowers bridge, TDD ([repo](https://github.com/moyaspace/openspec-superpowers-opencode)) | Phases init/proposal/brainstorming/grill/spec/amend/build/close ([repo](https://github.com/lininn/openflow)) |
      | Apply model | Dependency-ordered parallel subagent waves ([docs/agents.md](docs/agents.md)) | Sequential "Ralph loop", no parallel waves ([repo](https://github.com/AngDrew/opencode-openspec)) | None — planning only ([npm](https://www.npmjs.com/package/opencode-plugin-openspec)) | Parallelism via git worktrees, not execution waves ([repo](https://github.com/moyaspace/openspec-superpowers-opencode)) | Build phase, no parallel waves documented ([repo](https://github.com/lininn/openflow)) |
      | Validation | Mechanical upstream `openspec validate` gate ([README](#install)) | No external CLI ("no external dependencies"), regex requirement counter ([repo](https://github.com/AngDrew/opencode-openspec)) | No validate tool, only permits `openspec` bash calls ([repo](https://github.com/Octane0411/opencode-plugin-openspec)) | Own `/opsx-verify` (CLI status checklist + schema validate), delegates to the openspec CLI ([repo](https://github.com/moyaspace/openspec-superpowers-opencode)) | Calls the openspec CLI and reads its output, manual fallback, no separate validate command documented ([repo](https://github.com/lininn/openflow)) |
      | Commands & roles | 5 `/openspec.*` commands, 7 subagent roles, 16 skills ([docs/agents.md](docs/agents.md)) | 7 tools + 7 skills, no commands or subagents ([repo](https://github.com/AngDrew/opencode-openspec)) | 1 agent, no commands/skills/subagents ([repo](https://github.com/Octane0411/opencode-plugin-openspec)) | 13 `/opsx-*` commands ([repo](https://github.com/moyaspace/openspec-superpowers-opencode)) | CLI + generated multi-tool skills, not OpenCode-native ([repo](https://github.com/lininn/openflow)) |
      | Retro | /openspec.retro — read-only run retrospective, ≤8 cited findings ([docs/agents.md](docs/agents.md)) | None ([repo](https://github.com/AngDrew/opencode-openspec)) | None ([repo](https://github.com/Octane0411/opencode-plugin-openspec)) | Evidence-first `retrospective` artifact in the schema ([repo](https://github.com/moyaspace/openspec-superpowers-opencode)) | None documented ([repo](https://github.com/lininn/openflow)) |
      | npm package | Published ([npm](https://www.npmjs.com/package/@alexeyco/opencode-openspec)) | Not published — registry 404[^14] | `opencode-plugin-openspec` v0.1.4 ([npm](https://www.npmjs.com/package/opencode-plugin-openspec)) | v1.1.1 ([npm](https://www.npmjs.com/package/@moyaspace/openspec-superpowers-opencode)) | v0.5.2 ([npm](https://www.npmjs.com/package/@lininn/openflow)) |

      [^14]: [AngDrew/opencode-openspec](https://github.com/AngDrew/opencode-openspec) has a single commit (2026-02-01, [history](https://github.com/AngDrew/opencode-openspec/commits)) and is not published on npm — the registry returns 404 ([registry.npmjs.org/opencode-openspec](https://registry.npmjs.org/opencode-openspec)), so the `npm install opencode-openspec` line in its README does not resolve.

      </details>
      ```

- [x] 4.5 Pin the Install lead-in (first line of `## Install`) as:
      `Requires [OpenCode v2](https://opencode.ai) (plugin API), [Node.js ≥ 22.18](https://nodejs.org) and the [OpenSpec CLI](https://openspec.dev/docs/installation) — the plugin delegates every mechanical gate to it:`
      — the rest of the Install section (npm command block, "Not
      installed yet?" paragraph, `opencode.json` block, "That's the
      whole setup" paragraph) unchanged. Covers scenario
      "Install section matches engines".
- [x] 4.6 Replace the `## Keeping skills current` body with the pointer
      pinned as:
      ``All 12 upstream workflow skills are vendored byte-identically; a daily CI job re-vendors from the latest OpenSpec and opens a PR on drift, and plugin `vX.Y.Z` bundles exactly the skills of CLI `vX.Y.Z`. Mechanics and the versioning trade-off: [docs/vendor-sync.md](docs/vendor-sync.md).``
      (the version-mirror fact rescued from the removed
      `## Requirements` section).
- [x] 4.7 Replace the `## Using both?` body with the one-sentence
      pointer pinned as:
      `Skill ids match upstream exactly and coexist with the five flow commands — upstream skills are single-workflow steps, the flow commands are the multi-agent runs over the whole change: [docs/using-both.md](docs/using-both.md).`
      Covers scenario "Mechanics prose moved, not rewritten" (the
      pointer's claims stay backed by `docs/using-both.md`).
- [x] 4.8 Keep the five current `## See also` bullets unchanged and
      append the final bullet pinned as:
      `- Alternatives in the same niche — [AngDrew/opencode-openspec](https://github.com/AngDrew/opencode-openspec), [Octane0411/opencode-plugin-openspec](https://github.com/Octane0411/opencode-plugin-openspec), [moyaspace/openspec-superpowers-opencode](https://github.com/moyaspace/openspec-superpowers-opencode), [lininn/openflow](https://github.com/lininn/openflow) — see [Comparison](#comparison).`
      Covers scenario "Alternatives linked neutrally".
- [x] 4.9 Neutrality sweep of the final README: remove any evaluative
      verdict ("better", "worse", "inferior") about competitors and any
      uniqueness claim beyond the pinned three-part combination; do not
      claim retro or grill as unique; the See also bullet stays
      neutral. Then run `grep -n '^## ' README.md` → expected exactly
      eight headings in the pinned order (QuickStart, Comparison, Why,
      What you get, Install, Keeping skills current, Using both?, See
      also), with `## Comparison` and `## Install` present so the
      `#comparison` and `#install` anchors resolve. Covers scenarios
      "Absence stated neutrally" and "Unique-combination claim only".
- [x] 4.10 Run `node scripts/check.mjs` → expected `check: ok`: group 5
      resolves only relative links, and every relative target exists —
      including the new `docs/using-both.md` (group 3) and the retained
      `docs/agents.md`, `docs/vendor-sync.md`, `docs/gallery/banner.svg`;
      `](#install)`, `](#comparison)`, and `[^…]` references are not
      extracted by the group-5 regex (`scripts/check.mjs:210`), and the
      `<details>`/`<summary>` tags and ✅/⚠️/❌ cells add no links.
      Then `grep -n "20\.19" README.md` → expected: no output. Covers
      scenarios "Relative links stay valid" and
      "No stale 20.19 remains". Expected state after group 4 alone:
      README diff is the whole restructure, `check: ok`.

## 5. Final verification

- [x] 5.1 Run `make check` → expected: all four gates green
      (`node scripts/check.mjs`, `node scripts/sync-vendor.mjs --check`,
      `npm run typecheck`, `npm test`) — `Makefile:12-17`.
- [x] 5.2 Run `openspec validate add-positioning-comparison-and-package-metadata`
      → expected: VALID.
- [x] 5.3 Scope gate: `git diff --stat` lists exactly `README.md` and
      `package.json` among tracked project files — `docs/vendor-sync.md`
      is expected unchanged per task 3.2, any hunk there is a reported
      divergence — and `git status --porcelain` additionally shows only
      the new `docs/using-both.md` plus this change's artifacts under
      `openspec/changes/`; no other file touched.
