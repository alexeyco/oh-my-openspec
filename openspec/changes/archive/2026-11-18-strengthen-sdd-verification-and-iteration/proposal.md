# Strengthen scenario verification and plan iteration

## Why now

The planning flow already links scenarios to tasks, and apply executes scenarios and reports evidence. The workflow does not consistently identify the intended verification method before implementation, and an implementation discovery outside the approved delta currently stops as a plan defect without a defined route to revise the contract. Planning also lacks an explicit risk-area review, while the scenario shape checks do not require observable, atomic, implementation-neutral outcomes. Finally, `/omos.retro` currently limits its review to defects in the plugin's prompts, so repeated process friction and verification gaps are not captured as first-class findings.

## What changes

Require plans to map each acceptance scenario to a verification method and expected evidence, then require verification reports to identify the actual test, command, or manual/composited evidence. Add an explicit user-approved plan-revision loop when implementation reveals a genuine mismatch. Extend planning and critique with an applicability-based risk review and sharper scenario-writing criteria, including meaningful failure and boundary cases. Extend `/omos.retro` to evaluate evidence of process friction and quality alongside prompt defects, within the same eight-finding limit.

## Capabilities

- `orchestration-flows`: plan risk review and approved plan revision during apply.
- `agent-role-contracts`: scenario quality, verification mapping, evidence reporting, and retrospective contracts.

## Risk review

- Non-functional behavior — **Applicable:** keep the workflow's verification evidence concise and preserve the retrospective limit of eight findings.
- Security and privacy — **Applicable:** process findings use only the run's existing evidence bundle; do not introduce external collection or broader session capture.
- Compatibility and migration — **Applicable:** existing OpenSpec changes remain valid; the new scenario evidence mapping applies to changes planned under the updated workflow.
- Concurrency — **Out of scope:** this change adds no shared runtime state or concurrent mutation behavior.
- Observability — **Applicable:** scenario reports identify concrete verification evidence, and retrospectives surface evidenced process failures and gaps.
- Accessibility — **Out of scope:** this change modifies agent workflow instructions and artifacts, not a user interface.

ASSUMPTION: The verification mapping belongs in existing OpenSpec change artifacts and role reports; no new artifact format or runtime code is needed.

ASSUMPTION: User confirmation is required before a plan revision changes the approved observable behavior or scope; editorial clarifications that preserve the contract can be made without widening it.
