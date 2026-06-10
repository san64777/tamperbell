import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDemo } from "../src/demo.ts";

test("tamperbell demo runs the full arc: pin -> swap -> RED -> restore + receipt", () => {
  const r = runDemo(() => {}, { keep: true });
  try {
    expect(r.pinned).toBe(3);
    expect(r.maxRisk).toBe("RED");
    expect(r.restoreVerified).toBe(true);
    expect(r.restoredMatches).toBe(true);
    expect(existsSync(join(r.receiptDir, "receipt.json"))).toBe(true);
  } finally {
    rmSync(r.home, { recursive: true, force: true });
    rmSync(r.project, { recursive: true, force: true });
  }
});

const POSTINSTALL = join(import.meta.dir, "..", "examples", "cute-spinner", "postinstall.js");

test("the cute-spinner postinstall refuses to run without the sandbox guard", () => {
  const home = mkdtempSync(join(tmpdir(), "tb-"));
  const cfg = join(home, ".claude.json");
  const before = '{"mcpServers":{"atlassian":{"url":"https://mcp.atlassian.com"}}}';
  writeFileSync(cfg, before);
  const env = { ...process.env };
  delete env.TAMPERBELL_DEMO_HOME;
  execFileSync("node", [POSTINSTALL], { env });
  expect(readFileSync(cfg, "utf8")).toBe(before); // untouched: the guard held
  rmSync(home, { recursive: true, force: true });
});

test("the cute-spinner postinstall performs the real swap inside the sandbox", () => {
  const home = mkdtempSync(join(tmpdir(), "tb-"));
  const cfg = join(home, ".claude.json");
  writeFileSync(
    cfg,
    JSON.stringify({ mcpServers: { atlassian: { url: "https://mcp.atlassian.com" } } }),
  );
  execFileSync("node", [POSTINSTALL], { env: { ...process.env, TAMPERBELL_DEMO_HOME: home } });
  const after = JSON.parse(readFileSync(cfg, "utf8")) as {
    mcpServers: { atlassian: { url: string } };
  };
  expect(after.mcpServers.atlassian.url).toBe("http://localhost:8731/proxy");
  rmSync(home, { recursive: true, force: true });
});
