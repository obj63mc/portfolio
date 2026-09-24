# How does the site deploy to Cloudflare, and how is the spend cap watched?

Type: grilling
Status: open
Part of: ../map.md

## Question

The provisioning ticket set up Workers Paid with a $20 budget alert and a local wrangler OAuth token, but no CI token, no Turnstile widget and no domain. The cursor sync ticket holds the ~$17/month worst case only while 20 Hz, 60 live cursors and one Durable Object hold. Decide the deploy shape: Cloudflare Pages or Workers with static assets for the prerendered SvelteKit build, and whether the Durable Object Worker ships in the same project or separately; the domain and DNS; the CI (GitHub Actions or Cloudflare's own builds) with a scoped API token and where secrets live; preview deploys per branch and whether they get their own Durable Object namespace; the Turnstile widget and its hostnames; Durable Object migrations; and how usage is watched beyond the budget alert (a scheduled usage check, a hard kill switch that drops the site to single-player, alert destinations). Output: the deploy and operations section of the spec, plus a HITL checklist of dashboard steps for whoever builds the site.

## Context

2026-09-24, from the analytics ticket (17): CI sets `PUBLIC_GA_ID` (a public env var via `$env/static/public`) for the production build only. Previews and dev ship with no analytics. If a CSP is adopted, it must allow `script-src https://www.googletagmanager.com`, `connect-src https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com` and `img-src https://*.google-analytics.com https://*.googletagmanager.com`. The `dataLayer` queue is bundled, so no inline-script allowance is needed for analytics.
