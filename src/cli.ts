#!/usr/bin/env node
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { applyAction } from "./actions.ts";
import { ClaudeCodeAdapter } from "./adapters/claude-code.ts";
import { type BaselineFile, loadBaseline, pin } from "./baseline.ts";
import { runDemo } from "./demo.ts";
import { handleChange } from "./pipeline.ts";
import { restoreFile } from "./restore.ts";
import { renderAlert } from "./tui.ts";
import { watchPaths } from "./watcher.ts";

export const version = "0.1.0";

const out = (s: string): void => {
  process.stdout.write(s);
};

function stateDir(): string {
  return join(homedir(), ".tamperbell");
}

function resolveSet() {
  return ClaudeCodeAdapter.resolveWatchSet({ home: homedir(), cwd: process.cwd() });
}

function ensureBaseline(): BaselineFile {
  const sd = stateDir();
  const loaded = loadBaseline(sd);
  if (loaded?.file) {
    if (!loaded.valid) {
      out(
        "warning: baseline signature is invalid (it may have been tampered); watching against it anyway\n",
      );
    }
    return loaded.file;
  }
  if (loaded && !loaded.file) {
    out("warning: existing baseline is corrupt; re-pinning a fresh baseline\n");
  }
  const file = pin(resolveSet(), sd);
  out(`pinned ${Object.keys(file.entries).length} configs, baseline signed\n`);
  return file;
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function cmdWatch(once: boolean): Promise<number> {
  let baseline = ensureBaseline();
  const sd = stateDir();
  const paths = Object.keys(baseline.entries);

  let resolveDone: () => void = () => {};
  const done = new Promise<void>((r) => {
    resolveDone = r;
  });

  async function processPath(p: string): Promise<void> {
    const entry = baseline.entries[p];
    if (!entry) return;
    const alert = handleChange(entry);
    if (!alert) return;
    if (alert.maxRisk === "INFO" && process.env.TAMPERBELL_VERBOSE !== "1") {
      out(`  INFO  ${p} reformatted (no semantic change)\n`);
      return;
    }
    out(`\n${renderAlert(alert)}\n`);
    if (once) {
      const result = applyAction("quarantine", alert, entry, baseline, sd, version);
      out(
        `\n  auto-quarantine + restore  ->  baseline restored (verified: ${result.restoreVerified})\n`,
      );
      out(`  receipt: ${result.receiptDir}\n`);
      resolveDone();
      return;
    }
    const answer = (await ask("\n[r]estore  [b]less  [q]uarantine  [i]gnore: "))[0] ?? "i";
    if (answer === "r" || answer === "q") {
      const action = answer === "r" ? "restore" : "quarantine";
      const result = applyAction(action, alert, entry, baseline, sd, version);
      out(`${action} done - baseline restored (verified: ${result.restoreVerified})\n`);
      out(`receipt: ${result.receiptDir}\n`);
    } else if (answer === "b") {
      baseline = pin(resolveSet(), sd);
      out("blessed - current state is the new signed baseline\n");
    } else {
      out("ignored - file left unblessed\n");
    }
  }

  let busy = false;
  const pending = new Set<string>();
  const handle = watchPaths(paths, { usePolling: process.env.TAMPERBELL_POLL === "1" }, (p) => {
    if (busy) {
      pending.add(p); // a change arriving mid-handling is queued, never dropped
      return;
    }
    busy = true;
    void (async () => {
      try {
        await processPath(p);
        while (pending.size > 0) {
          const queued = [...pending];
          pending.clear();
          for (const next of queued) await processPath(next);
        }
      } finally {
        busy = false;
      }
    })();
  });

  await handle.ready;
  out(
    `watching ${paths.length} configs ${once ? "(--once: auto-restore the first tamper, then exit)" : "(Ctrl-C to stop)"}\n`,
  );
  await done;
  return 0;
}

function cmdStatus(): number {
  const loaded = loadBaseline(stateDir());
  if (!loaded) {
    out("no baseline pinned yet - run: tamperbell watch\n");
    return 0;
  }
  if (!loaded.file) {
    out("baseline CORRUPT (unreadable) - re-pin with: tamperbell bless\n");
    return 1;
  }
  const { file, valid } = loaded;
  out(
    `baseline ${valid ? "OK" : "INVALID SIGNATURE (the baseline may have been tampered)"} - key ${file.keyFingerprint}, pinned ${file.createdAt}\n`,
  );
  for (const p of Object.keys(file.entries)) out(`  ${p}\n`);
  return valid ? 0 : 1;
}

function cmdBless(): number {
  const file = pin(resolveSet(), stateDir());
  out(`blessed ${Object.keys(file.entries).length} configs, baseline re-signed\n`);
  return 0;
}

function cmdRestore(target?: string): number {
  const loaded = loadBaseline(stateDir());
  if (!loaded?.file) {
    out("no valid baseline to restore from\n");
    return 1;
  }
  let n = 0;
  for (const entry of Object.values(loaded.file.entries)) {
    if (target && entry.path !== target) continue;
    if (!entry.rawBytesB64) continue;
    const { verified } = restoreFile(entry);
    out(`restored ${entry.path} (verified: ${verified})\n`);
    n++;
  }
  if (n === 0) out("nothing restored\n");
  return 0;
}

async function main(argv: string[]): Promise<number> {
  switch (argv[2] ?? "help") {
    case "watch":
      return cmdWatch(argv.includes("--once"));
    case "status":
      return cmdStatus();
    case "bless":
      return cmdBless();
    case "restore":
      return cmdRestore(argv[3]);
    case "demo":
      runDemo(undefined, { keep: argv.includes("--keep") });
      return 0;
    default:
      out(`tamperbell ${version}\n  watch | status | bless | restore [file] | demo\n`);
      return 0;
  }
}

if (import.meta.main) {
  main(process.argv).then((code) => process.exit(code));
}
