# tamperbell

[![CI](https://github.com/san64777/tamperbell/actions/workflows/ci.yml/badge.svg)](https://github.com/san64777/tamperbell/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://github.com/san64777/tamperbell/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-20.11+-blue.svg)](https://nodejs.org/)

**a tamper alarm for your AI agent configs.** tamperbell pins your Claude Code configuration to a
signed baseline and rings the moment something rewrites it, shows you a risk-ranked diff of exactly
what changed, and lets you restore the baseline with one keypress or keep the tampered file as an
evidence receipt. It runs locally, makes no network calls, and never sees your tokens leave the
machine.

```bash
npx tamperbell watch
```

## The problem

Your `~/.claude.json` holds your MCP server endpoints and your OAuth tokens, in plaintext, and it is
writable by anything that runs as you. In June 2026 that stopped being theoretical: a published
attack showed a malicious `npm` postinstall script silently rewriting that file to point an MCP
server at an attacker-controlled proxy, quietly man-in-the-middling your agent's traffic. Nothing
told you. The config just changed, and the next time your agent talked to that server, it talked to
someone else.

A normal file-integrity monitor would either miss it (no MCP awareness) or drown you in noise (every
formatting change is an alarm). tamperbell is built for this one job: it understands what an MCP
config means, so it can tell you "your Atlassian server URL now points at localhost" instead of "a
file changed."

## What it does

- **Pins a signed baseline.** On first run it canonicalizes and signs your current config so later
  changes can be compared against a known-good state.
- **Rings on any unblessed change.** Every change to a pinned config surfaces. Nothing is ever
  silently judged "safe."
- **Ranks the change so triage is instant.** A swapped MCP endpoint, a new server pointing at
  localhost or a new host, a changed credential, or a widened permission flashes **RED**. A new
  server or a changed tool command is **AMBER**. Formatting is **INFO**.
- **Recovers in one keypress.** Restore the signed baseline (verified byte-for-byte) or quarantine
  the tampered file as a timestamped evidence receipt.

```console
$ npx tamperbell watch
  pinned 3 configs, baseline signed
  watching ~/.claude.json, ~/.claude/settings.json, .mcp.json

  ! TAMPER  ~/.claude.json changed (unblessed)
    RED  mcpServers.atlassian.url
       - https://mcp.atlassian.com
       + http://localhost:8731/proxy
    [r] restore signed baseline   [b] bless (accept)   [q] quarantine + restore
```

## What it does NOT do (read this)

tamperbell is **detection and recovery, not prevention.** The attacker who rewrites your config is
running as you, which means a determined, targeted attacker who already has code execution on your
machine could also stop tamperbell or forge its baseline. The signing key lives in your home
directory and is best-effort integrity, not a hardware root of trust.

So the honest promise is bounded, and worth stating plainly: tamperbell catches the opportunistic and
worm-style tampering that the published attacks actually use, tells you the instant it happens, and
gives you a clean way back, with a receipt. It does not claim to stop an attacker who is specifically
hunting tamperbell. If that bound matters to your threat model, it should: read it as the ceiling, not
the floor.

## Scope

v1 watches Claude Code: `~/.claude.json`, `~/.claude/settings.json`, project `.claude/` settings, and
project `.mcp.json`. The client layer is pluggable, so support for other MCP clients can be added
without changing the core.

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
