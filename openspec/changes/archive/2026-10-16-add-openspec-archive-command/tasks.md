# Tasks

## 1. core/prompts.ts builders

- [x] 1.1 Add `ARCHIVE_COMMAND_DESCRIPTION` constant with the exact
      wording "Archive completed OpenSpec changes through the vendored archive
      workflows".
- [x] 1.2 Add `archiveSkillId(argText)`: `ids = argText.trim().split(/\s+/).filter(Boolean)`;
      `ids.length >= 2` → `"openspec-bulk-archive-change"`, otherwise
      `"openspec-archive-change"`.
- [x] 1.3 Add `archiveInstruction(argText, skillPath?)` producing the
      three pinned lines from design.md: skill-load line (with the
      `skillPath` variant per the core/prompts.ts:36-39 convention), argument
      echo (0 ids → fallback, 1 id → `Change: <id>`, 2+ →
      `Changes: <id1>, <id2>` comma-space join), and the always-present gate
      line.
- [x] 1.4 Update the file header comment (lines 1-3) to list
      `/openspec.archive` alongside the other commands.

## 2. opencode/index.ts registration

- [x] 2.1 Import `ARCHIVE_COMMAND_DESCRIPTION`, `archiveInstruction`, and
      `archiveSkillId` from `core/prompts.ts`.
- [x] 2.2 Add the fifth `editor.add` block inside the commands transform:
      name `openspec.archive`, description `ARCHIVE_COMMAND_DESCRIPTION`,
      execute is a single `ctx.session.prompt` call with
      `text: archiveInstruction(prompt?.text ?? "")` and
      `skills: [{ id: Skill.ID.make(archiveSkillId(prompt?.text ?? "")) }]` —
      no tools, no git.
- [x] 2.3 Update the comment blocks: file header (lines 3-4) and the
      command-block comment (lines 139-148) to enumerate five commands and
      document `/openspec.archive [change-id ...]`.

## 3. Tests

- [x] 3.1 In tests/prompts.test.ts add `describe("archiveInstruction")`
      pinning the three design.md outputs, plus the dirty-input case
      `"  add-b   add-a  "` → `Changes: add-b, add-a` (order preserved, no
      stray spacing).
- [x] 3.2 Add `archiveSkillId` cases: `""`, `"  "`, and a single id →
      `openspec-archive-change`; two ids, three ids, and irregular whitespace
      → `openspec-bulk-archive-change`.
- [x] 3.3 Add `ARCHIVE_COMMAND_DESCRIPTION` to the command-descriptions
      loop in tests/prompts.test.ts (lines 82-93).
- [x] 3.4 In tests/assets.test.ts confirm nothing pins the command count
      and `FLOW_SKILL_IDS` stays four — adjust only if a check contradicts,
      no curated archive skill is added.
- [x] 3.5 Run the full test suite and lint; both green.

## 4. Docs

- [x] 4.1 README.md "Commands" list (~lines 70-73): add the
      `/openspec.archive` bullet linking to
      `vendor/openspec/skills/openspec-archive-change/SKILL.md`.
- [x] 4.2 README.md "Using both?" coexistence paragraph: change "the four
      commands this plugin adds" to five and include `/openspec.archive`.
- [x] 4.3 docs/agents.md:17-18: add `/openspec.archive` to the list of
      commands the orchestrator runs.
- [x] 4.4 skills/openspec-apply/SKILL.md:99: replace the bare-vendored-
      skill pointer with `/openspec.archive <change-id>`.
- [x] 4.5 Check CONTRIBUTING.md for a command enumeration; no edit
      expected.

## 5. Validation

- [x] 5.1 Unconditional header-parity check: every MODIFIED requirement
      header in the delta equals a baseline requirement name in
      openspec/specs/slash-commands/spec.md verbatim (:17, :30, :44, :59,
      :84).
- [x] 5.2 Run raw `openspec validate add-openspec-archive-command` and
      keep the full output: it must be VALID (note: VALID prints anyway) with
      no "Archive would refuse this delta" INFO line; `--dry-run` does not
      exist.
- [ ] 5.3 Record a follow-up for the user (NOT an implementer edit): the
      baseline spec's Purpose wording "four user-facing commands" goes stale
      after sync — sync never rewrites Purpose — surface it as a post-archive
      manual touch-up.
- [x] 5.4 Re-read the delta against the vendored skills' warn+confirm,
      sync-choice, and bulk-confirmation behavior; confirm no contradiction.
