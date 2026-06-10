export type Risk = "RED" | "AMBER" | "INFO";
export type ChangeOp = "added" | "removed" | "modified";
export type PathSegment = string | number;

export interface ConfigChange {
  path: PathSegment[]; // structured, e.g. ["mcpServers", "atlassian", "url"]
  jsonPath: string; // display form, e.g. mcpServers['atlassian'].url
  op: ChangeOp;
  before: unknown;
  after: unknown;
}

export interface BaselineContext {
  knownHosts: ReadonlySet<string>;
}

export interface WatchedConfig {
  path: string;
  kind: "claude-json" | "settings" | "mcp-json";
  schemaHint: "mcp" | "settings";
}
