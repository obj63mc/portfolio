# How is the prop button layer structured for crawlers, screen readers and keyboards?

Type: grilling
Status: open
Part of: ../map.md
Blocked by: 05, 06, 08

## Question

ADR 0003 makes each prop a transparent `<button>` over the canvas, and that button layer is the site's accessible and crawlable HTML. It must be prerendered. Decide how it is structured per scene URL (`/`, `/maplewood/moosylvania` and the other sub-scenes):

- the heading hierarchy (scene, district, venue), and how the painted district signs map to real headings;
- what a prop's markup holds: the button's accessible name only, or the full content from the content inventory (05), and how the reveal card is exposed as a dialog;
- which props are links rather than buttons (resume PDF, LinkedIn, GitHub, Strava, email, venue doors that change URL);
- keyboard order across districts, skip links, and how focus pans the camera (the prototype centres the camera on the focused prop on `:focus-visible`);
- what screen readers are told about the canvas itself and about other visitors' cursors;
- how SvelteKit prerenders the layer (the prototype ran with `ssr = false`).

Output: a markup outline per scene type, ready for the spec.
