# Add a quick plan-and-apply flow

## Why now

Small, bounded changes currently require separate planning and implementation
runs. Users must invoke `/omos.plan`, review its full planning process and
report, then invoke `/omos.apply` with the change id. A quick flow removes that
handoff while keeping the change documented and verified.

## What changes

Add `/omos.quick` and the `omos-quick` flow skill. Quick is eligible only for
exactly one externally observable behavior in one capability, with no public
API, architecture, data migration, or security/privacy change. The flow uses a
short interview and focused research, skips the adversarial grill, and retains
planner drafting, critic review, mechanical OpenSpec validation, a compact
plan review, and a user confirmation before editing project code. After
confirmation, it applies the change with scenario verification, the full
project check suite, and diff review. It finishes without archiving, committing,
or pushing; the user may archive the completed change separately.

If triage finds multiple independent behaviors, a broad or multi-capability
request, any excluded API, architecture, migration, or security/privacy work,
or a material risk that remains unresolved, the flow switches to the ordinary
plan/apply gates within the same invocation.

## Capabilities

- **Orchestration flows:** add the quick plan-and-apply workflow and its
  eligibility, confirmation, fallback, verification, and stop behavior.
- **Slash commands:** register `/omos.quick` and bind it to `omos-quick`.
- **Skill registration:** add the new source flow skill to the fixed catalog.
- **Codex host integration:** render the same source skill as a Codex mention.

ASSUMPTION: When quick triage selects the ordinary plan/apply path, it continues those gates in the same `/omos.quick` invocation rather than stopping to ask the user to start a separate command.

ASSUMPTION: `/omos.quick` accepts a free-form request after the command, using the existing `/omos.plan` request convention; without one, it elicits the request during the short interview. Local precedent: `node --experimental-strip-types --input-type=module -e 'import { planInstruction } from "./core/prompts.ts"; console.log(planInstruction("add quick change"));'` → `User request: add quick change`.
