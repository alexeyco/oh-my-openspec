# Design: Proactively handle OpenSpec validation findings

## Approach

Add an explicit mechanical validation and recovery step to the plan skill after critique and before approval. The skill will pass the selected change id to `openspec_validate`, give exact findings to the planner on `INVALID`, and revalidate after each revision. If the issue remains or the planner is blocked, the flow will present the remaining findings and offer another revision or user-led repair.

Extend the shared archive instruction with a proactive offer for unresolved post-archive findings. The offer follows safe repair and revalidation, preserves the existing stop condition, and does not imply that an invalid result passed.

## Files

- `skills/omos-plan/SKILL.md` — define post-critique validation, planner correction, revalidation, and unresolved-finding recovery.
- `core/prompts.ts` — extend the shared archive instruction for unresolved validation findings.
- `tests/assets.test.ts` — assert the plan skill includes the required validation and recovery behavior.
- `tests/prompts.test.ts` — assert the archive instruction includes the proactive offer and preserves the validation sequence.
- `tests/codex-skills.test.ts` — assert the rendered archive skill carries the updated shared instruction.
- `openspec/specs/orchestration-flows/spec.md` — synchronize the two added requirements when the change is archived.

## Decisions

- Use upstream `openspec_validate` as the sole mechanical validator; do not add validation rules.
- Keep the existing three-round critique limit. The new validation correction step handles mechanical `INVALID` findings after the critique path and does not consume critic rounds.
- A remaining `INVALID` result is always reported as unresolved. The user chooses whether to request another planner revision or make the fix themselves.
