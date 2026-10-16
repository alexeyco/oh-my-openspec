# Design

## Approach

Follow the existing four-command pattern exactly: pure builders in
`core/prompts.ts`, a fifth `editor.add` block in `opencode/index.ts`, and
all workflow behavior delegated to the bound skill. The command itself
invokes no tools and no git.

## Data shapes and pinned texts

### Command description constant

```ts
export const ARCHIVE_COMMAND_DESCRIPTION =
  "Archive completed OpenSpec changes through the vendored archive workflows";
```

### archiveSkillId(argText): string

Selection rule, pinned:

```
ids = argText.trim().split(/\s+/).filter(Boolean)
ids.length >= 2 → "openspec-bulk-archive-change"
otherwise       → "openspec-archive-change"
```

So 0 ids and 1 id both bind the single-archive skill; only 2+ bind bulk.

### archiveInstruction(argText, skillPath?): string

Three lines joined with `\n`:

- line1 — skill-load line, `skillPath` variant per the
  `core/prompts.ts:36-39` convention:
  - with `skillPath`: `Read the skill file ${skillPath} and follow it exactly.`
  - without: `Load the ${archiveSkillId(argText)} skill and follow it exactly.`
- line2 — argument echo:
  - 0 ids: `No change ids given — list active changes, confirm with the user which to archive.`
  - 1 id: `Change: <id>`
  - 2+ ids: `Changes: <id1>, <id2>` — ids joined with comma-space, in the
    order given, each trimmed.
- line3 — always, regardless of argument count:
  `Validate first with the openspec_validate tool; stop on INVALID unless the user explicitly overrides.`

### Pinned outputs (test expectations)

`/openspec.archive add-dark-mode` →

```
Load the openspec-archive-change skill and follow it exactly.
Change: add-dark-mode
Validate first with the openspec_validate tool; stop on INVALID unless the user explicitly overrides.
```

`/openspec.archive add-a add-b` → the same shape with
`Load the openspec-bulk-archive-change skill and follow it exactly.` and
`Changes: add-a, add-b`.

`/openspec.archive` (empty) → single-skill load line, the 0-ids fallback
line, and the gate line.

## Files to touch

- `core/prompts.ts` — `ARCHIVE_COMMAND_DESCRIPTION`, `archiveSkillId`,
  `archiveInstruction`; header comment lines 1-3 mention the new command.
- `opencode/index.ts` — imports; fifth `editor.add` block whose execute
  is a single `ctx.session.prompt` call binding
  `skills: [{ id: Skill.ID.make(archiveSkillId(prompt?.text ?? "")) }]`;
  the file-header comment (lines 3-4) and the command-block comment
  (lines 139-148) enumerate five commands.
- `tests/prompts.test.ts` — `archiveInstruction` and `archiveSkillId`
  cases; `ARCHIVE_COMMAND_DESCRIPTION` joins the descriptions loop.
- `tests/assets.test.ts` — confirm nothing pins the command count;
  `FLOW_SKILL_IDS` stays four.
- `README.md`, `docs/agents.md`, `skills/openspec-apply/SKILL.md:99` —
  docs and pointer.

## Trade-offs decided

- **0 ids bind the single skill, not "ask first" logic in the builder.**
  The vendored `openspec-archive-change` skill already prompts when the
  choice is ambiguous; if the user then picks 2+ changes, the orchestrator
  re-invokes with explicit ids and the same command re-binds to bulk.
- **No direct `openspec archive` CLI call from the command.** The CLI is
  one change per call; the vendored skills prescribe the manual mv/sync
  orchestration that the base config uses, and the execute body must not
  run tools (baseline requirement).
- **The validation gate is an instruction line, not code.** The command
  cannot call `openspec_validate` from its execute body; the gate line
  makes the orchestrator session perform the check, and INVALID is a hard
  stop unless the user explicitly overrides.
- **Vendored-skill behavior (warn+confirm on incomplete tasks, sync
  choice, bulk confirmation) is not re-specified in the delta** — it
  stays owned by the vendored skills and is re-synced on every `make sync`.
