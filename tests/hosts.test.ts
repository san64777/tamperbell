import { expect, test } from "bun:test";
import { isLocalOrPrivateHost, urlHost } from "../src/hosts.ts";

test("extracts and lowercases hostname, strips ipv6 brackets", () => {
  expect(urlHost("http://localhost:8731/proxy")).toBe("localhost");
  expect(urlHost("http://[::1]:9000/")).toBe("::1");
  expect(urlHost("not a url")).toBeNull();
});

test("flags loopback, rfc1918, link-local, cgnat, .local, ipv6 ula", () => {
  for (const h of [
    "localhost",
    "127.0.0.1",
    "10.1.2.3",
    "192.168.0.5",
    "172.16.9.9",
    "169.254.1.1",
    "100.64.0.1",
    "0.0.0.0",
    "printer.local",
    "::1",
    "fe80::1",
    "fd00::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:192.168.1.1",
  ]) {
    expect(isLocalOrPrivateHost(h)).toBe(true);
  }
});

test("classifies an ipv4-mapped ipv6 loopback from a real url as local", () => {
  const host = urlHost("http://[::ffff:127.0.0.1]:8731/");
  expect(host).not.toBeNull();
  expect(host && isLocalOrPrivateHost(host)).toBe(true);
});

test("does not flag public hosts", () => {
  for (const h of [
    "mcp.atlassian.com",
    "8.8.8.8",
    "172.32.0.1",
    "example.com",
    "2606:4700::1111",
  ]) {
    expect(isLocalOrPrivateHost(h)).toBe(false);
  }
});
