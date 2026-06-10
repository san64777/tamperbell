import { expect, test } from "bun:test";
import { maxRisk, rank } from "../src/ranker.ts";
import type { ConfigChange } from "../src/types.ts";

const ctx = { knownHosts: new Set(["mcp.atlassian.com"]) };
function ch(
  path: (string | number)[],
  op: ConfigChange["op"],
  before: unknown,
  after: unknown,
): ConfigChange {
  return { path, jsonPath: path.join("."), op, before, after };
}

test("mcp url repointed to localhost is RED", () => {
  expect(
    rank(
      ch(
        ["mcpServers", "atlassian", "url"],
        "modified",
        "https://mcp.atlassian.com",
        "http://localhost:8731/proxy",
      ),
      ctx,
    ),
  ).toBe("RED");
});

test("mcp url repointed to a previously-unseen public host is RED", () => {
  expect(
    rank(
      ch(
        ["mcpServers", "atlassian", "url"],
        "modified",
        "https://mcp.atlassian.com",
        "https://evil.example.com",
      ),
      ctx,
    ),
  ).toBe("RED");
});

test("mcp command or args change is RED", () => {
  expect(rank(ch(["mcpServers", "fs", "command"], "modified", "node", "curl"), ctx)).toBe("RED");
  expect(rank(ch(["mcpServers", "fs", "args", 0], "added", undefined, "--proxy"), ctx)).toBe("RED");
});

test("a credential/token field change is RED", () => {
  expect(rank(ch(["mcpServers", "fs", "env", "API_TOKEN"], "modified", "a", "b"), ctx)).toBe("RED");
});

test("a brand-new mcp server is AMBER", () => {
  expect(
    rank(
      ch(["mcpServers", "newone"], "added", undefined, { url: "https://mcp.atlassian.com" }),
      ctx,
    ),
  ).toBe("AMBER");
});

test("a change outside the security subtree is INFO (benign self-write)", () => {
  expect(rank(ch(["projects", "/home/x", "lastUsed"], "modified", 1, 2), ctx)).toBe("INFO");
});

test("maxRisk returns the highest of a set", () => {
  const changes = [
    ch(["projects", "x"], "modified", 1, 2),
    ch(["mcpServers", "a", "url"], "modified", "https://mcp.atlassian.com", "http://localhost"),
  ];
  expect(maxRisk(changes, ctx)).toBe("RED");
});
