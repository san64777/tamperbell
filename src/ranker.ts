import { isLocalOrPrivateHost, urlHost } from "./hosts.ts";
import type { BaselineContext, ConfigChange, PathSegment, Risk } from "./types.ts";

const CRED = /(token|secret|password|api[_-]?key|credential|authorization|bearer)/i;
const TRANSPORT = new Set(["url", "command", "args", "env"]);
const ORDER: Record<Risk, number> = { INFO: 0, AMBER: 1, RED: 2 };

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

export function rank(change: ConfigChange, ctx: BaselineContext): Risk {
  const p = change.path;
  if (hasCredSegment(p)) return "RED";

  if (p[0] === "mcpServers" && p.length >= 3 && typeof p[2] === "string" && TRANSPORT.has(p[2])) {
    if (p[2] === "url" && typeof change.after === "string") {
      const host = urlHost(change.after);
      if (host === null) return "RED"; // unparseable endpoint
      if (isLocalOrPrivateHost(host) || !ctx.knownHosts.has(host)) return "RED";
    }
    return "RED";
  }

  if (
    (p[0] === "permissions" || p.includes("allow") || p.includes("autoApprove")) &&
    change.op !== "removed"
  ) {
    return "RED";
  }

  if (p[0] === "mcpServers" && p.length === 2 && change.op === "added") return "AMBER";
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
