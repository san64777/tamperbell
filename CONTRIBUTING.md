# Contributing

tamperbell is a small, focused tool, and fixes and additions are welcome.

- Open an issue first for anything non-trivial, so we can agree on the shape before you build it.
- `bun install`, then keep `bun test` and `bun run typecheck` green. Use `bunx biome check .` for
  format and lint.
- Keep the core pure and the I/O at the edges. The semantic differ and the risk ranker are pure
  functions over data (config in, ranked changes out); the watcher, signer, restore, and TUI are the
  I/O layer around them. New detection logic belongs in the ranker rule table, with a fixture.
- The most useful contributions are: new risk rules (with a golden before/after fixture proving the
  rank), a new `ClientAdapter` for another MCP client (Cursor, Windsurf, VS Code), and edge-case
  hardening for the watcher (atomic writes, network mounts) and byte-exact restore.
- Honesty rule: tamperbell detects and recovers, it does not prevent. Do not add copy or claims that
  imply prevention, and do not let a ranking change silently suppress a detection.

By contributing, you agree your work is licensed under the Apache License, Version 2.0.
