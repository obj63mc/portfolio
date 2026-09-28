# What does each venue say, and through which props?

Type: grilling
Status: resolved
Part of: ../map.md

## Question

For each district and venue, what career facts, clients, links and personal notes are surfaced, and which props carry them? Midtown: Saint Louis University (CS lab sub-scene, honours degree) and The Foundry (theatre showing Universal Home and other Moosylvania client work). Belleville: MonsterCommerce, acquired by Network Solutions. Maplewood: Moosylvania (current role) and Side Project Cellar (alcohol clients, craft beer). Central West End: Brennan's (cigar clients). Carondelet Park: criterium racing and current riding. Also settle which client logos are cleared to show, which props grant cosmetics, and where resume download and contact live. Output: a content inventory table per venue.

## Answer

Resolved 2026-09-23 in a grilling session. Public facts verified by a fact-finding subagent (Moosylvania work page, Computerworld on the MonsterCommerce acquisition, venue addresses).

### Arrival and global props

| Prop | Where | Content |
| --- | --- | --- |
| Arrival point | Maplewood, at the Moosylvania welcome sign | Visitors spawn here, the current chapter. |
| Signpost | Next to the arrival point | Arrows to the other four districts; resume download (PDF), email, LinkedIn, GitHub. A recruiter reaches contact in under ten seconds. |

### Midtown

**Saint Louis University** (sub-scene: CS lab)

| Prop | Content | Cosmetic |
| --- | --- | --- |
| Diploma on the wall | Bachelor of Science in Computer Science with Honors, 2005 | Graduation cap |
| Whiteboard | Diagram of basis path testing, the senior project | |
| Lab workstation | Link to GitHub | |

**The Foundry** (Alamo Drafthouse at City Foundry; sub-scene: theatre)

| Prop | Content | Cosmetic |
| --- | --- | --- |
| Marquee (exterior) | Universal Pictures Home Entertainment, three titles | |
| Screen (interior) | Reel or poster wall cycling the three titles below | 3D glasses |
| Poster: Fast Five | Find-and-seek and safe-cracking game promoting the home video release | |
| Poster: Snow White and the Huntsman | Multiple mini games built from scenes in the film | |
| Poster: The Lorax | Partnership with Words With Friends | |

Note: Universal Home work is not on Moosylvania's public work page. Joe confirms it may be shown.

### Belleville

**MonsterCommerce** (exterior only, no sub-scene)

| Prop | Content | Cosmetic |
| --- | --- | --- |
| Company sign, flips to Network Solutions | Intern from 2004, full time 2005 after graduation, left 2011. Acquired by Network Solutions, announced December 2005. | Monster hat |
| Server rack | Built the e-commerce platform ("Shopify before Shopify"); after the acquisition moved to networksolutions.com focusing on conversion optimisation, front-end development and A/B testing. | |

Confirmed by Joe: full time from 2005.

### Maplewood

**Moosylvania** (7303 Marietta; sub-scene: the lobby, from the meeting area behind the front desk up the stairs to the loft)

| Prop | Content | Cosmetic |
| --- | --- | --- |
| Welcome sign (exterior, styled like the old site) | 2011 to present. Senior Developer to Chief Architect. Leads all web work with a small team of writers, creatives and developers. | |
| The moose (exterior) | A personal line, to be written | Antlers |
| Building door | Enters the lobby | |
| Moose statue on the front desk | What Moosylvania is, with general information about the agency; text to be written by Joe | |
| Meeting TV (behind the front desk) | Plays a video Joe provides, for the visitor who clicks it; file to come | |
| Loft computer: Frontend | Nuxt, Next, Svelte, modern JS, TypeScript, SCSS | |
| Loft computer: Backend | Node.js/TypeScript and PHP platforms; experience with ASP.NET C#, Ruby, Python | |
| Loft computer: CMS | WordPress, SilverStripe, Strapi; headless Prismic and Storyblok | |
| Loft computer: Data | MySQL, PostgreSQL, Redis; MongoDB experience | |

**Side Project Cellar** (7373 Marietta, across the street from Moosylvania; sub-scene: bar)

| Prop | Content | Cosmetic |
| --- | --- | --- |
| Bottles on the shelves behind the front bar, one per brand, each with its logo | Bacardi, Grey Goose, New Amsterdam Vodka, Camarena Tequila, Barefoot Wine, Bud Light, E&J Brandy, Pink Whitney, RumChata, Soonhari. Each with a one-line "what we did". | |
| Side Project sign (the light-bulb logo on the cooler door) | The brewery's mark; a line to be written. | Beer mug |
| Chalkboard | Side Project is Joe's favourite brewery; favourite styles are stouts and barleywines. | |

Clearance: New Amsterdam, Camarena, Bud Light, E&J, Pink Whitney, RumChata and Soonhari are on Moosylvania's public work page. Bacardi, Grey Goose and Barefoot Wine are former Moosylvania clients no longer on the work page; Joe built their websites and confirms they may be shown.

### Central West End

**Brennan's** (316 N. Euclid; sub-scene: bar interior)

| Prop | Content | Cosmetic |
| --- | --- | --- |
| Humidor with one box per brand | Cohiba, Macanudo, Partagas, La Gloria Cubana, Punch, plus a Scandinavian Tobacco Group logo. Each with a one-line "what we did". | Cigar |

Clearance: CAO and General Cigar are on the public work page; La Gloria Cubana is listed by a third party; Venmo is on the work page. The others are named by Joe as cleared.

**On the overworld** (moved from Brennan's; placement to come)

| Prop | Content | Cosmetic |
| --- | --- | --- |
| ATM | PayPal and Venmo as fintech clients. | |

### Carondelet Park

**The park** (exterior only, no sub-scene)

| Prop | Content | Cosmetic |
| --- | --- | --- |
| Cycling track with a rider looping it | Ambient animation; the park hosts the Carondelicious Criterium and the Tuesday night training series. | |
| Joe's bike | Link to Strava: https://www.strava.com/athletes/8703625 | Bike helmet |
| Ride sign | Longest ride 160 miles (Ride Across Wisconsin); longest two-day 235 miles (Ride Across Wisconsin). Raced criteriums, still rides. | |

### Cosmetics summary

Seven, one per venue except Moosylvania's pair: graduation cap, 3D glasses, monster hat, antlers, beer mug, cigar, bike helmet. Detail belongs to the cursor identity ticket.

### Sub-scene count

Five sub-scenes: CS lab, theatre, Moosylvania lobby, Side Project bar, Brennan's interior. MonsterCommerce and Carondelet Park are exterior only.

## Comments

2026-09-23, from the cursor identity ticket (11): the MonsterCommerce sign no longer flips to Network Solutions. It is the MonsterCommerce logo with the eyeball "O"; clicking the eye blinks it and grants the monster ears. The acquisition text stays in the sign content.

2026-09-28, Joe: the ten Side Project brands are bottles, not taps: one bottle per brand with its logo on the label, on the shelves of the wall behind the front bar (the navy liquor wall of the real Cellar). Props are `bottle-<brand>` in `src/lib/scenes/side-project.ts`; the sound and ambient-motion lists (tickets 13 and 19, the spec) follow. Later the same day Joe added a round Side Project sign with the brewery's light-bulb logo on the door of the back bar's cooler (prop `brewery-sign`); clicking it, not a bottle, grants the beer mug.

2026-09-28, Joe: Brennan's is redrawn facing the humidor, with larger brand boxes whose lids carry their labels. The ATM leaves Brennan's: it becomes a new overworld asset, to give the overworld more interactivity; Joe places it later.

2026-09-28, Joe: the Moosylvania lobby becomes one larger scene that scrolls like the overworld, along the nave of the converted church: the meeting area behind the front desk (a sofa, a table and chairs and a TV), the front desk with its frosted glass moose wall and the round coffee table between two curved red sofas, then up the twin staircases to a bigger loft of loosely arranged desks. The four stack computers live in the loft. A mini moose statue on the front desk explains what Moosylvania is; its text is Joe's to write. The meeting TV plays a video Joe will provide, for the visitor who clicks it only (a local prop).
