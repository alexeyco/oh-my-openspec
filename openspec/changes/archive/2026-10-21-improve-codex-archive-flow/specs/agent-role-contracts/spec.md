## MODIFIED Requirements

### Requirement: The planner role operates in exactly three non-mixing modes with per-mode write bounds

The `omos-planner` prompt SHALL name three modes — `MODE: plan`,
`MODE: baseline`, `MODE: waves` — declared at the top of the task prompt
and never mixed (agents/omos-planner.md:6-8). Each mode carries its
own write bounds: `plan` writes files only inside
`openspec/changes/<change-id>/` (agents/omos-planner.md:12-13);
`baseline` writes only `openspec/specs/<capability>/spec.md` for
capabilities in the confirmed map — no `changes/`, no project code, and
never an existing spec file unless the prompt names it explicitly
(agents/omos-planner.md:57-60); `waves` is read-only and never
changes artifact content (agents/omos-planner.md:82,106). No mode
touches project code (agents/omos-planner.md:106).

In `MODE: plan` the drafting steps SHALL additionally enforce: a
`### Requirement:` under `## MODIFIED` matches the baseline header
verbatim, since the delta merges by header name, and a rename goes to
`## RENAMED Requirements` with `FROM:`/`TO:` pairs
(agents/omos-planner.md:23-25); no conditional-fallback task is ever
carried in place of fixing such a header (agents/omos-planner.md:34-36);
before DONE and before finishing a revise round, `tasks.md` is re-read
against the delta specs so every cited scenario name appears verbatim as
a `#### Scenario:` heading and no two scenarios assert contradictory
output (agents/omos-planner.md:31-34); a group that removes a lint
suppression or renames a symbol greps its call and test sites in the same
task and states the build result expected after that group alone, and
groups inseparable without leaving the tree uncompilable merge into one
group — merge addresses compile coupling, while the `MODE: waves` rule to
serialize overlapping-file groups addresses parallel-dispatch conflicts,
and the prompt keeps them distinct (agents/omos-planner.md:36-43,90-92);
the report states that a passing `openspec validate` certifies format,
not archive-ability (agents/omos-planner.md:50-52).

Planner and critic accept the same delta headers: the planner's header
list is `## ADDED|MODIFIED|REMOVED|RENAMED Requirements` with RENAMED
holding `FROM:`/`TO:` pairs (agents/omos-planner.md:19-20), matching
the critic's editorial rule (agents/omos-critic.md:19-21).

In `MODE: plan` and `MODE: baseline`, the planner SHALL give each `### Requirement:` heading a human-readable name and each capability specification a human-readable top-level markdown title. These displayed titles SHALL describe the requirement or capability rather than repeat its machine identifier. The change's migration SHALL also replace machine-identifier top-level titles in every existing main capability specification under `openspec/specs/**/spec.md` with human-readable titles. Technical change IDs, capability directory names, and paths SHALL remain stable; content other than a migrated top-level title remains unchanged. Archive change artifacts and historical archived specifications are outside this migration. In `MODE: plan`, a `MODIFIED` requirement heading SHALL still match the baseline header verbatim; when that header is not human-readable, the planner SHALL use the existing `RENAMED Requirements` mechanism rather than silently changing the merge key.

#### Scenario: Drafted requirement names are human-readable

- **WHEN** the planner writes an added requirement in plan mode or any requirement in baseline mode
- **THEN** its `### Requirement:` heading is a readable description rather than an identifier such as `archive-validation`

#### Scenario: Capability spec has a readable title

- **WHEN** the planner writes a capability spec file under its machine-named directory
- **THEN** the file's top-level heading is a human-readable capability name and the directory path remains unchanged

#### Scenario: Existing main specification titles are migrated

- **WHEN** an existing main specification under `openspec/specs/**/spec.md` has a machine-identifier top-level title, such as `# codex-host-integration Specification`
- **THEN** its top-level title is rewritten as a readable capability name, such as `# Codex host integration`, while its path and all other file content remain unchanged

#### Scenario: Modified merge key preserves a non-readable baseline name

- **WHEN** a baseline requirement heading is not human-readable and the planner changes its behavior
- **THEN** the planner preserves the exact baseline heading in a `MODIFIED` delta or expresses the heading change through `RENAMED Requirements`

#### Scenario: Write bounds stated per mode

- **WHEN** the planner asset is read
- **THEN** `MODE: plan` bounds writes to `openspec/changes/<change-id>/`
  (agents/omos-planner.md:13), `MODE: baseline` bounds them to named
  files under `openspec/specs/` (agents/omos-planner.md:57-60), and
  `MODE: waves` declares the mode read-only (agents/omos-planner.md:82)

#### Scenario: Modes are never mixed

- **WHEN** the planner asset is read
- **THEN** it states the three modes are never mixed
  (agents/omos-planner.md:6-8) and project code is never touched in
  any mode (agents/omos-planner.md:106)

#### Scenario: MODIFIED header must match the baseline verbatim

- **WHEN** the planner drafts a `## MODIFIED` requirement whose header
  differs from the baseline spec's `### Requirement:` line
- **THEN** the header is corrected to the verbatim baseline text, or the
  rename moves to `## RENAMED Requirements` with `FROM:`/`TO:` pairs —
  never papered over with a conditional-fallback task
  (agents/omos-planner.md:23-25,34-36)

#### Scenario: Compile-coupled groups merge into one

- **WHEN** two candidate task groups cannot be split without leaving the
  tree uncompilable
- **THEN** the planner writes them as a single group, and a group that
  drops a lint suppression or renames a symbol carries the call/test-site
  grep and the expected post-group build result in that same task
  (agents/omos-planner.md:36-43)

#### Scenario: Pre-DONE self-check of tasks against deltas

- **WHEN** the planner finishes `tasks.md` in `MODE: plan`
- **THEN** it has re-read `tasks.md` against the delta specs — every
  cited scenario name matches a `#### Scenario:` heading verbatim and no
  two scenarios contradict each other — before reporting DONE
  (agents/omos-planner.md:31-34)

#### Scenario: Planner report disclaims archive-readiness

- **WHEN** the planner reports a passing `openspec validate` result for a
  drafted change
- **THEN** the report states the result certifies format only, not
  archive-ability, and claims nothing about CLI archive behavior beyond
  its stated semantics (agents/omos-planner.md:50-52)
