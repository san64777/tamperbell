import type { Alert, Risk } from "./types.ts";

const SORT: Record<Risk, number> = { RED: 0, AMBER: 1, INFO: 2 };
const COLOR: Record<Risk, string> = { RED: "\x1b[31;1m", AMBER: "\x1b[33m", INFO: "\x1b[2m" };
const RESET = "\x1b[0m";

const HEADLINE: Record<Alert["reason"], string> = {
  changed: "changed (unblessed)",
  deleted: "DELETED",
  unparseable: "no longer parses (corrupt)",
  formatting: "reformatted (no semantic change)",
};

function fmt(v: unknown): string {
  return typeof v === "string" ? v : JSON.stringify(v);
}

export function renderAlert(alert: Alert, opts: { color?: boolean } = {}): string {
  const color = opts.color ?? true;
  const paint = (risk: Risk, s: string): string => (color ? `${COLOR[risk]}${s}${RESET}` : s);

  const lines = [`! TAMPER  ${alert.path} ${HEADLINE[alert.reason]}`];
  if (alert.reason === "deleted")
    lines.push(paint("RED", "  RED   file removed - restore from baseline"));
  if (alert.reason === "unparseable")
    lines.push(paint("RED", "  RED   config is corrupt - restore from baseline"));

  for (const c of [...alert.changes].sort((a, b) => SORT[a.risk] - SORT[b.risk])) {
    lines.push(paint(c.risk, `  ${c.risk.padEnd(5)} ${c.jsonPath}`));
    if (c.op !== "added") lines.push(`        - ${fmt(c.before)}`);
    if (c.op !== "removed") lines.push(`        + ${fmt(c.after)}`);
  }
  return lines.join("\n");
}
