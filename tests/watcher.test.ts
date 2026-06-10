import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { watchPaths } from "../src/watcher.ts";

test("fires a debounced event when a watched file changes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tb-watch-"));
  const file = join(dir, "c.json");
  writeFileSync(file, "{}");

  let resolveFired: (p: string) => void = () => {};
  const fired = new Promise<string>((r) => {
    resolveFired = r;
  });
  const handle = watchPaths([file], { usePolling: true, debounceMs: 50 }, (p) => resolveFired(p));

  await handle.ready; // armed; changes from here on fire
  // re-trigger periodically: a single missed poll under CI load cannot flake the test,
  // because the watcher gets many chances to observe a change. The first event resolves.
  let n = 0;
  const trigger = setInterval(() => {
    writeFileSync(file, JSON.stringify({ n: ++n }));
  }, 700);
  writeFileSync(file, '{"n":0}');

  const got = await fired;
  clearInterval(trigger);
  await handle.close();

  expect(got).toBe(file);
}, 20000);
