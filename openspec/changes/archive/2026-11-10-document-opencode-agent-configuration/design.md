# Design

## Approach

Add one user-facing OpenCode configuration page and link to it from the
README's `See also` list. Keep configuration user-managed; do not change the
plugin's role files or runtime registration. Use the current OpenCode v2
`agents` schema and link to the official Agents, Config, and Permissions
documentation for evolving schema details.

The permissions section uses `omos-researcher` as a concrete example. It
distinguishes a deny for the `edit` action from shell permissions, notes that
prompt instructions are behavioral guidance rather than host access controls,
and explains the parent launch permission separately from the child's own
permissions. It does not claim that one rule creates complete read-only
isolation.

The scope section identifies project and global config locations and explains
the relevant merge/ordering behavior. The model section shows a role-level
model override and model-specific variant syntax for reasoning; it also states
that an unset subagent model inherits the parent session model. No universal
reasoning key or model ID is asserted.

## Files

- `docs/opencode.md` — practical permission, config scope, model,
  and reasoning-variant guidance with official OpenCode references.
- `README.md` — relative link to the new guide in `See also`.

## Trade-offs

The guide gives only the configuration needed for the confirmed scenarios.
OpenCode owns the schema and rule semantics, so link to its official docs and
avoid duplicating its full configuration reference. Agent-specific shell
denial can interfere with roles that need to inspect a repository; explain
the separate action rather than recommending a blanket shell denial.
