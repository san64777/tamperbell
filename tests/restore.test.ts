import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { restoreFile } from "../src/restore.ts";

test("restore writes back the exact original bytes and verifies", () => {
  const dir = mkdtempSync(join(tmpdir(), "tb-"));
  const file = join(dir, "config.json");
  const original =
    '{\n  "mcpServers": {\n    "atlassian": { "url": "https://mcp.atlassian.com" }\n  }\n}\n';
  writeFileSync(file, original);

  const entry = {
    path: file,
    rawBytesB64: Buffer.from(original).toString("base64"),
    rawSha256: createHash("sha256").update(original).digest("hex"),
  };

  // tamper: canonical, comment-free, whitespace-stripped rewrite
  writeFileSync(file, '{"mcpServers":{"atlassian":{"url":"http://localhost:8731/proxy"}}}');

  const result = restoreFile(entry);
  expect(result.verified).toBe(true);
  // byte-for-byte: original whitespace and structure survive, not just the values
  expect(readFileSync(file, "utf8")).toBe(original);
});
