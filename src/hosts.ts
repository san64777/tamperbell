export function urlHost(u: string): string | null {
  try {
    let h = new URL(u).hostname.toLowerCase();
    if (h.startsWith("[") && h.endsWith("]")) h = h.slice(1, -1);
    return h;
  } catch {
    return null;
  }
}

function ipv4IsLocal(h: string): boolean {
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

export function isLocalOrPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  if (h === "localhost" || h === "0.0.0.0" || h === "::" || h === "::1") return true;
  if (h.endsWith(".local") || h.endsWith(".localhost")) return true;
  if (h.includes(":")) {
    // IPv4-mapped IPv6: ::ffff:a.b.c.d (dotted) or ::ffff:7f00:1 (compressed hex)
    const mapped = /^::ffff:(.+)$/.exec(h);
    if (mapped) {
      const tail = mapped[1] ?? "";
      if (tail.includes(".")) return ipv4IsLocal(tail);
      const groups = tail.split(":");
      if (groups.length === 2) {
        const hi = Number.parseInt(groups[0] ?? "", 16);
        const lo = Number.parseInt(groups[1] ?? "", 16);
        if (!Number.isNaN(hi) && !Number.isNaN(lo)) {
          return ipv4IsLocal(`${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`);
        }
      }
    }
    // link-local fe80::/10, unique-local fc00::/7 (fc.. and fd..)
    return h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd");
  }
  return ipv4IsLocal(h);
}
