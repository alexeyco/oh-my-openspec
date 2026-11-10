# OpenCode configuration guidance Specification

## Purpose

This capability documents how users configure OpenCode permissions, config scope, and model variants for plugin subagents.

## Requirements

### Requirement: Explain user-managed permissions for plugin roles

The documentation SHALL explain that role prompt instructions do not enforce
host access controls, and SHALL show how to add a permission rule for a plugin
role under the OpenCode v2 `agents` configuration key.

#### Scenario: Configure a role permission

- **WHEN** a reader wants to deny the `edit` action to `omos-researcher`
- **THEN** the guide shows a project or global `opencode.jsonc` example using
  `agents.omos-researcher.permissions` with a deny rule for `edit` on `*`

#### Scenario: Understand the limits of a permission rule

- **WHEN** a reader treats an `edit` deny rule as complete read-only isolation
- **THEN** the guide explains that permissions apply to matching actions and
  resources, that shell is a separate action, and that prompt instructions are
  not a substitute for host permission rules

#### Scenario: Distinguish launching from child permissions

- **WHEN** a reader configures which subagents a parent may start
- **THEN** the guide explains that the parent's `subagent` permission controls
  launching while a child role uses its own configured permissions

### Requirement: Explain OpenCode configuration scope and precedence

The documentation SHALL identify project and global OpenCode configuration
locations for these examples and explain that configuration sources merge,
with agent-specific permission rules appended after global rules.

#### Scenario: Choose project or global configuration

- **WHEN** a reader wants a setting for one repository or for every project
- **THEN** the guide identifies project `opencode.jsonc` and global
  `~/.config/opencode/opencode.jsonc` as the respective locations

#### Scenario: Understand merged permission rules

- **WHEN** a reader combines global and agent-specific permission settings
- **THEN** the guide explains that agent-specific rules are appended and
  matching rules are evaluated in order, with the last matching rule winning

### Requirement: Explain model and reasoning variant overrides

The documentation SHALL show that users can override a plugin role's model in
OpenCode configuration without editing the repository role files, and SHALL
describe reasoning selection as model/provider-specific variant configuration.

#### Scenario: Set a role model and reasoning variant

- **WHEN** a reader wants a role-specific model or reasoning variant
- **THEN** the guide shows the OpenCode v2 `agents.<role>.model` setting and
  explains the `provider/model#variant` form as dependent on the chosen model

#### Scenario: Keep the inherited model

- **WHEN** a reader leaves the role's model unset
- **THEN** the guide states that the subagent inherits the parent session model

### Requirement: Make the guide discoverable from the README

The README SHALL link to the dedicated OpenCode configuration guide.

#### Scenario: Find configuration guidance

- **WHEN** a reader follows the README's setup or documentation links
- **THEN** they can open the OpenCode configuration guide from a relative
  repository link

### Requirement: Validate the configuration guide

The documentation SHALL use formatted Markdown and configuration examples
consistent with the linked OpenCode documentation.

#### Scenario: Verify guide examples and formatting

- **WHEN** the configuration guide is added or updated
- **THEN** its Markdown formatting and repository documentation checks pass,
  and its examples match the linked current OpenCode documentation
