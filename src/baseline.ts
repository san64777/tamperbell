import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { canonical, canonicalJson } from "./canonical.ts";
import { urlHost } from "./hosts.ts";
import { parseConfig } from "./parse.ts";
import { ensureKey, keyFingerprint, sign } from "./sign.ts";
import type { WatchedConfig } from "./types.ts";

export interface BaselineEntry {
  path: string;
  kind: WatchedConfig["kind"];
  rawBytesB64: string; // ORIGINAL file bytes - the source of truth for byte-exact restore
  rawSha256: string; // hash of the original bytes - detection + post-restore verification
  rawMode: number; // original file permission bits - restored alongside the bytes
  snapshot: unknown; // canonical parsed value - for semantic diffing
  parseError: boolean;
  knownHosts: string[]; // hosts of every mcpServers url at pin time - for ranking
}

export interface BaselineFile {
  version: 1;
  createdAt: string; // ISO-8601 (UTC)
  keyFingerprint: string;
  entries: Record<string, BaselineEntry>;
  signature: string;
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function collectHosts(value: unknown): string[] {
  const hosts = new Set<string>();
  if (value !== null && typeof value === "object" && "mcpServers" in value) {
    const servers = (value as Record<string, unknown>).mcpServers;
    if (servers !== null && typeof servers === "object") {
      for (const v of Object.values(servers as Record<string, unknown>)) {
        if (v !== null && typeof v === "object") {
          const url = (v as Record<string, unknown>).url;
          if (typeof url === "string") {
            const h = urlHost(url);
            if (h !== null) hosts.add(h);
          }
        }
      }
    }
  }
  return [...hosts].sort();
}

function signable(f: Omit<BaselineFile, "signature">): string {
  return canonicalJson({
    version: f.version,
    createdAt: f.createdAt,
    keyFingerprint: f.keyFingerprint,
    entries: f.entries,
  });
}

export function pin(configs: WatchedConfig[], stateDir: string): BaselineFile {
  const key = ensureKey(stateDir);
  const entries: Record<string, BaselineEntry> = {};
  for (const cfg of configs) {
    let raw: Buffer;
    let mode = 0o600;
    try {
      raw = readFileSync(cfg.path);
      mode = statSync(cfg.path).mode & 0o777;
    } catch {
      // file vanished between resolveWatchSet and pin: record it, never crash the pin
      entries[cfg.path] = {
        path: cfg.path,
        kind: cfg.kind,
        rawBytesB64: "",
        rawSha256: sha256(Buffer.alloc(0)),
        rawMode: 0o600,
        snapshot: null,
        parseError: true,
        knownHosts: [],
      };
      continue;
    }
    // the raw bytes (incl. any BOM) are kept for restore; parseConfig strips the BOM
    const { value, parseError } = parseConfig(raw.toString("utf8"));
    entries[cfg.path] = {
      path: cfg.path,
      kind: cfg.kind,
      rawBytesB64: raw.toString("base64"),
      rawSha256: sha256(raw),
      rawMode: mode,
      snapshot: canonical(value),
      parseError,
      knownHosts: collectHosts(value),
    };
  }
  const base: Omit<BaselineFile, "signature"> = {
    version: 1,
    createdAt: new Date().toISOString(),
    keyFingerprint: keyFingerprint(key),
    entries,
  };
  const file: BaselineFile = { ...base, signature: sign(signable(base), key) };
  writeFileSync(join(stateDir, "baseline.json"), JSON.stringify(file, null, 2), { mode: 0o600 });
  return file;
}

// Returns null when no baseline exists; { file: null } when one exists but is corrupt
// (unreadable JSON); otherwise the parsed baseline plus whether its signature verifies.
// Never throws: a tamper of the baseline file itself is a detection event, not a crash.
export function loadBaseline(
  stateDir: string,
): { file: BaselineFile | null; valid: boolean } | null {
  const p = join(stateDir, "baseline.json");
  if (!existsSync(p)) return null;
  let file: BaselineFile;
  try {
    file = JSON.parse(readFileSync(p, "utf8")) as BaselineFile;
  } catch {
    return { file: null, valid: false };
  }
  const key = ensureKey(stateDir);
  return { file, valid: sign(signable(file), key) === file.signature };
}

export function knownHostsFor(entry: BaselineEntry): Set<string> {
  return new Set(entry.knownHosts);
}
