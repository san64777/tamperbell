import { createHash, createHmac, randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// HMAC-SHA256 baseline signer. Best-effort integrity: the key lives in the user's
// state dir at mode 0600, which is honest about the same-userland threat model.
export function ensureKey(stateDir: string): Buffer {
  mkdirSync(stateDir, { recursive: true });
  const keyPath = join(stateDir, "key");
  if (!existsSync(keyPath)) {
    writeFileSync(keyPath, randomBytes(32), { mode: 0o600 });
    chmodSync(keyPath, 0o600);
  }
  return readFileSync(keyPath);
}

export function sign(data: string, key: Buffer): string {
  return createHmac("sha256", key).update(data).digest("hex");
}

export function keyFingerprint(key: Buffer): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 12);
}
