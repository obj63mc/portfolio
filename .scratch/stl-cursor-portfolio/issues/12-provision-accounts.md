# Provision the backend accounts

Type: task
Status: resolved
Part of: ../map.md
Blocked by: 02

## Question

Once the backend is chosen, create the accounts (Cloudflare Workers plus Pages; no animation tool account, since the animation approach ticket chose canvas-native props), set the spend cap or in-code limits, generate the credentials the prototypes need, and record where the credentials live (not in the repo). Output: a short note of what was provisioned, the spend cap in place, and the credential locations.

## Answer

Resolved 2026-09-24. Joe did the dashboard steps; the agent checked them with wrangler and the Cloudflare API.

**Provisioned**

- One Cloudflare account on **Workers Paid ($5/month)**. Joe confirmed the plan in the dashboard; wrangler's token can't read billing.
- workers.dev subdomain **`barmadden.workers.dev`**, confirmed through the API. Prototypes deploy here, and no custom domain is needed yet.
- Account ID `3edd4b87aa844db287c56527fb8dba69`. This is not a secret. Put it in a prototype's `wrangler.toml` as `account_id`, or leave it out and wrangler picks it up from the login.
- No Pages project and no Durable Object namespace yet. Both are created on the first `wrangler deploy` of the sync prototype.

**Spend cap**

- A **budget alert at $20** in Billing, set up by Joe. Cloudflare only sends a notification; it never pauses usage.
- The hard limit is enforced in code by the sync prototype:
  - Clients send at most 15 Hz, and the Durable Object drops faster senders.
  - At most 60 live cursors across all rooms; visitors beyond that get the spectator socket.
  - The object never calls storage on the message path.
  - No `setInterval`, so the object can hibernate.

**Credentials**

- A wrangler OAuth token, from `npx wrangler@4 login` with wrangler 4.138.0, saved at `~/Library/Preferences/.wrangler/config/default.toml` (mode 600). It is outside the repo and nothing was committed.
- It has write access to Workers scripts, Workers KV, Pages, D1 and more, but no billing access.
- Run `npx wrangler@4 whoami` to check it, and `npx wrangler@4 login` if it has expired.

**Deliberately not provisioned**

- A CI API token. That belongs to the deploy pipeline fog.
- A Turnstile widget. Cloudflare's always-pass test site key `1x00000000000000000000AA` covers the prototype.
- A Rive plan, since the animation approach ticket chose canvas-native props.

## Comments

2026-09-23, from the animation approach ticket (13): Rive is not adopted, so no Rive plan. Cloudflare only.

2026-09-24: Joe renamed the workers.dev subdomain from `joe-3ed` to `barmadden`. Docs on `main` and the READMEs and bot script on `prototype/cursor-sync` and `prototype/own-cursor` now use `barmadden.workers.dev`; the cursor sync worker is at https://cursor-sync-proto.barmadden.workers.dev.

2026-09-24, from [How does the site deploy to Cloudflare, and how is the spend cap watched?](20-deploy-pipeline.md): no Turnstile widget will be needed, since Turnstile is dropped. Joe manages budget alerts himself. The site ships on barmadden.com through Workers Builds, so no CI API token is needed, only an Account Analytics Read token kept locally for `npm run usage`.
