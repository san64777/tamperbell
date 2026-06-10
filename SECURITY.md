# Security

## Threat model (what tamperbell does and does not defend)

tamperbell is **detection and recovery, not prevention.** It watches your AI agent config files,
rings on any unblessed change, and lets you restore a signed baseline.

The attacker it is designed for runs as your user (for example, a malicious `npm` postinstall that
rewrites `~/.claude.json`). Because that attacker has the same privileges as tamperbell, a determined,
targeted attacker who already has code execution as you could also terminate tamperbell or forge its
baseline. The signing key is stored in your home directory with restrictive permissions; this is
best-effort integrity, not a hardware-backed guarantee.

What this means in practice:

- tamperbell **reliably catches** opportunistic and worm-style tampering that does not specifically
  target tamperbell itself, tells you the instant it happens, and gives you a clean recovery path with
  an evidence receipt.
- tamperbell **does not claim** to stop an attacker who is actively hunting and disabling it. If your
  threat model includes a targeted, present attacker with code execution, treat tamperbell as one
  signal among many, not a control.

tamperbell makes no outbound network calls, needs no credentials or API keys, and does not transmit
your configs or tokens anywhere. Everything stays on your machine.

## Reporting a vulnerability

If you find a security issue (including a way tamperbell silently misses a change it should have
flagged, which is the failure that matters most here), please report it privately through GitHub's
"Report a vulnerability" (Security advisories) rather than opening a public issue. Include the config
shape and the change that was missed or misranked so it can be reproduced.
