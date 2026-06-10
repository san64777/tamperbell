import type { BaselineEntry, BaselineFile } from "./baseline.ts";
import { writeReceipt } from "./receipt.ts";
import { restoreFile } from "./restore.ts";
import type { Alert } from "./types.ts";

export type Action = "restore" | "quarantine";

// Restore the baseline bytes and write an evidence receipt. "restore" and "quarantine"
// share mechanics; the label distinguishes a plain revert from an evidence-keeping one.
export function applyAction(
  action: Action,
  alert: Alert,
  entry: BaselineEntry,
  baseline: BaselineFile,
  stateDir: string,
  toolVersion: string,
): { restoreVerified: boolean; receiptDir: string } {
  const { verified } = restoreFile(entry);
  const receiptDir = writeReceipt(
    {
      toolVersion,
      file: alert.path,
      changes: alert.changes,
      maxRisk: alert.maxRisk,
      baselineHash: entry.rawSha256,
      tamperedHash: alert.currentHash,
      tamperedBytes: alert.currentBytes ?? Buffer.alloc(0),
      keyFingerprint: baseline.keyFingerprint,
      baselineSignature: baseline.signature,
      actionTaken: action,
      restoreVerified: verified,
    },
    stateDir,
  );
  return { restoreVerified: verified, receiptDir };
}
