// Render OpenSpec roles (agents/<id>.md) as Codex agent TOML files.
// The provenance comment `# managed-by: oh-my-openspec@<pkgVersion>` is
// the exact first line — a leading TOML comment, not part of the
// document — so the installer can tell our managed files from
// user-written ones (same version source as plugin.json). The document
// carries exactly three keys — name, description, developer_instructions
// — with the shared SUBAGENT_CONTRACT baked in at render time. No model,
// sandbox, or approval keys: Codex sessions inherit them.

import type { RoleAsset } from "../core/roles.ts";
import { escapeTomlBasic, renderTomlDoc } from "./toml.ts";

export function renderAgentToml(
  role: RoleAsset,
  contract: string,
  pkgVersion: string,
): string {
  const developerInstructions = `${role.body.trim()}\n\n${contract}`;
  const fields: [string, string][] = [
    ["description", role.description],
    ["developer_instructions", developerInstructions],
  ];
  const doc = `name = "${escapeTomlBasic(role.id)}"\n${renderTomlDoc(fields)}`;
  return `# managed-by: oh-my-openspec@${pkgVersion}\n${doc}`;
}
