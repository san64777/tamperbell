import { expect, test } from "bun:test";
import { version } from "../src/cli.ts";

test("cli exposes a version string", () => {
  expect(typeof version).toBe("string");
  expect(version.length).toBeGreaterThan(0);
});
