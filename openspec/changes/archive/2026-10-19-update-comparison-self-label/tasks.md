# Tasks: update-comparison-self-label

## 1. Self-column label

- [x] 1.1 README self-column headers use the `omos` display label in both
  comparison tables —
  `[omos](https://www.npmjs.com/package/oh-my-openspec)` in the matrix
  (`README.md:38`) and the detailed table (`README.md:79`). Landed
  pre-formalization in the branch's uncommitted edits; verified by task
  1.3.
- [x] 1.2 Update the public-positioning requirement "README comparison
  table is sourced and dated" so the short-label example list and the
  self-label sentence say `omos` — applied by this change's archive merge
  of `specs/public-positioning/spec.md` (MODIFIED block reproduces the
  intended main-spec text byte-for-byte). Closed by the archive itself:
  delta == main verified byte-identical 2026-10-19, so the merge is a
  no-op and the main spec already carries the `omos` sentences.
- [x] 1.3 Verify (run 2026-10-19 in this session): `grep -c '\[@alexeyco\]' README.md` → 0;
  `openspec validate --specs` → `Totals: 11 passed, 0 failed`; `make check` →
  `check: ok`, `sync-vendor: vendor/ in sync with @fission-ai/openspec@1.14.3 (12 skills)`,
  `fail 0`; the
  delta scenarios "Five sourced columns" and "Every cell carries its
  source" still hold (header display label changed, link targets did
  not); the unchanged scenarios "States defined by legend" and "Relative
  links stay valid" are untouched by this change.
- [x] 1.4 Note for the archive step: the main spec
  (`openspec/specs/public-positioning/spec.md`) was edited in place before
  this change was formalized, and that edit is superseded by the archive
  merge. After archive, the merge must be a no-op — the delta text equals
  the main-spec text (idempotent); confirm with `git diff --
  openspec/specs/public-positioning/spec.md` showing no label change at
  archive time.
