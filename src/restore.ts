import { createHash } from "node:crypto";
import { chmodSync, readFileSync, renameSync, writeFileSync } from "node:fs";

export interface RestorableEntry {
  path: string;
  rawBytesB64: string;
  rawSha256: string;
  rawMode: number;
}

// Atomic write-back of the ORIGINAL bytes (temp + rename), then re-read and hash-verify.
// Byte-exact is only possible because the baseline persisted the raw bytes, not just a hash.
export function restoreFile(entry: RestorableEntry): { verified: boolean } {
  const bytes = Buffer.from(entry.rawBytesB64, "base64");
  const tmp = `${entry.path}.tamperbell.tmp`;
  writeFileSync(tmp, bytes, { mode: entry.rawMode });
  renameSync(tmp, entry.path);
  try {
    chmodSync(entry.path, entry.rawMode);
  } catch {
    // mode is best-effort (some filesystems ignore chmod); the byte content is the contract
  }
  const after = readFileSync(entry.path);
  return { verified: createHash("sha256").update(after).digest("hex") === entry.rawSha256 };
}
