# 07: Dashboard setup: zone, DNS, custom domain, www redirect, Workers Builds, WAF, analytics token

**What to build:** Joe walks the nine-step dashboard checklist from the deploy ticket: add the `barmadden.com` zone on Free and carry every Google Workspace record over; move the nameservers at GoDaddy (DNSSEC off first) and confirm mail still flows; clear old apex and `www` records; attach the Worker as a Custom Domain on the apex; a proxied `www` record and a 301 redirect rule to the apex; connect Workers Builds to `obj63mc/portfolio` with `main` as production, non-production builds on, build command `npm run ci`, deploy `npx wrangler deploy`, preview `npx wrangler preview`, build variable `PUBLIC_GA_ID`; WAF custom rules blocking `/ws*` without `Origin: https://barmadden.com` and `/ws*` from `cf.client.bot`, Block AI bots on, Bot Fight Mode off; an Account Analytics Read token stored locally as `CF_ANALYTICS_TOKEN`. Generate the walkthrough with `/wizard` so each step is checked off as it is done.

**Blocked by:** 06 (a deployable Worker)

**Status:** ready-for-human

- [ ] `https://barmadden.com` serves the site and `www` redirects 301 to the apex
- [ ] A test email to and from the Google Workspace address works after the nameserver move
- [ ] A PR branch gets a public Preview URL posted on the PR, returning `X-Robots-Tag: noindex`
- [ ] `curl` against `/ws` with a foreign `Origin` returns 403 at the edge
- [ ] `CF_ANALYTICS_TOKEN` is stored outside the repo

## Comments

2026-09-29, from ticket 06: the build command is `npm run ci`, which runs type-checks, the build and the tests. The Worker is `barmadden` with `workers_dev = false` and `preview_urls = true`. Until the Custom Domain is attached, production has no URL. Once the zone is active, consider declaring the domain in `wrangler.toml` (`routes = [{ pattern = "barmadden.com", custom_domain = true }]`) so config stays the source of truth over the dashboard.

2026-09-29, the walkthrough is `bash scripts/cloudflare-setup.sh`, generated with `/wizard`, in eight stages. Each stage opens the dashboard page, says what to click, and checks what it can with `dig` and `curl`, so a re-run shows what's done. Dashboard paths were checked against Cloudflare's docs the same day; the docs don't show every screen, so a label may differ slightly.

**State found before the wizard.** The nameservers are already Cloudflare's (`mike`, `sneh`), with no DS record, so DNSSEC is off. The Workspace MX set (the older `ASPMX` five plus a Google `mx-verification` record) and the `google._domainkey` DKIM record resolve through Cloudflare. There is no SPF and no DMARC at the apex; the wizard suggests an SPF record if Workspace is the only sender. Nothing answers at the apex or `www`, so there's no old site to clear. Wrangler isn't logged in on this machine and the Worker has never been deployed, so stage 2 does 06's deploy box (`wrangler login`, then `npm run ci && npx wrangler deploy`).

**Changes from the checklist.**

- **The custom domain stays a dashboard step, not `routes` in `wrangler.toml`.** The Workers Builds token has Workers Scripts edit and Zone Workers Routes edit but no DNS permission. No page says whether that is enough to attach a Custom Domain, and a refusal would fail every deploy from `main`. With no `custom_domain` entry in the config, deploys leave the dashboard's domain alone. That is from the wrangler source, not the docs.
- **The bot rule also matches user agents.** Joe wants bots to get the static page, never the connected one. Rule 2 is `starts_with(http.request.uri.path, "/ws") and (cf.client.bot or lower(http.user_agent) contains "bot/" or lower(http.user_agent) contains "spider" or lower(http.user_agent) contains "crawl" or lower(http.user_agent) contains "headless")`.
  - `cf.client.bot` covers verified bots, including Google, Bing and the Slack, X, Facebook and Discord preview fetchers.
  - The user-agent terms catch unverified crawlers that say what they are, and headless Chrome.
  - A blocked socket leaves the client single-player, the same as any refusal.
  - Bots never Join, so they would never have drawn a cursor. Unblocked, a bot would only count in "N here" and hold one of a room's 60 slots.
  - The WAF covers only the zone. Public workers.dev Previews still answer bots, behind the Worker's same-origin check and Cloudflare's noindex.
  - A client-side skip when `navigator.webdriver` is true would also catch honest automation. It would also take multiplayer out of the Playwright smoke, so it is left out.
  - Bots that pretend to be browsers can't be told apart on Free. Enterprise Bot Management (bot scores) can do it; Super Bot Fight Mode on Pro challenges bots but doesn't target them precisely.
- **Block AI bots** is being replaced by **AI bot policies** under Security → Settings. The old toggle is marked "Deprecating on September 15, 2026". The wizard sets Training to Block on all pages. Search (AI search engines) and Agent (assistants fetching a page on someone's behalf) are left to Joe: Allow keeps the site findable there, and Block matches the old toggle. Managed robots.txt is offered as optional.
- **Always Use HTTPS is on**, because the "Redirect from WWW to root" template matches only `https://www.*`.
- **Cost:** none on Free. The zone has 5 custom rules and uses 2. Single Redirects allow 10 and use 1. AI bot policies and managed robots.txt are included, and a WAF-blocked request never reaches the Worker. Cloudflare's metrics docs say WAF-blocked requests don't count toward a Worker's requests, but the pricing page doesn't say so in as many words.
- **The token** goes to `~/.config/barmadden/.env` (mode 600, outside the repo). `npm run usage` loads that file, and the environment wins.

**By hand after the wizard.** Open any PR to see its Preview URL and `X-Robots-Tag: noindex`. The phone and desktop check and the kill switch wait on ticket 13's client.
