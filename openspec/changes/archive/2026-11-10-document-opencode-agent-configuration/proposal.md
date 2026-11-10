# Document OpenCode agent configuration

## Why now

Users ask how to configure permissions for the plugin's subagents. Issue #28
shows that a role instruction such as “read-only” can be mistaken for an
OpenCode-enforced access rule. The repository explains that permissions are
intentionally absent from role frontmatter, but it does not show users where
to configure them.

## What changes

Add a dedicated OpenCode configuration guide and link it from the README. The
guide explains permission rules for plugin role IDs, project and global config
locations, and per-agent model and model-variant settings. It distinguishes
prompt instructions from host permissions and explains relevant limitations
and configuration precedence.

## Capabilities

- `opencode-configuration-guidance`: document user-managed OpenCode settings
  for the plugin's registered subagents.

## Impact

Documentation only. The plugin's runtime behavior and role contracts do not
change. The guide refers to OpenCode's current v2 configuration schema and
links to its official documentation for details that may change.

ASSUMPTION: The page covers only the confirmed configuration scenarios (permissions, config location/precedence, models, and reasoning), rather than attempting to list every possible OpenCode question.

REJECTED-RISK: none.
