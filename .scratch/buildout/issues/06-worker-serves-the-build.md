# 06: Worker serves the build: wrangler config, headers, CSP, noindex previews

**What to build:** One Cloudflare Worker, `barmadden`, serves the prerendered site as static assets under `wrangler dev` and `wrangler deploy`, with `[assets]` (`not_found_handling = "404-page"`) and `run_worker_first = ["/ws/*"]` so only the socket path runs Worker code. Until ticket 12 the `/ws` path returns a refusal so the client falls to single-player. One CSP in one place, preferably `kit.csp` in hash mode, allowing `'self'`, the GA hosts and `wss://barmadden.com`; `_headers` carries `frame-ancestors 'none'`, `nosniff`, the referrer policy and the permissions policy, and non-`main` builds append `X-Robots-Tag: noindex`. The build command runs type-checks, tests and the build so a failing build never deploys; wrangler is pinned in `devDependencies`; `workers_dev = false` in production; bindings are declared so Previews get their own isolated namespace (`previews` or `ctx.exports`); the Origin check reads a `previews` var override. Pages is not used.

**Blocked by:** 01 (something to serve)

**Status:** ready-for-agent

- [ ] `wrangler dev` serves every prerendered URL and a 404 page; `/ws` is refused cleanly
- [ ] Response headers on a page include the CSP, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and the `Permissions-Policy`; the policy exists in exactly one place
- [ ] A build with `WORKERS_CI_BRANCH` not `main` sets `X-Robots-Tag: noindex`; a `main` build does not
- [ ] One npm script runs type-check, tests and build, and is the Workers Builds build command
- [ ] `npx wrangler deploy` from a local OAuth session publishes to `barmadden.workers.dev` once (the custom domain comes in 07)
