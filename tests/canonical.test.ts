import { expect, test } from "bun:test";
import { canonicalJson } from "../src/canonical.ts";

test("sorts object keys recursively", () => {
  expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
});

test("preserves array order", () => {
  expect(canonicalJson({ args: ["--b", "--a"] })).toBe('{"args":["--b","--a"]}');
});

test("two equal objects with different key order canonicalize identically", () => {
  expect(canonicalJson({ x: 1, y: 2 })).toBe(canonicalJson({ y: 2, x: 1 }));
});
