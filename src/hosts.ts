export function urlHost(u: string): string | null {
  try {
    let h = new URL(u).hostname.toLowerCase();
    if (h.startsWith("[") && h.endsWith("]")) h = h.slice(1, -1);
    return h;
  } catch {
    return null;
  }
}

export function isLocalOrPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  if (h === "localhost" || h === "0.0.0.0" || h === "::" || h === "::1") return true;
  if (h.endsWith(".local") || h.endsWith(".localhost")) return true;
  if (h.includes(":")) {
    // IPv6: link-local fe80::/10, unique-local fc00::/7 (fc.. and fd..)
    return h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd");
  }
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const c = Number(m[3]);
  const d = Number(m[4]);
  if ([a, b, c, d].some((n) => Number.isNaN(n) || n > 255)) return false;
  if (a === 127 || a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}
