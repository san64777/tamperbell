import { expect, test } from "bun:test";
import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureKey, keyFingerprint, sign } from "../src/sign.ts";

test("ensureKey creates a 0600 key and is idempotent", () => {
  const dir = mkdtempSync(join(tmpdir(), "tb-"));
  const k1 = ensureKey(dir);
  const k2 = ensureKey(dir);
  expect(k1.equals(k2)).toBe(true);
  expect(statSync(join(dir, "key")).mode & 0o777).toBe(0o600);
});

test("sign is stable per key and fingerprint is short hex", () => {
  const dir = mkdtempSync(join(tmpdir(), "tb-"));
  const key = ensureKey(dir);
  expect(sign("hello", key)).toBe(sign("hello", key));
  expect(sign("hello", key)).not.toBe(sign("world", key));
  expect(keyFingerprint(key)).toMatch(/^[0-9a-f]{12}$/);
});
