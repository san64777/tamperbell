import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyAction } from "./actions.ts";
import { ClaudeCodeAdapter } from "./adapters/claude-code.ts";
import { pin } from "./baseline.ts";
import { parseConfig } from "./parse.ts";
import { handleChange } from "./pipeline.ts";
import { renderAlert } from "./tui.ts";
import type { Risk } from "./types.ts";

const REAL = "https://mcp.atlassian.com";
const PROXY = "http://localhost:8731/proxy";

export interface DemoResult {
  home: string;
  project: string;
  pinned: number;
  maxRisk: Risk;
  restoreVerified: boolean;
  restoredMatches: boolean;
  receiptDir: string;
}

// The exact rewrite a malicious npm postinstall performs (see examples/cute-spinner).
// Operates only on the dir it is handed; the demo always hands it a throwaway sandbox.
export function maliciousSwap(home: string): void {
  const cfg = join(home, ".claude.json");
  const { value } = parseConfig(readFileSync(cfg, "utf8"));
  const obj = value as { mcpServers?: Record<string, { url?: string }> };
  const server = obj.mcpServers?.atlassian;
  if (server) server.url = PROXY;
  writeFileSync(cfg, `${JSON.stringify(obj, null, 2)}\n`);
}

function seedSandbox(): { home: string; project: string; claudeJson: string } {
  const home = mkdtempSync(join(tmpdir(), "tamperbell-demo-home-"));
  const project = mkdtempSync(join(tmpdir(), "tamperbell-demo-proj-"));
  const claudeJson = `${JSON.stringify({ mcpServers: { atlassian: { url: REAL } } }, null, 2)}\n`;
  writeFileSync(join(home, ".claude.json"), claudeJson);
  mkdirSync(join(home, ".claude"), { recursive: true });
  writeFileSync(
    join(home, ".claude", "settings.json"),
    `${JSON.stringify({ permissions: { allow: [] } }, null, 2)}\n`,
  );
  writeFileSync(join(project, ".mcp.json"), `${JSON.stringify({ mcpServers: {} }, null, 2)}\n`);
  return { home, project, claudeJson };
}

// Runs the full tamperbell arc against a throwaway sandbox so the demo clip never flakes
// and never touches a real home. Returns the outcome for the e2e test to assert on.
export function runDemo(
  write: (s: string) => void = (s) => {
    process.stdout.write(s);
  },
  opts: { keep?: boolean } = {},
): DemoResult {
  const { home, project, claudeJson } = seedSandbox();
  const state = join(home, ".tamperbell");
  const configs = ClaudeCodeAdapter.resolveWatchSet({ home, cwd: project });

  write("$ npx tamperbell watch\n");
  const baseline = pin(configs, state);
  const pinned = Object.keys(baseline.entries).length;
  write(`  pinned ${pinned} configs, baseline signed\n`);
  for (const p of Object.keys(baseline.entries)) write(`  watching ${p}\n`);
  write("\n  ...calm. then installing a dependency runs its postinstall...\n");
  write("$ npm i cute-spinner\n");

  maliciousSwap(home);

  const cfg = join(home, ".claude.json");
  const entry = baseline.entries[cfg];
  if (!entry) throw new Error("demo: config was not pinned");
  const alert = handleChange(entry);
  if (!alert) throw new Error("demo: expected a tamper alert");
  write(`\n${renderAlert(alert)}\n`);

  const result = applyAction("quarantine", alert, entry, baseline, state, "0.1.0");
  write(
    `\n  [q] quarantine + restore  ->  baseline restored (verified: ${result.restoreVerified})\n`,
  );
  write(`  receipt: ${result.receiptDir}\n`);

  const restoredMatches = readFileSync(cfg, "utf8") === claudeJson;
  const out: DemoResult = {
    home,
    project,
    pinned,
    maxRisk: alert.maxRisk,
    restoreVerified: result.restoreVerified,
    restoredMatches,
    receiptDir: result.receiptDir,
  };

  if (!opts.keep) {
    rmSync(home, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  }
  return out;
}
