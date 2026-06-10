import { canonicalJson } from "./canonical.ts";
import { encodeSegments } from "./segments.ts";
import type { ConfigChange, PathSegment } from "./types.ts";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function deepEqual(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

function push(
  out: ConfigChange[],
  path: PathSegment[],
  op: ConfigChange["op"],
  before: unknown,
  after: unknown,
): void {
  out.push({ path, jsonPath: encodeSegments(path), op, before, after });
}

function diffArrays(path: PathSegment[], a: unknown[], b: unknown[], out: ConfigChange[]): void {
  const ak = a.map(canonicalJson);
  const bk = b.map(canonicalJson);
  const m = a.length;
  const n = b.length;
  const w = n + 1;
  // longest common subsequence table (flat, so a single insert/remove is one change, not N)
  const dp = new Int32Array((m + 1) * w);
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i * w + j] =
        ak[i] === bk[j]
          ? (dp[(i + 1) * w + (j + 1)] ?? 0) + 1
          : Math.max(dp[(i + 1) * w + j] ?? 0, dp[i * w + (j + 1)] ?? 0);
    }
  }
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (ak[i] === bk[j]) {
      i++;
      j++;
    } else if ((dp[(i + 1) * w + j] ?? 0) >= (dp[i * w + (j + 1)] ?? 0)) {
      push(out, [...path, i], "removed", a[i], undefined);
      i++;
    } else {
      push(out, [...path, j], "added", undefined, b[j]);
      j++;
    }
  }
  while (i < m) {
    push(out, [...path, i], "removed", a[i], undefined);
    i++;
  }
  while (j < n) {
    push(out, [...path, j], "added", undefined, b[j]);
    j++;
  }
}

function diffValue(path: PathSegment[], a: unknown, b: unknown, out: ConfigChange[]): void {
  if (deepEqual(a, b)) return;
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    for (const k of keys) {
      const next = [...path, k];
      if (!(k in a)) push(out, next, "added", undefined, b[k]);
      else if (!(k in b)) push(out, next, "removed", a[k], undefined);
      else diffValue(next, a[k], b[k], out);
    }
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    diffArrays(path, a, b, out);
    return;
  }
  push(out, path, "modified", a, b);
}

export function diff(baseline: unknown, current: unknown): ConfigChange[] {
  const out: ConfigChange[] = [];
  diffValue([], baseline, current, out);
  return out;
}
