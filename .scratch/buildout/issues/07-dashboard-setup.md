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
