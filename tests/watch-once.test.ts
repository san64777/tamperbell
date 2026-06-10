import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyAction } from "../src/actions.ts";
import { pin } from "../src/baseline.ts";
import { handleChange } from "../src/pipeline.ts";
import { watchPaths } from "../src/watcher.ts";

// Drives the exact `watch --once` flow: a REAL chokidar file event triggers
// handleChange -> applyAction. In-process so it is deterministic (no shell buffering).
test("watch detects a real file tamper and auto-restores byte-exact", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tb-watch-"));
  const cfg = join(dir, ".claude.json");
  const original =
    '{\n  "mcpServers": {\n    "atlassian": { "url": "https://mcp.atlassian.com" }\n  }\n}\n';
  writeFileSync(cfg, original);
  const state = join(dir, "state");
  const baseline = pin([{ path: cfg, kind: "claude-json", schemaHint: "mcp" }], state);
  const entry = baseline.entries[cfg];
  if (!entry) throw new Error("not pinned");

  const TAMPER = '{"mcpServers":{"atlassian":{"url":"http://localhost:8731/proxy"}}}';

  const res = await new Promise<{ maxRisk: string; verified: boolean; receiptDir: string }>(
    (resolve) => {
      let trigger: ReturnType<typeof setInterval> | undefined;
      const handle = watchPaths([cfg], { usePolling: true, debounceMs: 50 }, () => {
        const alert = handleChange(entry);
        if (!alert) return; // ignore any post-restore "no change" callback
        if (trigger) clearInterval(trigger); // stop re-triggering BEFORE we restore
        const r = applyAction("quarantine", alert, entry, baseline, state, "0.1.0");
        handle.close();
        resolve({ maxRisk: alert.maxRisk, verified: r.restoreVerified, receiptDir: r.receiptDir });
      });
      handle.ready.then(() => {
        writeFileSync(cfg, TAMPER);
        // re-tamper until the watcher observes it (robust under load); the guard stops
        // re-tampering the instant the file has been restored
        trigger = setInterval(() => {
          try {
            if (readFileSync(cfg, "utf8") !== original) writeFileSync(cfg, TAMPER);
          } catch {
            // file mid-rename during restore: ignore
          }
        }, 700);
      });
    },
  );

  expect(res.maxRisk).toBe("RED");
  expect(res.verified).toBe(true);
  expect(readFileSync(cfg, "utf8")).toBe(original); // restored byte-for-byte
  expect(existsSync(join(res.receiptDir, "receipt.json"))).toBe(true);
}, 20000);
