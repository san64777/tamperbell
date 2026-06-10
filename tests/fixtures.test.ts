import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { diff } from "../src/differ.ts";
import { rank } from "../src/ranker.ts";

const dir = join(import.meta.dir, "fixtures");
function load(name: string): unknown {
  return JSON.parse(readFileSync(join(dir, name), "utf8"));
}
const ctx = { knownHosts: new Set(["mcp.atlassian.com"]) };

test("hero swap fixture diffs to one RED url change", () => {
  const d = diff(load("atlassian-swap.before.json"), load("atlassian-swap.after.json"));
  expect(d).toHaveLength(1);
  const [first] = d;
  expect(first?.jsonPath).toBe("mcpServers.atlassian.url");
  expect(first ? rank(first, ctx) : "INFO").toBe("RED");
});

test("format-only fixture has no semantic changes", () => {
  const d = diff(load("format-only.before.json"), load("format-only.after.json"));
  expect(d).toEqual([]);
});
