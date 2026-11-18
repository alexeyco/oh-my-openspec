---
name: omos-retro
description: "Retrospect a finished run via /omos.retro — compile the evidence bundle, dispatch the retrospector, relay ≤8 cited findings. Read-only."
---

# omos-retro

Review the current run for defects in the plugin's prompts and for process
friction or verification gaps visible in its evidence. Read-only: this command
never edits anything — findings are for a future change.

## Flow

### 1. Compile the evidence bundle

From the current session, assemble exactly:

- commands run (`/omos.init`, `/omos.plan`, `/omos.apply`,
  `/omos.archive`) and
  their targets;
- every role dispatch: role, one-line task, final report verbatim;
- every scenario verification result and task completion/defer status present
  in the role reports, including `NO-REGRESSION-TEST:` evidence;
- process evidence verbatim: repeated `BLOCKED:` or `FAIL` outcomes,
  re-dispatches, extra critic/verify rounds, `PLAN DIVERGENCE:` reports,
  user approvals or corrections, and unresolved scenario/task gaps;
- `git diff --stat` at the end of the run.

Keep the bundle raw and ordered — quoted lines and reports, not your
paraphrase. Include only events and gaps evidenced by this run's artifacts;
the retrospector's findings must be quotable from the bundle.

### 2. Dispatch

Send the bundle to `omos-retrospector` verbatim. One dispatch, no
rounds: the role either returns findings or `No findings — run clean.`

### 3. Relay

Present the report as-is. Add nothing — no commentary, no severity
re-shuffling, no "suggestions". Present the report as rendered Markdown,
never inside a code block. If the user wants fixes, that is ordinary
work in the plugin's own repository (`/omos.plan` there, or direct
edits), not an action of this command.

## Guardrails

- Never edit `agents/`, `skills/`, `core/`, or any project file from this
  command.
- The bundle is the only evidence: do not feed the retrospector
  interpretations, and do not fill gaps from memory. Prompt and process
  findings share the eight-finding limit.
- An empty run (no role dispatches) → say so and stop; do not invent a
  session to analyze.
