# Assemble the spec and hand it off

Type: task
Status: open
Part of: ../map.md
Blocked by: 16, 17, 18, 19, 20, 22

## Question

Once the remaining decisions are in, write the site spec at `.scratch/stl-cursor-portfolio/spec.md`, drawn from every resolved ticket, the ADRs and `CONTEXT.md`, citing tickets rather than restating their detail where the detail is long. List the prototypes and branches a builder should read and which code, if any, carries over. Check that no ticket's answer contradicts a later one (for example the own-cursor ticket amending cursor identity), and flag any gaps. Output: the spec file, ready to hand to `/to-tickets`.

## Comments

2026-09-24, from [How does the site deploy to Cloudflare, and how is the spend cap watched?](20-deploy-pipeline.md): ADR 0005 supersedes ADR 0004, and Room is redefined in `CONTEXT.md`. Earlier tickets that say one room per scene, 60 live cursors site-wide, spectators, Turnstile or a ~$17 worst case carry amendment notes pointing here. The deploy ticket's answer is the deploy and operations section, with a dashboard checklist.
