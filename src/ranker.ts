import { isLocalOrPrivateHost, urlHost } from "./hosts.ts";
import type { BaselineContext, ConfigChange, PathSegment, Risk } from "./types.ts";

const CRED = /(token|secret|password|api[_-]?key|credential|authorization|bearer)/i;
const TRANSPORT = new Set(["url", "command", "args", "env"]);
const ORDER: Record<Risk, number> = { INFO: 0, AMBER: 1, RED: 2 };

// Top-level Claude Code settings that auto-trust MCP servers. Enabling them widens
// trust without a prompt, so an enabling change must rank RED.
const TRUST_KEYS = new Set(["enableAllProjectMcpServers", "enabledMcpjsonServers"]);

function hasCredSegment(path: PathSegment[]): boolean {
  return path.some((s) => typeof s === "string" && CRED.test(s));
}

function isSecurityRelevant(path: PathSegment[]): boolean {
  const head = path[0];
  return (
    head === "mcpServers" ||
    head === "permissions" ||
    head === "hooks" ||
    head === "env" ||
    hasCredSegment(path)
  );
}

// Scan a newly added or removed subtree for high-risk content that a path-only rule
// would miss. The real attack writes a whole config block, not a single leaf edit, so
// the dangerous url / credential / command is buried in the change value, not its path.
function subtreeRisk(value: unknown, ctx: BaselineContext): Risk {
  if (Array.isArray(value)) {
    for (const item of value) if (subtreeRisk(item, ctx) === "RED") return "RED";
    return "INFO";
  }
  if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (CRED.test(k)) return "RED";
      if (k === "url" && typeof v === "string") {
        const host = urlHost(v);
        if (host === null || isLocalOrPrivateHost(host) || !ctx.knownHosts.has(host)) return "RED";
      }
      if ((k === "command" && typeof v === "string") || (k === "args" && Array.isArray(v))) {
        return "RED";
      }
      if (subtreeRisk(v, ctx) === "RED") return "RED";
    }
    return "INFO";
  }
  return "INFO";
}

export function rank(change: ConfigChange, ctx: BaselineContext): Risk {
  const p = change.path;

  if (hasCredSegment(p)) return "RED";

  if (p[0] === "mcpServers") {
    // a transport field of an existing server changed
    if (p.length >= 3 && typeof p[2] === "string" && TRANSPORT.has(p[2])) return "RED";
    // a server block (or nested object) added/removed wholesale: inspect its contents
    const subtree = change.op === "removed" ? change.before : change.after;
    if (subtreeRisk(subtree, ctx) === "RED") return "RED";
    return "AMBER";
  }

  if (typeof p[0] === "string" && TRUST_KEYS.has(p[0])) {
    if (change.op === "removed") return "AMBER";
    return change.after === true || change.op === "added" ? "RED" : "AMBER";
  }

  if (
    (p[0] === "permissions" || p.includes("allow") || p.includes("autoApprove")) &&
    change.op !== "removed"
  ) {
    return "RED";
  }

  // a hook is code that runs on agent events; adding or changing one is RED
  if (p[0] === "hooks") return change.op === "removed" ? "AMBER" : "RED";

  if (p.includes("env") && change.op === "added") return "AMBER";

  return isSecurityRelevant(p) ? "AMBER" : "INFO";
}

export function maxRisk(changes: ConfigChange[], ctx: BaselineContext): Risk {
  let max: Risk = "INFO";
  for (const c of changes) {
    const r = rank(c, ctx);
    if (ORDER[r] > ORDER[max]) max = r;
  }
  return max;
}
