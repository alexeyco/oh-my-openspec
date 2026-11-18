## 1. Define the quick flow and command surface

- [x] 1.1 Add `skills/omos-quick/SKILL.md` with eligibility restricted to exactly one externally observable behavior in one capability and no public API, architecture, data migration, or security/privacy change. Route multiple independent behaviors, broad or multi-capability scope, excluded changes, and material unresolved risk through ordinary plan/apply gates. Specify the short interview, focused research, planner and critic dispatch, mechanical validation, compact-plan approval before code edits, full apply verification, and separate archive next step. Cover scenarios: Eligible request reaches one compact-plan confirmation; Declined compact plan does not edit project code; Confirmed compact plan completes apply verification; Quick completion leaves archive as a separate action; Invalid validation blocks project-code edits; Broad or risky request uses ordinary plan and apply gates.
- [x] 1.2 Add the `/omos.quick` description and prompt builder in `core/prompts.ts`; register the command and `omos-quick` flow id in `opencode/index.ts`. Pass a supplied request and elicit one when absent. Cover scenarios: Command catalog after setup; Quick command binds only the quick flow skill; Quick command performs one session prompt; Quick command without a request; Quick flow skill added to host catalog.

## 2. Register both host surfaces and document the flow

- [x] 2.1 Ensure `omos-quick` is included in Codex flow skill rendering in `codex/skills.ts`, and update `README.md`, `docs/agents.md`, `docs/codex.md`, and `docs/using-both.md` with the command, mention, and archive boundary. Cover scenario: Quick flow is available as a Codex mention.

## 3. Add regression coverage and generate the Codex bundle

- [x] 3.1 Update `tests/assets.test.ts`, `tests/prompts.test.ts`, `tests/opencode.test.ts`, `tests/codex-skills.test.ts`, and `tests/codex-bundle.test.ts` for the new fixed flow id, command prompt, quick skill contract, Codex mention, and generated bundle counts (31 to 32 files; 6 to 7 flow-family assets). Run `make codex` to generate `plugins/oh-my-openspec/skills/omos-quick/SKILL.md`, then run `make fmt`, `make check`, and `npm pack --dry-run`.
