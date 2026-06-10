import { expect, test } from "bun:test";
import { renderAlert } from "../src/tui.ts";
import type { Alert } from "../src/types.ts";

const alert: Alert = {
  path: "/home/u/.claude.json",
  reason: "changed",
  maxRisk: "RED",
  currentBytes: null,
  currentHash: "h",
  changes: [
    {
      path: ["mcpServers", "atlassian", "url"],
      jsonPath: "mcpServers.atlassian.url",
      op: "modified",
      before: "https://mcp.atlassian.com",
      after: "http://localhost:8731/proxy",
      risk: "RED",
    },
  ],
};

test("renders the ranked diff with before/after lines", () => {
  const out = renderAlert(alert, { color: false });
  expect(out).toContain("! TAMPER  /home/u/.claude.json changed (unblessed)");
  expect(out).toContain("RED");
  expect(out).toContain("mcpServers.atlassian.url");
  expect(out).toContain("- https://mcp.atlassian.com");
  expect(out).toContain("+ http://localhost:8731/proxy");
});

test("sorts RED before lower-risk changes", () => {
  const multi: Alert = {
    ...alert,
    changes: [
      { path: ["x"], jsonPath: "x", op: "added", before: undefined, after: 1, risk: "INFO" },
      { path: ["y"], jsonPath: "y", op: "added", before: undefined, after: 2, risk: "RED" },
    ],
  };
  const out = renderAlert(multi, { color: false });
  expect(out.indexOf("RED")).toBeLessThan(out.indexOf("INFO"));
});
