# How does the site deploy to Cloudflare, and how is the spend cap watched?

Type: grilling
Status: resolved
Part of: ../map.md

## Question

The provisioning ticket set up Workers Paid with a $20 budget alert and a local wrangler OAuth token, but no CI token, no Turnstile widget and no domain. The cursor sync ticket holds the ~$17/month worst case only while 20 Hz, 60 live cursors and one Durable Object hold. Decide the deploy shape: Cloudflare Pages or Workers with static assets for the prerendered SvelteKit build, and whether the Durable Object Worker ships in the same project or separately; the domain and DNS; the CI (GitHub Actions or Cloudflare's own builds) with a scoped API token and where secrets live; preview deploys per branch and whether they get their own Durable Object namespace; the Turnstile widget and its hostnames; Durable Object migrations; and how usage is watched beyond the budget alert (a scheduled usage check, a hard kill switch that drops the site to single-player, alert destinations). Output: the deploy and operations section of the spec, plus a HITL checklist of dashboard steps for whoever builds the site.

## Context

2026-09-24, from the analytics ticket (17): CI sets `PUBLIC_GA_ID` (a public env var via `$env/static/public`) for the production build only. Previews and dev ship with no analytics. If a CSP is adopted, it must allow `script-src https://www.googletagmanager.com`, `connect-src https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com` and `img-src https://*.google-analytics.com https://*.googletagmanager.com`. The `dataLayer` queue is bundled, so no inline-script allowance is needed for analytics.

## Answer

Resolved 2026-09-24 by grilling with Joe. A research subagent checked the Cloudflare facts against primary sources, listed at the end. This is the deploy and operations section of the spec, followed by the dashboard checklist.

### Shape

- **One Worker, `barmadden`,** serves the prerendered SvelteKit build and runs the Durable Objects. This is the same shape as the cursor sync prototype. The config is:
  - `[assets]` with `not_found_handling = "404-page"`.
  - `run_worker_first = ["/ws/*"]`, so only the socket invokes the Worker. Cloudflare doesn't bill asset requests and doesn't limit them.
  - Pages is not used. It can't define a Durable Object, and Cloudflare now tells new projects to use Workers.
- **Rooms follow ADR 0005, which supersedes ADR 0004.**
  - Each room is its own Durable Object, named `scene:n` (for example `overworld:2`), and holds 60 visitors.
  - A **directory** object hears only about joins and leaves. It places each visitor fill first: the fullest room of their scene with space, or a new room if all are full.
  - It enforces a site-wide ceiling, `MAX_VISITORS` in the wrangler config, defaulting to 1,000. Visitors past the ceiling get single-player.
  - The spectator socket is retired.
  - Changing scene closes one socket and opens another. Nobody is ever moved between rooms.
- Both object classes use the declarative `exports` config (SQLite storage type) instead of a `migrations` array. Neither ever calls storage.
- Wrangler is pinned in `devDependencies`. Local work uses `wrangler dev`.

### Domain

- **barmadden.com** stays registered at GoDaddy. Its DNS moves to a Cloudflare zone on the free plan; nameservers must move, because CNAME setup needs the Business plan or above. Transferring the registration to Cloudflare Registrar is optional and can happen later.
- The Google Workspace email records are carried over unchanged.
- The Worker is a Custom Domain on the apex, and a redirect rule sends `www` to the apex with a 301. Production sets `workers_dev = false`, so only one hostname serves the site.

### CI and environments

- **Workers Builds** is connected to `obj63mc/portfolio`, with `main` as the production branch.
  - The build command runs type-checks, tests and the build, so a failing build never deploys.
  - The deploy command is `npx wrangler deploy` and the preview command is `npx wrangler preview`.
  - There is no CI API token to manage. The local wrangler OAuth token stays for manual runs.
- `PUBLIC_GA_ID` is a build variable. The build script passes it through only when `WORKERS_CI_BRANCH` is `main`, because Workers Builds variables can't differ by branch. Previews and dev ship without analytics, per the analytics ticket.
- **Previews:**
  - Every non-production branch gets a Worker Preview, with its URL posted on the PR. Previews are public.
  - Each Preview gets its own isolated Durable Object namespace, deleted along with the Preview.
  - Wrangler must be 4.135 or later. If bindings are declared at the top level, repeat them under `previews`, or use `ctx.exports`.
  - Non-`main` builds append `X-Robots-Tag: noindex` to `_headers`.
  - The Origin check accepts the Preview's own origin through a `previews` var override.

### Protecting the socket

- **Turnstile is dropped.** There is no form, and it cost about 1.8 s per join plus a new token on every reconnect.
- The guards from the cursor sync ticket stay:
  - the Origin check in the Worker;
  - the per-socket token bucket;
  - clamped positions;
  - the JSON size limit;
  - dropping unknown ops.
- New guards: the 60-per-room cap and the visitor ceiling. The ceiling also bounds a scripted flood to under about $0.40 an hour.
- **No per-IP limits**, because a shared office has one outbound IP.
- **WAF custom rules (free plan) on the zone:**
  - Block `/ws*` requests whose `Origin` isn't `https://barmadden.com`. This moves the Origin check to the edge, before the Worker is billed.
  - Block `/ws*` requests from `cf.client.bot`.
  - **Block AI bots** is on. Search crawlers and link-preview bots still reach the pages, which the accessible HTML layer needs.
- **Bot Fight Mode stays off.** On Free it covers the whole zone and can't be scoped or skipped. A challenge on a socket upgrade breaks the socket, and it risks challenging crawlers.
- WAF rules don't cover Previews on workers.dev, where the Worker's own Origin check covers them.

### Headers

- The **CSP** allows `'self'`, the GA hosts from the analytics ticket, and `wss://barmadden.com` in `connect-src`. Inline scripts are allowed wherever SvelteKit or GA need them.
  - The preferred way is SvelteKit's `kit.csp` in hash mode. It hashes the inline bootstrap into each prerendered page's meta-tag policy.
  - If that fights the build, fall back to one `_headers` CSP with `'unsafe-inline'` in `script-src`.
  - Keep the policy in one place, not in both a meta tag and a header, because two policies intersect.
- `_headers` also carries:
  - `frame-ancestors 'none'`, which a meta tag can't set;
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - a `Permissions-Policy` that turns off camera, microphone and geolocation.
- `_headers` doesn't apply to responses the Worker generates, so the `/ws` path sets its own.

### Deploys

- Deploy any time.
  - A new version restarts every room object and drops every socket, and each room's Foundry screen resets.
  - Clients reconnect with the existing 0.5 to 30 s jittered backoff.
- A close within the first second after `hello` is treated like any other drop. This covers the one-off 1006 closes seen in the prototype.
- There is no "reconnecting" UI, since the scene is already single-player while the socket is down.

### Cost and operations

- The bill is bounded by real traffic, the configurable ceiling and a manual kill switch, not by code alone.
- Rough figures:
  - about $0.0003 per visitor-hour in messages, plus about $4 per room object kept awake all month once the 400k GB-s allowance is spent;
  - about 30 people online around the clock: about $11 a month, including the $5 base;
  - 5,000 online: about $2 an hour, about $46 a day, or about $1,400 if they stayed online around the clock for the whole month;
  - at the 1,000 ceiling: about $0.40 an hour.
- **Joe manages budget alerts himself.** The spec provides scripts only:
  - `npm run usage` queries the GraphQL Analytics API (`durableObjectsInvocationsAdaptiveGroups`, `durableObjectsPeriodicGroups`) for month-to-date requests, WebSocket messages and duration, and prints the projected bill. It needs an **Account Analytics Read** token kept outside the repo, read from `CF_ANALYTICS_TOKEN`.
  - `npm run multiplayer:off` runs `wrangler secret put MULTIPLAYER` with the value `off`. That deploys a new version of the live code without rebuilding and restarts the objects. The Worker then refuses `/ws` upgrades, so everyone runs single-player.
  - `npm run multiplayer:on` runs `wrangler secret delete MULTIPLAYER`.
- Raising or lowering `MAX_VISITORS` is a config change and a push. For an emergency, use the kill switch.

### Dashboard checklist (HITL, for whoever builds the site)

1. **Add the zone.** In Cloudflare, add the site `barmadden.com` on the Free plan. Check the imported records. Keep every Google Workspace record exactly as it is at GoDaddy:
   - MX (`smtp.google.com`, or the older `ASPMX` set);
   - the SPF TXT (`include:_spf.google.com`);
   - the `google._domainkey` DKIM TXT;
   - `_dmarc` if present;
   - any `google-site-verification` TXT.
2. **Move the nameservers.** At GoDaddy, turn DNSSEC off if it's on, then set the two Cloudflare nameservers. Wait for the zone to show Active, then send and receive a test email.
3. **Clear the old site.** Delete any apex or `www` A, AAAA or CNAME records that point at an old host.
4. **Deploy and attach the domain.** Deploy the Worker once. Under Settings → Domains & Routes, add the Custom Domain `barmadden.com`.
5. **Redirect `www`.** Add a proxied `www` record (for example `AAAA 100::`). Add a redirect rule: `www.barmadden.com/*` to `https://barmadden.com/${1}`, 301, keeping the query string.
6. **Connect Workers Builds.** On the Worker, connect Workers Builds:
   - repo `obj63mc/portfolio`, production branch `main`;
   - non-production branch builds on;
   - deploy command `npx wrangler deploy`, preview command `npx wrangler preview`;
   - build variable `PUBLIC_GA_ID`.
7. **Set up the WAF.** Under Security → WAF → Custom rules:
   - Rule 1, Block: `starts_with(http.request.uri.path, "/ws") and not any(http.request.headers["origin"][*] eq "https://barmadden.com")`.
   - Rule 2, Block: `starts_with(http.request.uri.path, "/ws") and cf.client.bot`.
   - Under Security → Bots, turn **Block AI bots** on and leave **Bot Fight Mode** off.
8. **Create the analytics token.** Under My Profile → API Tokens, create a token with Account → Account Analytics → Read on this account only. Store it locally for `npm run usage`.
9. **Verify.**
   - A phone and a desktop see each other at https://barmadden.com.
   - `curl` with a foreign `Origin` against `/ws` gets a 403.
   - `multiplayer:off` drops both to single-player, and `multiplayer:on` restores them.
   - A PR gets a Preview URL that returns `X-Robots-Tag: noindex` and loads no GA.
   - `www` redirects to the apex.

### Sources (research subagent, 2026-09-24)

- Workers static assets, billing and `_headers`: developers.cloudflare.com/workers/static-assets/ (binding, billing-and-limitations, headers).
- Pages can't define a Durable Object: developers.cloudflare.com/pages/functions/bindings/ and the migrate-from-Pages guide.
- Worker Previews (2026-09-22): developers.cloudflare.com/changelog/post/2026-09-22-worker-previews/, /workers/previews/ and /workers/previews/resources/. Version URLs aren't generated for Durable Object Workers.
- Workers Builds limits and configuration: developers.cloudflare.com/workers/ci-cd/builds/.
- Durable Object migrations and `exports`: developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/.
- Durable Object pricing: developers.cloudflare.com/durable-objects/platform/pricing/.
- Durable Object GraphQL analytics: developers.cloudflare.com/durable-objects/observability/graphql-analytics/.
- No spending limit for Workers; budget alerts only notify: the Cloudflare changelog, 2026-06-05 and 2026-06-15.
- Deploys disconnect all WebSockets: developers.cloudflare.com/durable-objects/best-practices/websockets/.
- Custom Domains: developers.cloudflare.com/workers/configuration/routing/custom-domains/.
- Partial setup is Business and above: developers.cloudflare.com/dns/zone-setups/partial-setup/.

### Glossary and ADRs

- **Room** in `CONTEXT.md` is redefined: up to 60 visitors in a scene, with a new room opening when the scene's rooms are full. "Instance" and "shard" are listed under Avoid.
- ADR 0005, one Durable Object per room with 60 visitors per room, supersedes ADR 0004.

## Comments

2026-09-24, rounds 1 to 4: Joe asked what Turnstile was for with no form to protect, and dropped it. He wants a crowd to use the site, not to be capped at 60, so rooms of 60 overflow into new rooms per scene. He ruled out per-IP limits because of shared offices. He wants scripts, not an automated kill switch, and manages the budgets himself. Joe answered every round; no decision here was assumed.

2026-09-29, amended by buildout ticket 07.
- Step 7's rule 2 also matches user agents containing `bot/`, `spider`, `crawl` or `headless`, so crawlers that run scripts get the page single-player.
- "Block AI bots" is now AI bot policies under Security → Settings: Training is blocked on all pages, and Search and Agent are Joe's call.
- Step 5 adds Always Use HTTPS, because the www template matches only `https://www.*`.
- The walkthrough is `bash scripts/cloudflare-setup.sh`.
