import { expect, test } from "bun:test";
import { parseConfig } from "../src/parse.ts";

test("parses strict json", () => {
  expect(parseConfig('{"a":1}')).toEqual({ value: { a: 1 }, parseError: false });
});

test("parses jsonc with comments and trailing commas", () => {
  const r = parseConfig('{\n  // a comment\n  "a": 1,\n}');
  expect(r.parseError).toBe(false);
  expect(r.value).toEqual({ a: 1 });
});

test("flags irrecoverable input as a parse error", () => {
  expect(parseConfig("{ not valid ::: ]").parseError).toBe(true);
});
