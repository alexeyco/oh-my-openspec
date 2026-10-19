// Type declarations for codex/install-agents.mjs (plain Node script —
// tsconfig keeps allowJs off, so tests import it through this file).

export interface AgentInstallPlan {
  /** Source file basename, e.g. "omos-planner.toml". */
  readonly file: string;
  /**
   * Planned action for this file:
   * - "copy": target absent, or a differing unmanaged target under --force
   * - "skip": target is byte-identical
   * - "update": differing target whose first line carries the
   *   `# managed-by: oh-my-openspec@` marker — machine-owned, replaced
   *   silently and reported as an update
   * - "conflict": differing target without the marker (refused)
   */
  readonly action: "copy" | "skip" | "update" | "conflict";
  /** Human-readable explanation of the action. */
  readonly reason: string;
}

export interface AgentInstallResult {
  /** One entry per source `.toml` file, sorted by file name. */
  readonly plans: readonly AgentInstallPlan[];
  /** 1 when any file is planned as "conflict" (refused without --force), else 0. */
  readonly status: number;
}

export declare function planAgentInstalls(
  sourceDir: string,
  targetDir: string,
  options?: { force?: boolean },
): AgentInstallResult;

/**
 * True when the first line of `content` carries the
 * `# managed-by: oh-my-openspec@` marker (any version).
 */
export declare function hasManagedMarker(content: string): boolean;

/** True when a `process.version`-style string meets the v22.18 floor. */
export declare function meetsNodeFloor(version: string): boolean;
