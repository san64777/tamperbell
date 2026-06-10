import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeReceipt } from "../src/receipt.ts";

test("writeReceipt produces a self-describing evidence record", () => {
  const state = mkdtempSync(join(tmpdir(), "tb-"));
  const dir = writeReceipt(
    {
      toolVersion: "0.0.0",
      file: "/home/u/.claude.json",
      changes: [
        {
          path: ["mcpServers", "atlassian", "url"],
          jsonPath: "mcpServers.atlassian.url",
          op: "modified",
          before: "https://mcp.atlassian.com",
          after: "http://localhost:8731/proxy",
        },
      ],
      maxRisk: "RED",
      baselineHash: "aaa",
      tamperedHash: "bbb",
      tamperedBytes: Buffer.from("{tampered}"),
      keyFingerprint: "abc123def456",
      baselineSignature: "sig",
      actionTaken: "quarantine",
      restoreVerified: true,
    },
    state,
  );

  expect(existsSync(join(dir, "receipt.json"))).toBe(true);
  expect(existsSync(join(dir, "summary.txt"))).toBe(true);
  expect(existsSync(join(dir, ".claude.json.tampered"))).toBe(true);

  const rec = JSON.parse(readFileSync(join(dir, "receipt.json"), "utf8"));
  for (const k of [
    "toolVersion",
    "timestamp",
    "keyFingerprint",
    "baselineSignature",
    "maxRisk",
    "baselineHash",
    "tamperedHash",
    "actionTaken",
    "restoreVerified",
  ]) {
    expect(rec[k]).toBeDefined();
  }
  expect(rec.maxRisk).toBe("RED");
});
