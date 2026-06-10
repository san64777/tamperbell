import type { PathSegment } from "./types.ts";

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function encodeSegments(path: PathSegment[]): string {
  let out = "";
  for (const seg of path) {
    if (typeof seg === "number") out += `[${seg}]`;
    else if (IDENT.test(seg)) out += out === "" ? seg : `.${seg}`;
    else out += `['${seg.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}']`;
  }
  return out;
}
