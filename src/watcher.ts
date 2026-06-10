import { watch as chokidarWatch } from "chokidar";

export interface WatchHandle {
  close: () => Promise<void>;
  ready: Promise<void>; // resolves once chokidar has armed (after its initial scan)
}

// chokidar over the resolved paths. awaitWriteFinish handles editor/tool write-then-rename
// so we neither double-fire nor read a half-written file; a per-path debounce collapses
// the burst into one event. usePolling is the documented WSL / network-mount fallback.
export function watchPaths(
  paths: string[],
  opts: { usePolling?: boolean; debounceMs?: number },
  onEvent: (path: string) => void,
): WatchHandle {
  const debounceMs = opts.debounceMs ?? 250;
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const fire = (p: string): void => {
    const prev = timers.get(p);
    if (prev) clearTimeout(prev);
    timers.set(
      p,
      setTimeout(() => {
        timers.delete(p);
        onEvent(p);
      }, debounceMs),
    );
  };

  const w = chokidarWatch(paths, {
    ignoreInitial: true,
    usePolling: opts.usePolling ?? false,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });
  w.on("change", fire);
  w.on("add", fire);
  w.on("unlink", fire);

  const ready = new Promise<void>((resolve) => {
    w.on("ready", () => resolve());
  });

  return { close: () => w.close(), ready };
}
