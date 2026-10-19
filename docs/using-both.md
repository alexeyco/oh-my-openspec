# Using both?

Skill ids match upstream exactly (`openspec-propose`, `openspec-apply-change`, …), so a project with `openspec init --tools opencode` alongside the plugin loads the same workflows — the plugin just keeps them current on every release instead of on every manual `openspec update`. The five commands this plugin adds (`/omos.init`, `/omos.plan`, `/omos.apply`, `/omos.archive`, `/omos.retro`) and the upstream ones coexist: upstream skills are single-workflow steps, the flow commands are the multi-agent runs over the whole change.
