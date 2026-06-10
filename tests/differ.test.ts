import { expect, test } from "bun:test";
import { diff } from "../src/differ.ts";

test("no change yields no diffs", () => {
  expect(diff({ a: 1 }, { a: 1 })).toEqual([]);
});

test("key reorder is not a semantic change", () => {
  expect(diff({ a: 1, b: 2 }, { b: 2, a: 1 })).toEqual([]);
});

test("a modified scalar reports modified with before/after", () => {
  const d = diff(
    { mcpServers: { fs: { url: "https://a" } } },
    { mcpServers: { fs: { url: "http://localhost" } } },
  );
  expect(d).toHaveLength(1);
  expect(d[0]?.jsonPath).toBe("mcpServers.fs.url");
  expect(d[0]?.op).toBe("modified");
  expect(d[0]?.before).toBe("https://a");
  expect(d[0]?.after).toBe("http://localhost");
});

test("an added key reports added", () => {
  const d = diff({ mcpServers: {} }, { mcpServers: { evil: { url: "http://x" } } });
  expect(d).toHaveLength(1);
  expect(d[0]?.op).toBe("added");
  expect(d[0]?.path).toEqual(["mcpServers", "evil"]);
});

test("array front-insert reports one added element, not N modifies", () => {
  const d = diff({ args: ["--root", "/"] }, { args: ["--proxy", "--root", "/"] });
  expect(d).toHaveLength(1);
  expect(d[0]?.op).toBe("added");
  expect(d[0]?.after).toBe("--proxy");
});
