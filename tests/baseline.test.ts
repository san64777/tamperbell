import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadBaseline, pin } from "../src/baseline.ts";

test("pin stores original bytes, hash, hosts, and a verifiable signature", () => {
  const dir = mkdtempSync(join(tmpdir(), "tb-"));
  const cfgPath = join(dir, "claude.json");
  const content = '{\n  "mcpServers": { "atlassian": { "url": "https://mcp.atlassian.com" } }\n}\n';
  writeFileSync(cfgPath, content);
  const state = join(dir, "state");

  const file = pin([{ path: cfgPath, kind: "claude-json", schemaHint: "mcp" }], state);
  const entry = file.entries[cfgPath];
  if (!entry) throw new Error("entry missing");

  expect(Buffer.from(entry.rawBytesB64, "base64").toString("utf8")).toBe(content);
  expect(entry.knownHosts).toEqual(["mcp.atlassian.com"]);

  const loaded = loadBaseline(state);
  expect(loaded?.valid).toBe(true);
});

test("loadBaseline returns null when nothing is pinned", () => {
  const dir = mkdtempSync(join(tmpdir(), "tb-"));
  expect(loadBaseline(join(dir, "state"))).toBeNull();
});
