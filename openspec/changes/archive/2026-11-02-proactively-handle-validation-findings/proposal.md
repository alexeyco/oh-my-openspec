# Proactively handle OpenSpec validation findings

## Why now

Validator findings can remain without a clear next step after archive, and the normal plan path does not specify what to do when mechanical validation fails after critique.

## What changes

The plan flow will validate the drafted change after critique, send exact `INVALID` findings to the planner for correction, and revalidate each revision. If findings remain or the planner cannot safely resolve them, the flow will show them and offer the user another revision or the chance to fix them. The archive flow will continue repairing safely fixable OpenSpec issues and, when findings remain, show them and proactively offer the user help to resolve them.

## Capabilities

- `orchestration-flows`: define plan-time validation recovery and proactive next steps for unresolved post-archive findings.

Rejected risks: none.
