---
name: omos-archive
description: "Archive completed OpenSpec changes through the vendored archive workflows, delegating to the bundled $openspec-archive-change skill ($openspec-bulk-archive-change for two or more ids). Invoke via $omos-archive."
---

# omos-archive

Archive completed OpenSpec changes by delegating to the bundled vendored
archive skills — the Codex twin of OpenCode's archive command. Every
instruction line below is rendered from `archiveInstruction` in
`core/prompts.ts`, the same single source the OpenCode command prompts
with; the only transforms are the id-count branches pinned statically
and the skill names in the load lines rendered as `$`-mentions.

Arguments arrive as plain text in the user's message after the
`$omos-archive` mention — there is no argument substitution. Split the
message on whitespace into change ids and follow the branch the id
count selects (the `archiveSkillId` mapping: zero or one id binds the
single-archive skill, two or more bind the bulk one):

- Zero ids —
  Load the `$openspec-archive-change` skill and follow it exactly.
  No change ids given — list active changes, confirm with the user which to archive.
- One id —
  Load the `$openspec-archive-change` skill and follow it exactly.
  Change: <change-id>
- Two or more ids —
  Load the `$openspec-bulk-archive-change` skill and follow it exactly.
  Changes: <id-1>, <id-2>

Whatever the branch, the validation gate always applies:

Validate first with the openspec_validate tool; stop on INVALID unless the user explicitly overrides.
