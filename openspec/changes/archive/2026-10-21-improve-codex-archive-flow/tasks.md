## 1. Archive flow behavior

- [x] 1.1 Update `core/prompts.ts::archiveInstruction` and Codex wrapper `codex/skills.ts::renderArchiveSkill` to sync before archive, stop before archive when required sync is blocked, then validate and repair fixable OpenSpec artifact issues after archive.
- [x] 1.2 Keep `skills/omos-apply/SKILL.md` host-neutral with `/omos.archive <change-id>`; adapt that exact recommendation to `$oh-my-openspec:omos-archive <change-id>` in `codex/skills.ts`, with coverage in `tests/codex-skills.test.ts`.
- [x] 1.3 Update `tests/prompts.test.ts` and `tests/codex-skills.test.ts` to cover the `archiveInstruction` and `renderArchiveSkill` sequence: sync-before-archive, post-archive repair and re-validation, and stop conditions.
- [x] 1.4 Update `tests/assets.test.ts` to assert the shared apply archive recommendation and archive behavior contract.

## 2. Codex skill mentions

- [x] 2.1 Update `codex/skills.ts` substitutions so the shared archive command and every plugin-owned skill recommendation render as `$oh-my-openspec:<skill-id>` mentions in Codex.
- [x] 2.2 Update `tests/codex-skills.test.ts` to verify the apply archive conversion, namespaced recommendations, and absence of Codex-only mentions in the shared source.

## 3. Specification heading rules

- [x] 3.1 Update `agents/omos-planner.md` to require readable `### Requirement:` names and top-level titles when drafting capability specs, while preserving technical identifiers and MODIFIED merge keys.
- [x] 3.2 Update planner contract tests to cover readable requirement names, readable spec titles, and exact MODIFIED header preservation.
- [x] 3.3 Update `core/prompts.ts::archiveInstruction` and `codex/skills.ts::renderArchiveSkill` so sync gives newly created `openspec/specs/<capability>/spec.md` files a readable title derived from capability purpose or meaning, while existing authored titles and machine-named paths remain unchanged; cover both cases in `tests/prompts.test.ts` and `tests/codex-skills.test.ts`.
- [x] 3.4 Migrate machine-identifier top-level titles to readable capability titles in `openspec/specs/agent-role-contracts/spec.md`, `openspec/specs/codex-host-integration/spec.md`, `openspec/specs/comparison-freshness/spec.md`, `openspec/specs/orchestration-flows/spec.md`, `openspec/specs/public-positioning/spec.md`, `openspec/specs/release-publishing/spec.md`, `openspec/specs/role-registration/spec.md`, `openspec/specs/skill-registration/spec.md`, `openspec/specs/slash-commands/spec.md`, `openspec/specs/spec-validation/spec.md`, `openspec/specs/subagent-execution-policy/spec.md`, and `openspec/specs/vendor-sync/spec.md`; preserve each path and every line other than a migrated title, preserve already readable titles, and do not edit archive change artifacts or history.
