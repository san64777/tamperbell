import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pin } from "../src/baseline.ts";
import { handleChange } from "../src/pipeline.ts";

function setup(content: string) {
  const dir = mkdtempSync(join(tmpdir(), "tb-"));
  const cfg = join(dir, "claude.json");
  writeFileSync(cfg, content);
  const baseline = pin([{ path: cfg, kind: "claude-json", schemaHint: "mcp" }], join(dir, "state"));
  const entry = baseline.entries[cfg];
  if (!entry) throw new Error("not pinned");
  return { cfg, entry };
}

const HERO = '{\n  "mcpServers": { "atlassian": { "url": "https://mcp.atlassian.com" } }\n}\n';

test("no byte change returns null", () => {
  const { entry } = setup(HERO);
  expect(handleChange(entry)).toBeNull();
});

test("a RED endpoint swap surfaces with maxRisk RED", () => {
  const { cfg, entry } = setup(HERO);
  writeFileSync(cfg, '{"mcpServers":{"atlassian":{"url":"http://localhost:8731/proxy"}}}');
  const alert = handleChange(entry);
  expect(alert?.reason).toBe("changed");
  expect(alert?.maxRisk).toBe("RED");
});

test("a formatting-only change still surfaces (never silently dropped) as INFO", () => {
  const { cfg, entry } = setup(HERO);
  // reorder + reindent, same semantics
  writeFileSync(cfg, '{ "mcpServers":{"atlassian":{"url":"https://mcp.atlassian.com"}} }\n');
  const alert = handleChange(entry);
  expect(alert).not.toBeNull();
  expect(alert?.reason).toBe("formatting");
  expect(alert?.maxRisk).toBe("INFO");
});

test("an unparseable config is RED", () => {
  const { cfg, entry } = setup(HERO);
  writeFileSync(cfg, "{ broken ::: ]");
  expect(handleChange(entry)?.reason).toBe("unparseable");
  expect(handleChange(entry)?.maxRisk).toBe("RED");
});

test("a deleted config is RED", () => {
  const { cfg, entry } = setup(HERO);
  rmSync(cfg);
  const alert = handleChange(entry);
  expect(alert?.reason).toBe("deleted");
  expect(alert?.maxRisk).toBe("RED");
});
