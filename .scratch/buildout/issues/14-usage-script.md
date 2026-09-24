# 14: Usage script

**What to build:** `npm run usage` reads `CF_ANALYTICS_TOKEN` from the environment, queries the GraphQL Analytics API for month-to-date Durable Object requests, WebSocket messages and duration (`durableObjectsInvocationsAdaptiveGroups`, `durableObjectsPeriodicGroups`), and prints the usage and the projected bill for the month using the spec's rates and the 400k GB-s allowance.

**Blocked by:** 07 (the analytics token exists)

**Status:** ready-for-agent

- [ ] The script prints month-to-date requests, messages, GB-s and a projected dollar figure
- [ ] A missing token prints one line saying which token to create and exits non-zero
- [ ] The projection arithmetic is a pure function with one test against the spec's worked example (30 visitors around the clock, about $11)
