---
name: openspec-retro
description: "Retrospect a finished run via /openspec.retro — compile the evidence bundle, dispatch the retrospector, relay ≤8 cited findings. Read-only."
---

# openspec-retro

Mine the current session for defects in the plugin's own prompts. Read-only:
this command never edits anything — findings are for a future PR.

## Flow

### 1. Compile the evidence bundle

From the current session, assemble exactly:

- commands run (`/openspec.init`, `/openspec.plan`, `/openspec.apply`,
  `/openspec.archive`) and
  their targets;
- every role dispatch: role, one-line task, final report verbatim;
- friction lines: `BLOCKED:`, `FAIL`, `NEEDS-FIX`, re-dispatches, extra
  critic/verify rounds, user corrections ("no, I meant…");
- `git diff --stat` at the end of the run.

Keep the bundle raw — quoted lines, not your paraphrase of them. The
retrospector's findings must be quotable from it.

### 2. Dispatch

Send the bundle to `openspec-retrospector` verbatim. One dispatch, no
rounds: the role either returns findings or `No findings — run clean.`

### 3. Relay

Present the report as-is. Add nothing — no commentary, no severity
re-shuffling, no "suggestions". Present the report as rendered Markdown,
never inside a code block. If the user wants fixes, that is ordinary
work in the plugin's own repository (`/openspec.plan` there, or direct
edits), not an action of this command.

## Guardrails

- Never edit `agents/`, `skills/`, `core/`, or any project file from this
  command.
- The bundle is the only evidence: do not feed the retrospector
  interpretations, and do not fill gaps from memory.
- An empty run (no role dispatches) → say so and stop; do not invent a
  session to analyze.
