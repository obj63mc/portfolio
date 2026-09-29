# 14: Usage script

**What to build:** `npm run usage` reads `CF_ANALYTICS_TOKEN` from the environment, queries the GraphQL Analytics API for month-to-date Durable Object requests, WebSocket messages and duration (`durableObjectsInvocationsAdaptiveGroups`, `durableObjectsPeriodicGroups`), and prints the usage and the projected bill for the month using the spec's rates and the 400k GB-s allowance.

**Blocked by:** 07 (the analytics token exists)

**Status:** ready-for-human

- [ ] The script prints month-to-date requests, messages, GB-s and a projected dollar figure
- [x] A missing token prints one line saying which token to create and exits non-zero
- [x] The projection arithmetic is a pure function with one test against the spec's worked example (30 visitors around the clock, about $11)

## Comments

2026-09-29, implemented. The live box waits on the token from 07's stage 7: run `npm run usage` once it exists.

- `scripts/usage.ts` is the script and exports `projectedBill(usage, now)`, which is pure. It scales month-to-date requests, inbound messages and GB-s to the whole UTC month. Inbound messages bill at 20:1, over 1M included requests at $0.15 a million and 400k included GB-s at $12.50 a million, plus the $5 base.
- `tests/usage.test.ts` checks the spec's worked example: 30 visitors for half of September, one room awake, 35,700 inbound messages per visitor-hour (the cursor sync prototype's measure). It projects to $10.64, which rounds to $11. A second test checks that a quiet month is the $5 base.
- A missing token prints one line naming the token and the wizard stage, and exits 1. A bad token prints the API's error and exits 1; this was checked against the live API with a bogus token.
- **Query (deviation from the ticket's fields).** Cloudflare documents that a hibernating socket's incoming messages are counted in `durableObjectsInvocationsAdaptiveGroups`, one invocation each, and not in the periodic inbound count. The rooms hibernate. Summing `requests` would therefore bill every message at 1:1, 20 times too much.
  - The script groups invocations by the `type` dimension. It counts types matching `hibernat` or `websocket` as messages and the rest as requests. The type names come from other projects' code (`hibernation`, `jsrpc`, `http`); Cloudflare's docs don't list them.
  - Messages are the larger of that count and the periodic `inboundWebsocketMsgCount`, never both, so nothing is billed twice.
  - Duration is the periodic `duration` field, which is already GB-s.
  - The docs don't list `duration`, `inboundWebsocketMsgCount`, `type` or `date_geq`/`date_leq` either; other projects' code uses them all.
  - The output has a "by type" line, so the first live run shows the real type names. If a message type doesn't match the pattern, the messages line will be near 0 and requests will be large; widen the pattern then. The pattern is marked `ponytail:` in the code.
- The account ID is a constant (ticket 12: not a secret). The Worker's own requests (only `/ws` upgrades, with 10M included) and storage (never used) are left out.
