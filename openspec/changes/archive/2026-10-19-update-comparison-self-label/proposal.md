# Proposal: update-comparison-self-label

## Why

The README comparison tables label the self-column with the short project
name, not the author handle. The user approved changing the self-column
display label from `@alexeyco` to `omos` (short project name) while keeping
the links on `https://www.npmjs.com/package/oh-my-openspec`. The baseline
spec vocabulary already permits this ("author or short project name"), so
this is a legal editorial choice — but two sentences of the
public-positioning baseline requirement hardcoded `@alexeyco` (the
short-label example list and the self-label sentence). The change was
implemented in the working tree before being formalized; this change
retroactively documents it so the baseline spec and the README stay
governed by a proper delta.

## What Changes

- `README.md`: both comparison-table self-column headers read
  `[omos](https://www.npmjs.com/package/oh-my-openspec)` instead of
  `[@alexeyco](...)`. Already present in the working tree (branch
  `feat/refresh-spec-purposes`, uncommitted).
- `openspec/specs/public-positioning/spec.md`, requirement
  "README comparison table is sourced and dated": the short-label example
  list becomes `(author or short project name: `omos`, `AngDrew`,
  `Octane0411`, `oso`, `openflow`)` and the self-label sentence becomes
  "the self-column display label is the short project name `omos`". The
  matching in-place edit already exists in the working tree; the archive
  merge of this change's delta is the formal application and must be a
  no-op afterwards (delta text == main text).

## Impact

- Capabilities: `public-positioning` only. No other spec, no code, no
  commands or roles change.
- Link targets unchanged; only display labels change.

ASSUMPTION: `omos` is chosen over `oh-my-openspec` for header brevity (user's explicit choice).

REJECTED-RISK: none.
