## 1. Specify archive title review

- [x] 1.1 Update `openspec/specs/orchestration-flows/spec.md` with archive guidance requirements and scenarios for pre-sync title review, safe correction, ambiguity resolution, and preserving historical archives.
- [x] 1.2 Update `openspec/specs/agent-role-contracts/spec.md` with archive title-review scope and the `MODIFIED`/`RENAMED Requirements` merge-key rule.

## 2. Implement shared archive guidance

- [x] 2.1 Update `core/prompts.ts::archiveInstruction` to inspect selected change document titles and specification requirement headings, plus affected main-spec titles and requirement headings, before sync and archive; fix only titles clearly derived from content and pause for user choice when ambiguous.
- [x] 2.2 Keep `MODIFIED` requirement headings verbatim to the baseline unless the change expresses the rename through `RENAMED Requirements`; leave historical archived changes untouched.
- [x] 2.3 Update `codex/skills.ts::renderArchiveSkill` to account for the added instruction line in its pinned line count and verify that zero-, one-, and multi-id branches render the shared title-review guidance.

## 3. Verify archive title guidance

- [x] 3.1 Add focused assertions in `tests/prompts.test.ts` for title-review scope, pre-sync ordering, safe correction, ambiguity pause, and merge-key protection.
- [x] 3.2 Add focused assertions in `tests/codex-skills.test.ts` and `tests/assets.test.ts` that the generated Codex archive skill carries the shared title-review rules without adding a competing copy; update the ordered-step assertions for the pre-sync review.
- [x] 3.3 Run the relevant prompt, asset, and Codex skill tests and validate the change with `openspec validate require-archive-title-review`.
