# Codex CLI host

oh-my-openspec runs on Codex CLI as a plugin, delivered from this
repository's own git marketplace. The flow skills, the twelve vendored
upstream workflow skills, the seven role prompts, and the shared
subagent contract are the same single sources the OpenCode plugin
registers — [`codex/render.ts`](../codex/render.ts)
renders them into Codex-native pieces and commits the result as the
generated bundle under `plugins/oh-my-openspec/` (31 files: 18 skills —
six `omos-*` flow-family plus twelve vendored `openspec-*` — seven role
TOMLs, two manifests, and four asset files, including the catalog icon).
`make codex` regenerates
it; the bundle is never hand-edited — drift against a fresh render
fails `tests/codex-bundle.test.ts`.

## Quickstart

Prerequisite: Node ≥ 22.18 on PATH — the bundled MCP server imports
TypeScript directly (see [Node floor](#node-floor)).

1. Add the marketplace and install the plugin:

   ```sh
   codex plugin marketplace add alexeyco/oh-my-openspec
   codex plugin add oh-my-openspec@oh-my-openspec
   ```

   `marketplace add` also accepts a git URL (HTTPS or SSH) or a local
   path — the local form lets you test a checkout before pushing it.

2. Approve the `openspec` MCP server when Codex prompts for it (the
   approval is recorded once under
   `[plugins."oh-my-openspec@oh-my-openspec".mcp_servers."openspec"]`
   in `~/.codex/config.toml`), then restart the session.
3. After the restart, `/mcp` shows `openspec` live — the bundled
   validation server is up.
4. Install the seven role TOMLs into `~/.codex/agents/` — either way:

   - In a Codex session: mention `$omos-setup`. The bundled skill finds
     the marketplace clone and runs the installer for you.
   - From a checkout of this repository:

     ```sh
     node codex/install-agents.mjs --source plugins/oh-my-openspec/assets/agents
     ```

     or `node plugins/oh-my-openspec/assets/install-agents.mjs` — the
     bundle's verbatim copy, whose default source resolves next to it.

The installer prints copy/skip/update counts and the MCP-approval and
restart reminders itself. Afterwards the eighteen skills are visible
namespaced `oh-my-openspec:omos-*` and `oh-my-openspec:openspec-*`, and
`spawn_agent` can name the seven roles.

## Invocation

Two shapes, nothing else: a `$omos-*` or `$openspec-*` mention in your
message, or the /skills picker. There are no `/omos.*` slash aliases on
Codex. Arguments are plain text after the mention — `$omos-plan add
search filtering to the API` delivers "add search filtering to the API"
to the skill — with no argument substitution of any kind.

| Skill        | Mention              | Purpose                                             |
| ------------ | -------------------- | --------------------------------------------------- |
| omos-init    | `$omos-init`         | Bootstrap baseline specs describing what exists     |
| omos-plan    | `$omos-plan <idea>`  | Draft one complete change under `openspec/changes/` |
| omos-apply   | `$omos-apply <id>`   | Implement task groups in waves, verify, review      |
| omos-archive | `$omos-archive <id>` | Archive a finished change (bulk for 2+ ids)         |
| omos-retro   | `$omos-retro`        | Retrospect a finished run into cited findings       |
| omos-setup   | `$omos-setup`        | (Re)install the role TOMLs and the MCP approval     |

The twelve vendored upstream workflow skills ship in the bundle too —
the same set the OpenCode plugin registers, namespaced
`oh-my-openspec:openspec-*`, invoked as `$openspec-<name>`:

| Skill                        | Mention                         | Purpose                                          |
| ---------------------------- | ------------------------------- | ------------------------------------------------ |
| openspec-apply-change        | `$openspec-apply-change`        | Implement tasks from an OpenSpec change          |
| openspec-archive-change      | `$openspec-archive-change`      | Archive a completed change                       |
| openspec-bulk-archive-change | `$openspec-bulk-archive-change` | Archive several changes at once                  |
| openspec-continue-change     | `$openspec-continue-change`     | Create the next artifact of a change             |
| openspec-explore             | `$openspec-explore`             | Thinking-partner mode for exploring ideas        |
| openspec-ff-change           | `$openspec-ff-change`           | Fast-forward all artifacts in one step           |
| openspec-new-change          | `$openspec-new-change`          | Start a new change step by step                  |
| openspec-onboard             | `$openspec-onboard`             | Guided first workflow cycle                      |
| openspec-propose             | `$openspec-propose`             | Describe a change, get all artifacts in one step |
| openspec-sync-specs          | `$openspec-sync-specs`          | Sync delta specs to main specs, no archive       |
| openspec-update-change       | `$openspec-update-change`       | Revise a change's planning artifacts             |
| openspec-verify-change       | `$openspec-verify-change`       | Verify implementation against artifacts          |

Next-step hints inside the flows use the same mention forms — no
`/omos.*` slash text anywhere.

## Roles and validation

The seven subagents (see [agents.md](agents.md)) run from
`~/.codex/agents/omos-*.toml`, rendered from `agents/*.md` with the
shared subagent contract baked into `developer_instructions` — no
model, sandbox, or approval pins; Codex sessions inherit those. The
flow dispatches roles with `spawn_agent` / `send_input` / `wait_agent`
/ `close_agent`; subagents are asynchronous with up to six concurrent
threads, so a wave is one batch of spawns collected via `wait_agent`,
never a poll.

`openspec_validate` comes from the plugin's bundled MCP server, exposed
as `mcp__openspec__openspec_validate`, with the same one-look
VALID/INVALID/UNAVAILABLE/ERROR report as on OpenCode. On Codex the
tool takes `{ change?, cwd? }`: the roles pass the session's project
directory as `cwd`, and the `change` filter stays optional.

The `cwd` parameter exists because of the launch form: `.mcp.json`
starts the server with its own working directory at the plugin root —
the plugin cache on an installed system — and nothing else tells the
server where the session's project lives, so the project directory
travels as a tool argument. An omitted `cwd` falls back to the server's
own working directory, which only applies when running the server from
a checkout. The OpenCode tool's schema is unchanged — `{ change? }`
only; the npm package stays OpenCode-only.

The server is a dependency-free stdio process importing the
host-agnostic `core/openspec.ts` (the bundle ships a verbatim copy next
to the server); validation rules stay upstream's.

## Node floor

Node ≥ 22.18 — the same floor `package.json` `engines` declares. The
bundled MCP server (`assets/mcp-server.mjs`) imports `openspec-core.ts`
— the verbatim `.ts` copy of `core/openspec.ts` shipped next to it —
and relies on Node's type stripping for `.ts` imports, which needs
v22.18. The installer prints a warning when the running Node is
older.

## Managed files and upgrades

The installer writes only its own seven file names under
`~/.codex/agents/`, each stamped with a first line
`# managed-by: oh-my-openspec@<version>`:

- identical target → skipped
- differing target with the marker → updated silently. The marker means
  machine-owned: local edits to a managed TOML are overwritten by the
  next update run.
- differing target without the marker → refused per file, left
  untouched, exit 1 unless `--force`

To customize a role, write a differently-named agent file: the
installer never plans file names it does not own, so a foreign name is
never touched.

After `codex plugin marketplace upgrade`, run `$omos-setup` again — the
new bundle's TOMLs differ from the installed ones, and the update path
converges them with no conflict dialog.

## Archive flow

Archive ships in the bundle — no project-level `openspec init` step of
any kind. `$omos-archive <id>` is the Codex twin of `/omos.archive`:
with no id it lists the active changes and confirms first, with one id
it delegates to the bundled `$openspec-archive-change` skill, and with
two or more ids to the bundled `$openspec-bulk-archive-change` skill —
the same id-count routing OpenCode runs, single-sourced from
`core/prompts.ts`, and every branch ends with the validation gate line
carried verbatim: "Validate first with the openspec_validate tool;
stop on INVALID unless the user explicitly overrides." The next-step
hints inside `$omos-apply` name the same bundled
`$openspec-archive-change` skill. The OpenCode-side vendored set stays
`--tools opencode` — see [vendor-sync.md](vendor-sync.md).

## Catalog listing metadata

The generated Codex manifest includes the required listing fields:
`longDescription`, `developerName`, `category`, and `capabilities`. The
existing square `assets/icon.svg` is referenced by both `logo` and
`composerIcon`. The bundled MCP server uses local `stdio`, so the listing
does not include `websiteURL`, `supportURL`, `privacyPolicyURL`, or
`termsOfServiceURL`. Those four accessible HTTPS URLs are required when
an attached remote MCP app is submitted for public MCP review; they are
not required for the current local `stdio` package.

## Acceptance checklist

The install is verified end-to-end on Codex CLI 0.164.0 with these
steps, in a scratch repo unless noted:

1. `codex plugin marketplace add alexeyco/oh-my-openspec` → the
   marketplace appears in `codex plugin marketplace list`.
2. `codex plugin add oh-my-openspec@oh-my-openspec` → the plugin is
   listed, eighteen skills are visible (six `oh-my-openspec:omos-*`
   and twelve `oh-my-openspec:openspec-*` vendored), and the
   plugin cache tree holds exactly the 31 bundle files and the manifest's
   `interface.logo` and `interface.composerIcon` paths resolve to the
   bundled icon.
3. Approve the `openspec` MCP server when prompted; restart the
   session → `/mcp` shows `openspec` live, and a trivial
   `mcp__openspec__openspec_validate` call with `cwd` set to the
   scratch repo returns a report about the scratch repo, not the
   plugin cache.
4. Run `$omos-setup` → seven `~/.codex/agents/omos-*.toml` exist; a
   second run reports seven skips, zero copies. Then locally modify one
   managed TOML (keeping its `# managed-by:` first line) and re-run →
   that file is planned `update` and rewritten, not refused.
5. In a scratch repo with `openspec/` initialized, run
   `$omos-plan <idea>` → the flow dispatches `spawn_agent` waves, calls
   `mcp__openspec__openspec_validate` with `cwd` = the scratch repo's
   absolute path, creates `openspec/changes/<id>/`, and the final
   report prints VALID — the validated project is the scratch repo,
   not the plugin cache.
6. Archive probe in a scratch repo WITHOUT project-level skills (no
   `.agents/skills`; move any earlier `openspec init --tools codex`
   output aside for the probe): invoke `$omos-archive <id>` → the
   wrapper loads, delegates to the bundled `$openspec-archive-change`
   skill, and the change archives. Also confirm the bare
   `$openspec-archive-change` mention resolves from the bundle (if only
   the namespaced form does, apply the fallback recorded in the change
   design and re-render). No project-level `openspec init` anywhere in
   the probe.
7. In the plugin repo: `make check` prints `check: ok`, and
   `npm pack --dry-run` shows the tarball gaining only `docs/codex.md`
   — via the existing `docs` entry in the `files` allow-list, with no
   new `files`/`bin`/`exports` entries and no `codex/` or `plugins/`
   entries.

## Building the bundle

`make codex` runs `node codex/render.ts` and rewrites
`plugins/oh-my-openspec/` deterministically: seven role TOMLs from
`agents/*.md`, the six flow-family skills (four from
`skills/*/SKILL.md`, `codex/setup-skill.md`, and the `omos-archive`
wrapper rendered from `core/prompts.ts`), the twelve vendored skills
copied from `vendor/openspec/skills/`, the two manifests from
`codex/manifest.ts`, the MCP server (one import path rewritten for the
bundle layout), the validation core (a verbatim copy of
`core/openspec.ts`), and the installer (verbatim copy). Sorted file
order, LF endings, trailing newlines, one `package.json` version read —
`tests/codex-bundle.test.ts` byte-compares the committed tree against
a fresh render, so a hand edit cannot survive the next check.

## See also

- [agents.md](agents.md) — the role catalog; the same seven roles.
- [vendor-sync.md](vendor-sync.md) — where the vendored upstream skills
  come from and how they stay fresh — the Codex bundle copies the same
  set.
