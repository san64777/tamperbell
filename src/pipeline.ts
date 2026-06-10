import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { type BaselineEntry, knownHostsFor } from "./baseline.ts";
import { canonical } from "./canonical.ts";
import { diff } from "./differ.ts";
import { parseConfig } from "./parse.ts";
import { maxRisk, rank } from "./ranker.ts";
import type { Alert, RankedChange } from "./types.ts";

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

// The detection seam. Returns a non-null Alert whenever the file's BYTES differ from the
// baseline, regardless of rank, so a ranking bug can never suppress a ring (detection is
// independent of ranking). The rank only triages the changes inside the alert.
export function handleChange(entry: BaselineEntry): Alert | null {
  if (!existsSync(entry.path)) {
    return {
      path: entry.path,
      reason: "deleted",
      changes: [],
      maxRisk: "RED",
      currentBytes: null,
      currentHash: "",
    };
  }

  const raw = readFileSync(entry.path);
  const currentHash = sha256(raw);
  if (currentHash === entry.rawSha256) return null; // byte-identical: nothing changed

  const { value, parseError } = parseConfig(raw.toString("utf8"));
  if (parseError) {
    return {
      path: entry.path,
      reason: "unparseable",
      changes: [],
      maxRisk: "RED",
      currentBytes: raw,
      currentHash,
    };
  }

  const ctx = { knownHosts: knownHostsFor(entry) };
  const changes = diff(entry.snapshot, canonical(value));
  if (changes.length === 0) {
    // bytes changed but semantics did not: a formatting-only edit
    return {
      path: entry.path,
      reason: "formatting",
      changes: [],
      maxRisk: "INFO",
      currentBytes: raw,
      currentHash,
    };
  }

  const ranked: RankedChange[] = changes.map((c) => ({ ...c, risk: rank(c, ctx) }));
  return {
    path: entry.path,
    reason: "changed",
    changes: ranked,
    maxRisk: maxRisk(changes, ctx),
    currentBytes: raw,
    currentHash,
  };
}
