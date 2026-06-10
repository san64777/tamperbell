import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { ConfigChange, Risk } from "./types.ts";

export interface ReceiptInput {
  toolVersion: string;
  file: string;
  changes: ConfigChange[];
  maxRisk: Risk;
  baselineHash: string;
  tamperedHash: string;
  tamperedBytes: Buffer;
  keyFingerprint: string;
  baselineSignature: string;
  actionTaken: "restore" | "quarantine" | "bless" | "log";
  restoreVerified: boolean | null;
}

function summarize(input: ReceiptInput, timestamp: string): string {
  const lines = [
    `tamperbell receipt ${input.toolVersion}`,
    `timestamp: ${timestamp}`,
    `file:      ${input.file}`,
    `maxRisk:   ${input.maxRisk}`,
    `action:    ${input.actionTaken}`,
    `restoreVerified: ${input.restoreVerified}`,
    `key:       ${input.keyFingerprint}`,
    "",
    "changes:",
  ];
  for (const c of input.changes) {
    lines.push(
      `  [${c.op}] ${c.jsonPath}: ${JSON.stringify(c.before)} -> ${JSON.stringify(c.after)}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

// Writes a self-describing evidence artifact: the JSON record, the raw tampered file,
// and a human-readable summary, under quarantine/<timestamp>/.
export function writeReceipt(input: ReceiptInput, stateDir: string): string {
  const timestamp = new Date().toISOString();
  const dir = join(stateDir, "quarantine", timestamp.replace(/[:.]/g, "-"));
  mkdirSync(dir, { recursive: true });

  const record = {
    toolVersion: input.toolVersion,
    timestamp,
    file: input.file,
    keyFingerprint: input.keyFingerprint,
    baselineSignature: input.baselineSignature,
    maxRisk: input.maxRisk,
    baselineHash: input.baselineHash,
    tamperedHash: input.tamperedHash,
    actionTaken: input.actionTaken,
    restoreVerified: input.restoreVerified,
    changes: input.changes,
  };

  writeFileSync(join(dir, "receipt.json"), `${JSON.stringify(record, null, 2)}\n`);
  writeFileSync(join(dir, `${basename(input.file)}.tampered`), input.tamperedBytes);
  writeFileSync(join(dir, "summary.txt"), summarize(input, timestamp));
  return dir;
}
