import { createHash } from "node:crypto";
import { readFileSync, renameSync, writeFileSync } from "node:fs";

export interface RestorableEntry {
  path: string;
  rawBytesB64: string;
  rawSha256: string;
}

// Atomic write-back of the ORIGINAL bytes (temp + rename), then re-read and hash-verify.
// Byte-exact is only possible because the baseline persisted the raw bytes, not just a hash.
export function restoreFile(entry: RestorableEntry): { verified: boolean } {
  const bytes = Buffer.from(entry.rawBytesB64, "base64");
  const tmp = `${entry.path}.tamperbell.tmp`;
  writeFileSync(tmp, bytes, { mode: 0o600 });
  renameSync(tmp, entry.path);
  const after = readFileSync(entry.path);
  return { verified: createHash("sha256").update(after).digest("hex") === entry.rawSha256 };
}
