import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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

test("loadBaseline flags an invalid signature (tampered baseline)", () => {
  const dir = mkdtempSync(join(tmpdir(), "tb-"));
  const cfgPath = join(dir, "claude.json");
  writeFileSync(cfgPath, '{"mcpServers":{}}');
  const state = join(dir, "state");
  pin([{ path: cfgPath, kind: "claude-json", schemaHint: "mcp" }], state);

  const bp = join(state, "baseline.json");
  const parsed = JSON.parse(readFileSync(bp, "utf8")) as { signature: string };
  parsed.signature = "deadbeef";
  writeFileSync(bp, JSON.stringify(parsed));

  expect(loadBaseline(state)?.valid).toBe(false);
});

test("loadBaseline reports a corrupt baseline without crashing", () => {
  const dir = mkdtempSync(join(tmpdir(), "tb-"));
  const state = join(dir, "state");
  mkdirSync(state, { recursive: true });
  writeFileSync(join(state, "baseline.json"), "{ not json ::: ]");

  const loaded = loadBaseline(state);
  expect(loaded).not.toBeNull();
  expect(loaded?.file).toBeNull();
  expect(loaded?.valid).toBe(false);
});
