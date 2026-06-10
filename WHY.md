# tamperbell: your agent's config is an unguarded door

A config file is a trust boundary that nobody guards. Your `~/.claude.json` decides which servers
your AI agent talks to and carries the tokens it talks to them with. It is plaintext, and it is
writable by anything that runs as your user. We treat it like a dotfile. It behaves like a key to the
building.

In June 2026 the gap got a name. Security researchers showed that a malicious `npm` postinstall
script, the kind of thing that runs when you install a dependency, could silently rewrite that config
to point one of your MCP servers at a proxy it controlled, and then sit in the middle of every request
your agent made to that server. The disclosure noted the tokens were stored in plaintext and that the
fix was, for the moment, out of scope. No alarm fired. The file just had different contents than it
did a minute ago, and nothing was watching.

That is the whole problem in one sentence: nothing was watching the file that decides who your agent
trusts.

## Why a normal monitor does not fit

You could point a generic file-integrity monitor at it. Two things go wrong. The monitor does not
understand the file, so it cannot tell you the part that matters ("an MCP server endpoint was
repointed to localhost") instead of the part that does not ("a file changed, here is a 40-line text
diff"). And because it flags every byte, it flags the formatting change you made on purpose this
morning, so within a day you have muted it. An alarm you have muted is not an alarm.

tamperbell is built for this one file shape. It parses the config as what it is, an MCP configuration,
diffs it semantically, and ranks each change by what it could actually do to you. A repointed server,
a changed credential, a widened permission: those are the changes that move you to look. Whitespace is
not. The ranking is a small, auditable rule table, not a model, so you can read exactly why something
was flagged red.

## The honest part

Here is the line I will not cross, because the rest of what I build depends on it: tamperbell detects
and recovers. It does not prevent.

The attacker in this story runs as you. Anything that can rewrite your config can, in principle, also
kill the watcher or forge its baseline. The signing key sits in your home directory; it is best-effort
integrity, not a secure enclave. So I am not going to tell you tamperbell stops the attack. It catches
the opportunistic and worm-style tampering that the real attacks use, it tells you the instant the
file changes, and it hands you a clean baseline and a receipt. That is a genuinely useful thing, and it
is a smaller thing than "prevention," and I would rather you trust the smaller true claim than catch me
on the bigger false one.

This is the same discipline that runs through everything upstream of it: veriscrape refuses to call a
fetch `OK` unless it can prove the bytes are real, citeproof refuses to cite a source it cannot verify,
and tamperbell refuses to claim a guarantee it cannot keep. Verify the fetch, verify the claim, verify
the toolchain. A tool that tells you the truth about your data has to start by telling you the truth
about itself.

## The shape

```bash
npx tamperbell watch
```

It pins your Claude Code configs to a signed baseline, watches them, and rings on any unblessed change
with a risk-ranked diff. Restore the baseline in one keypress, or quarantine the tampered file as a
timestamped evidence receipt. Local, offline, no account, no telemetry. Apache-2.0.

It is early, and the threat model above is the contract: if you find a claim in here or in the code
that overstates what it does, that is the bug I most want reported.

---

*Written by Sanjay Chauhan, who builds reliability and verification primitives for data and agent
pipelines. tamperbell is open source under Apache-2.0: https://github.com/san64777/tamperbell . Reach
me at san64777@gmail.com.*
