import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { watchPaths } from "../src/watcher.ts";

test("fires a debounced event when a watched file changes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tb-watch-"));
  const file = join(dir, "c.json");
  writeFileSync(file, "{}");

  const events: string[] = [];
  const handle = watchPaths([file], { usePolling: true, debounceMs: 50 }, (p) => events.push(p));

  await handle.ready; // armed; changes from here on fire
  writeFileSync(file, '{"a":1}');
  await new Promise((r) => setTimeout(r, 900)); // awaitWriteFinish + debounce
  await handle.close();

  expect(events).toContain(file);
}, 5000);
