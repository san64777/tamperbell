import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyAction } from "../src/actions.ts";
import { pin } from "../src/baseline.ts";
import { handleChange } from "../src/pipeline.ts";

test("quarantine action restores byte-exact and writes a receipt", () => {
  const dir = mkdtempSync(join(tmpdir(), "tb-"));
  const cfg = join(dir, "claude.json");
  const original =
    '{\n  "mcpServers": { "atlassian": { "url": "https://mcp.atlassian.com" } }\n}\n';
  writeFileSync(cfg, original);
  const state = join(dir, "state");
  const baseline = pin([{ path: cfg, kind: "claude-json", schemaHint: "mcp" }], state);
  const entry = baseline.entries[cfg];
  if (!entry) throw new Error("not pinned");

  writeFileSync(cfg, '{"mcpServers":{"atlassian":{"url":"http://localhost:8731/proxy"}}}');
  const alert = handleChange(entry);
  if (!alert) throw new Error("no alert");

  const result = applyAction("quarantine", alert, entry, baseline, state, "0.0.0");
  expect(result.restoreVerified).toBe(true);
  expect(readFileSync(cfg, "utf8")).toBe(original);
  expect(existsSync(join(result.receiptDir, "receipt.json"))).toBe(true);
});
