## 1. Plan validation recovery

- [x] 1.1 Update `skills/omos-plan/SKILL.md` to validate the selected change after critique and before approval, dispatch exact `INVALID` findings to `omos-planner`, and revalidate each revision.
- [x] 1.2 Specify that unresolved findings or a planner blockage are shown to the user with an offer for another planner revision or user-led repair, without claiming validation passed.
- [x] 1.3 Update `tests/assets.test.ts` to cover the plan validation, correction, revalidation, and unresolved-finding offer.

## 2. Archive recovery offer

- [x] 2.1 Update `core/prompts.ts::archiveInstruction` to proactively offer help resolving exact post-archive findings that remain after safe repairs, while preserving the stop condition and no-success claim.
- [x] 2.2 Update `tests/prompts.test.ts` and `tests/codex-skills.test.ts` to cover the shared instruction and rendered archive skill behavior.

## 3. Validate the change artifacts

- [x] 3.1 Run `openspec_validate` for `proactively-handle-validation-findings` and resolve every mechanical violation.
- [x] 3.2 Run the applicable project formatting and validation checks for the changed skill and prompt instructions.
