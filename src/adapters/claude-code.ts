import { existsSync } from "node:fs";
import { join } from "node:path";
import type { WatchedConfig } from "../types.ts";
import type { ClientAdapter } from "./types.ts";

// v1 watch set. MCP servers live in ~/.claude.json and project .mcp.json; the settings
// files hold general settings (hooks, permissions) that are also tamper-relevant.
export const ClaudeCodeAdapter: ClientAdapter = {
  name: "claude-code",
  resolveWatchSet({ home, cwd }): WatchedConfig[] {
    const candidates: WatchedConfig[] = [
      { path: join(home, ".claude.json"), kind: "claude-json", schemaHint: "mcp" },
      { path: join(home, ".claude", "settings.json"), kind: "settings", schemaHint: "settings" },
      { path: join(cwd, ".claude", "settings.json"), kind: "settings", schemaHint: "settings" },
      {
        path: join(cwd, ".claude", "settings.local.json"),
        kind: "settings",
        schemaHint: "settings",
      },
      { path: join(cwd, ".mcp.json"), kind: "mcp-json", schemaHint: "mcp" },
    ];
    return candidates.filter((c) => existsSync(c.path));
  },
};
