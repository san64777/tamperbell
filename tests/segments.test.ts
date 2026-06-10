import { expect, test } from "bun:test";
import { encodeSegments } from "../src/segments.ts";

test("plain identifiers join with dots", () => {
  expect(encodeSegments(["mcpServers", "atlassian", "url"])).toBe("mcpServers.atlassian.url");
});

test("array indices use brackets", () => {
  expect(encodeSegments(["mcpServers", "fs", "args", 2])).toBe("mcpServers.fs.args[2]");
});

test("keys with dots or dashes are bracket-quoted", () => {
  expect(encodeSegments(["mcpServers", "my-server", "url"])).toBe("mcpServers['my-server'].url");
});
