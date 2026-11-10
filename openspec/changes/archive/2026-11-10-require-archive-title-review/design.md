# Archive title review design

## Approach

Extend the shared `archiveInstruction` in `core/prompts.ts` so the archive procedure reviews titles after its initial validation and before specification sync or archive. The selected change's document-level title headings and specification `Requirement` headings are in scope. The archive flow also reviews document titles and requirement headings in main specifications that the selected deltas will affect. It corrects `TBD` and technical machine-name titles only when the intended readable wording is supported by the artifact content. If the title is ambiguous, the flow asks the user to choose and waits for that choice before continuing.

Preserve existing readable authored main-spec titles. A `MODIFIED` requirement heading remains identical to its baseline merge key; changing that name requires the `RENAMED Requirements` form. Historical archived changes and their specifications are not inspected or edited.

`codex/skills.ts::renderArchiveSkill` renders the shared instruction into the Codex skill, so it receives the same title-review behavior without a separate policy copy. The generated `plugins/oh-my-openspec/skills/omos-archive/SKILL.md` remains generated output.

## Files

- `core/prompts.ts` — add the pre-sync title review, safe correction, and user decision gate to `archiveInstruction`.
- `codex/skills.ts` — update the pinned archive instruction line count and ordering checks, and verify rendering of the shared instruction in all argument-count branches.
- `tests/prompts.test.ts` — cover the shared archive instruction's title review and ordering.
- `tests/codex-skills.test.ts` — cover rendering of the added instruction in the Codex archive skill and update its ordered-step assertions.
- `tests/assets.test.ts` — cover the shared archive contract's source asset requirements.
- `openspec/specs/orchestration-flows/spec.md` — sync the archive title-review requirements.
- `openspec/specs/agent-role-contracts/spec.md` — sync archive title scope and merge-key constraints.
