# OpenCode configuration

oh-my-openspec registers its roles as OpenCode subagents. You can configure
their permissions and model in your OpenCode configuration without changing
the plugin's `agents/*.md` files.

## Where to put the configuration

Use a project configuration when a setting should apply to one repository:

```text
opencode.jsonc
```

Use the global configuration when it should apply to every project:

```text
~/.config/opencode/opencode.jsonc
```

OpenCode also supports project configuration in `.opencode/opencode.jsonc`.
Configuration sources merge. Global permissions are applied before
agent-specific rules, so a role's rules can refine the global ones. See the
[OpenCode config guide](https://opencode.ai/docs/config) for config locations
and precedence details.

## Set permissions for a role

Role prompts describe expected behavior, such as the researcher's instruction
to remain read-only. Prompts guide the model; OpenCode permission rules control
matching tool actions. To deny the `edit` action to `omos-researcher`, add
this to either configuration file above:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "agents": {
    "omos-researcher": {
      "permissions": [{ "action": "edit", "resource": "*", "effect": "deny" }],
    },
  },
}
```

This rule denies matching `edit` actions for every resource. It does not by
itself make the role completely read-only: `shell` is a separate action, and
other actions may have their own permissions. Denying shell can also prevent a
research role from running repository inspection commands. Choose rules for
the actions and resources you intend to control; do not treat a prompt
instruction as an access-control rule. The [OpenCode permissions
guide](https://opencode.ai/docs/permissions) lists actions and explains rule
matching.

Permission rules are evaluated in order, and the last matching rule wins. For
example, put a broad deny before a narrower exception:

```jsonc
"permissions": [
  { "action": "edit", "resource": "*", "effect": "deny" },
  { "action": "edit", "resource": "openspec/changes/**", "effect": "allow" },
],
```

When global and role-specific permissions are combined, the role-specific
rules are appended after global rules. Keep the order in mind when adding
exceptions.

## Control which roles a parent can launch

The parent's `subagent` permission controls which child agents it can start.
The child role has its own permissions for the actions it performs. These are
separate settings: allowing a parent to launch `omos-researcher` does not
grant that child `edit` access, and denying `edit` for the child does not
control whether the parent may launch it.

See the [OpenCode agents guide](https://opencode.ai/docs/agents) for details
on subagents and per-agent permission configuration.

## Choose a model and reasoning variant

To select a model for one role, set `model` under that role in `agents`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "agents": {
    "omos-researcher": {
      "model": "provider/model#variant",
    },
  },
}
```

Replace `provider/model#variant` with a model identifier and, when supported,
a variant available from your provider. OpenCode uses the `provider/model`
form, with `#variant` for a model-specific variant. Reasoning controls vary by
provider and model; there is no universal reasoning setting that works for
every model. Check the OpenCode [agents guide](https://opencode.ai/docs/agents)
and your provider's model documentation for supported variants.

If you leave `model` unset, the subagent inherits the parent session's model.
The plugin role files intentionally do not pin a model, so you can either keep
that inherited model or override it in your OpenCode configuration.
