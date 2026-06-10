import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ClaudeCodeAdapter } from "../src/adapters/claude-code.ts";

test("resolves only existing claude code config files with correct kinds", () => {
  const home = mkdtempSync(join(tmpdir(), "tb-home-"));
  const cwd = mkdtempSync(join(tmpdir(), "tb-cwd-"));
  writeFileSync(join(home, ".claude.json"), "{}");
  mkdirSync(join(cwd, ".claude"), { recursive: true });
  writeFileSync(join(cwd, ".claude", "settings.json"), "{}");
  writeFileSync(join(cwd, ".mcp.json"), "{}");

  const set = ClaudeCodeAdapter.resolveWatchSet({ home, cwd });
  const byPath = new Map(set.map((c) => [c.path, c]));

  expect(byPath.get(join(home, ".claude.json"))?.kind).toBe("claude-json");
  expect(byPath.get(join(cwd, ".mcp.json"))?.kind).toBe("mcp-json");
  expect(byPath.get(join(cwd, ".claude", "settings.json"))?.kind).toBe("settings");
  // a non-existent file is never watched
  expect(byPath.has(join(home, ".claude", "settings.json"))).toBe(false);
  expect(set).toHaveLength(3);
});
