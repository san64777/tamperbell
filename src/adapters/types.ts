import type { WatchedConfig } from "../types.ts";

export interface ClientAdapter {
  name: string;
  resolveWatchSet(opts: { home: string; cwd: string }): WatchedConfig[];
}
