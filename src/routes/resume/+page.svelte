<!--
	The resume (Joe, 2026-10-02): a page of its own with no scene, like the games, but in the document's flow, so it scrolls
	and prints. The copy is this markup, plain HTML, the easiest thing to edit; the tests read its shape and never its words.
	The PDF at /resume.pdf (static/resume.pdf) is the browser's print of this page, replaced by hand after the copy changes.
	The engine steps away while the page is up (+layout.svelte), and its exit lands at the arrival point, the welcome sign
	whose card links here.
-->
<svelte:head>
	<title>Resume of Joseph Madden | BarMadden.com</title>
	<meta
		name="description"
		content="The resume of Joseph Madden, a full-stack web engineer and architect in St. Louis: fifteen years running the Interactive Department at Moosylvania. Engineer for seven years at MonsterCommerce and Network Solutions before that."
	/>
</svelte:head>

<article class="resume" aria-labelledby="resume-title">
	<header class="bar">
		<a href="/" class="logo">BarMadden.com</a>
		<!-- A download, which the router leaves to the browser; the analytics click listener still counts it as the resume. -->
		<a class="primary" href="/resume.pdf" download>Download</a>
		<button type="button" class="secondary" onclick={() => window.print()}>Print</button>
		<a class="exit" href="/">
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg>
			<span>Back to St. Louis</span>
		</a>
	</header>

	<div class="sheet">
		<header class="who">
			<hgroup>
				<h1 id="resume-title">Joseph Madden</h1>
				<p class="headline">Principal Full-Stack Engineer · Web Architect</p>
			</hgroup>
			<!-- Each link's text is its address, so the print needs no URL written after it. -->
			<address class="contact">
				<ul>
					<li>St. Louis, MO</li>
					<li><a href="mailto:joe@barmadden.com">joe@barmadden.com</a></li>
					<li><a href="https://barmadden.com">barmadden.com</a></li>
					<li><a href="https://github.com/obj63mc" target="_blank">github.com/obj63mc</a></li>
					<li><a href="https://www.linkedin.com/in/joseph-madden-152b2745/" target="_blank">linkedin.com/in/joseph-madden-152b2745</a></li>
				</ul>
			</address>
		</header>

		<section aria-labelledby="summary-title">
			<h2 id="summary-title">Introduction</h2>
			<p>
				I've been building for the web since the days of classic ASP and
				using table-based layouts, and continue to keep learning new technologies
				and frameworks daily. For the last fifteen years I've run the Interactive
				Department at Moosylvania, a St. Louis agency: building websites with open
				source technologies, and running the hosting behind about 45 client sites
				and applications. I ship five or six sites a year and have lead teams
				from one developer to ten. Thank you for your time in reading my resume and
				look forward to the opportunity to work with you in the future.
			</p>
		</section>

		<section aria-labelledby="skills-title">
			<h2 id="skills-title">Skills</h2>
			<dl class="groups">
				<div>
					<dt>Front end</dt>
					<dd>
						TypeScript, JavaScript, Vue and Nuxt, Modern HTML, CSS and SCSS. Experience with Svelte and SvelteKit, React and Next.js, Astro.
						Strong on accessibility standards, web performance optimization.
					</dd>
				</div>
				<div>
					<dt>Back end</dt>
					<dd>
						Node.js, PHP. Experience with Python for scripting; earlier, ASP.NET and C#, Ruby on Rails, Java and JSP, classic ASP.
						Experienced in building Full Stack applications, RESTful APIs, web services and integrations.
					</dd>
				</div>
				<div>
					<dt>Data</dt>
					<dd>MySQL, PostgreSQL, Redis, MongoDB, Elasticsearch</dd>
				</div>
				<div>
					<dt>Hosting</dt>
					<dd>AWS, Cloudflare, Heroku, Render, Docker</dd>
				</div>
				<div>
					<dt>CMS and Commerce</dt>
					<dd>Silverstripe, Shopify, WordPress, Strapi, Django, Storyblok, Prismic</dd>
				</div>
				<div>
					<dt>Marketing systems</dt>
					<dd>Braze, HubSpot, Salesforce Marketing Cloud, Mailchimp, Campaign Monitor, Klaviyo</dd>
				</div>
				<div>
					<dt>Leading</dt>
					<dd>
						Estimates, architecture, development and code review for a team of up to ten; working day to day with writers, designers and clients; AI-assisted
						development with coding agents driven by specs, decision records and tests. Still writing code every day.
					</dd>
				</div>
			</dl>
		</section>

		<section aria-labelledby="experience-title">
			<h2 id="experience-title">Experience</h2>

			<article class="entry">
				<h3>Chief Architect</h3>
				<p class="when"><time datetime="2013-08">Aug 2013</time> &ndash; Present</p>
				<p class="org">Moosylvania · Maplewood, MO</p>
				<ul>
					<li>
						Own the architecture, stack and hosting for all of the agency's web work, and personally run the hosting for about 45 websites and
						applications for Gallo Spirits and Scandinavian Tobacco Group across AWS, Cloudflare, Heroku and Render.
					</li>
					<li>
						Built and manage every website for Scandinavian Tobacco Group's North American cigar unit (General Cigar Company): Cohiba, Macanudo,
						Partagas, Punch, La Gloria Cubana and others. Cigar World, a social network for cigar smokers.
					</li>
					<li>
						Ship five to six new websites a year from estimate to launch and the hosting.
						Some of my favorite projects include Bud Light's "Big Game" site during COVID,
						Sapporo, Soonhari's US relaunch, Anchor Brewing's rebrand.
					</li>
					<li>
						Lead a development team that has ranged from one to ten developers, alongside the agency's writers and creatives: architecture, development, code
						review, estimates and the hard problems.
					</li>
					<li>
						Build lifecycle marketing end to end, built about 50 emails a year: Venmo's Braze CRM (email, in-app messages and banners), PayPal's email,
						banner ads and micro sites, and campaigns in HubSpot, Salesforce Marketing Cloud, Mailchimp and Campaign Monitor.
					</li>
					<li>
						Ran usability and prototype testing before two big launches: PayPal Credit's buy-now-pay-later approval flow, and Panera's online
						ordering properties and in-store kiosks.
					</li>
					<li>
						Keep clients' costs down and their options open with open source: Silverstripe as the app platform, Shopify for commerce, headless CMS platforms like
						Storyblok, Prismic and Strapi. WordPress and Django where they fit.
					</li>
				</ul>
			</article>

			<article class="entry">
				<h3>Senior Web Developer</h3>
				<p class="when"><time datetime="2011-08">Aug 2011</time> – <time datetime="2013-08">Aug 2013</time></p>
				<p class="org">Moosylvania · Maplewood, MO</p>
				<ul>
					<li>
						Built the launch sites for various clients including Bacardi, Grey Goose, and Enterprise Car Share.
					</li>
					<li>
						Built promotions and games for Universal Pictures Home Entertainment's home-video releases: Fast Five,
						Snow White and the Huntsman, The Lorax and other films.
					</li>
					<li>Brand and campaign sites front to back on PHP and Silverstripe, with the HTML, CSS and JavaScript in front of them.</li>
				</ul>
			</article>

			<article class="entry">
				<h3>Engineer III</h3>
				<p class="when"><time datetime="2004-05">May 2004</time> – <time datetime="2011-08">Aug 2011</time></p>
				<p class="org">Network Solutions (MonsterCommerce until the 2005 acquisition) · Belleville, IL</p>
				<ul>
					<li>
						Started on MonsterCommerce's help desk while finishing my Bachelor's degree.
					</li>
					<li>
						Moved to QA with the Product team, testing and shaping the platform's special features projectes
						across versions 3 to 5, learning web development on classic ASP and ASP.net.
						Mid 2005, I transitioned to full-time development on the platform.
					</li>
					<li>
						After the acquisition, around 2007 I moved to working directly on NetworkSolutions.com, a JSP e-commerce site: front-end development, A/B testing and checkout
						optimizations for the registrar's purchase flow.
					</li>
					<li>
						Completed development of the company's support portal, improving the user experience and streamlining the support process with full documentation of their platforms.
					</li>
				</ul>
			</article>
		</section>

		<section aria-labelledby="projects-title">
			<h2 id="projects-title">Side Projects</h2>
			<article class="entry">
				<h3><a href="https://barmadden.com">BarMadden.com</a></h3>
				<p class="when"><time datetime="2026">2026</time></p>
				<ul>
					<li>An explorable, multiplayer illustrated St. Louis: visitors are cursors who see each other and walk into the places I've worked.</li>
					<li>
						SvelteKit and Svelte 5 in strict TypeScript; a hand-written Canvas 2D engine with a prerendered, accessible DOM under every prop; live
						rooms over WebSockets on Cloudflare Workers Durable Objects; a hash-mode Content Security Policy and consent-gated analytics.
					</li>
					<li>
						Two of my old agency games rebuilt inside it (Sushi Stand, Big Muddy), and the art made with image models through an upscaling and
						review pipeline.
					</li>
				</ul>
			</article>
			<article class="entry">
				<h3>Open Source Contributions to the Silverstripe CMS Platform</h3>
				<p class="when"><time datetime="2019">2019-present</time></p>
				<ul>
					<li>
						Contributed to the Silverstripe CMS platform by submitting pull
						requests, reporting bugs.
					</li>
					<li>
						Currently manage the
						<a href="https://github.com/silverstripe/silverstripe-s3" target="_blank">Silverstripe AWS S3 module</a>
						for handling assets and file uploads.
					</li>
				</ul>
			</article>
		</section>

		<section aria-labelledby="education-title">
			<h2 id="education-title">Education</h2>
			<article class="entry">
				<h3>BS in Computer Science, with honors</h3>
				<p class="when"><time datetime="2001">2001</time> – <time datetime="2005">2005</time></p>
				<p class="org">Saint Louis University · St. Louis, MO</p>
				<ul>
					<li>
						Senior project: a static analyzer that built control-flow graphs of C and Java source and computed cyclomatic complexity for basis
						path testing.
					</li>
				</ul>
			</article>
		</section>

		<section aria-labelledby="off-title">
			<h2 id="off-title">Off the clock</h2>
			<p>Former South Side Cyclery racer: 160 miles across Indiana in a day, 235 across Wisconsin in two, and across Missouri three times. Craft Beer lover and an avid Cleveland Browns Fan.</p>
		</section>
	</div>
</article>

<style>
	/*
	 * The site's night header over a night board framed in ivory like the cards, gold headline and buttons, sky section
	 * headings and ivory copy, as the games' boards are. The board sits in the document's flow on a lighter night (app.css).
	 */
	.resume {
		--board-pad: clamp(1.25rem, 0.8rem + 2vw, 2.25rem);
		color: var(--ivory);
		font-family: var(--body);
		/* No italic face is loaded (app.css), so nothing is slanted by the browser either: the address stays upright. */
		font-synthesis-style: none;
	}

	.bar {
		position: sticky;
		inset-block-start: 0;
		z-index: 2;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1rem;
		padding-block: 0.5rem;
		padding-inline: 1rem;
		background: var(--night);
		box-shadow: 0 0.25rem 1rem rgb(0 0 0 / 0.2);
	}

	.logo {
		margin: 0;
		color: var(--gold);
		font-family: var(--headline);
		font-size: 1.75rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		line-height: 1;
		text-transform: uppercase;
		text-decoration:none;
	}

	/* The PDF and Print at card size, as a card's See More is (Prop.svelte). */
	.bar :is(a:global(.primary), button:global(.secondary)) {
		padding-block: 0.5rem 0.55rem;
		padding-inline: 1.375rem;
		font-size: 1.1875rem;
	}

	/* The site's buttons (app.css) lift to their lighter fill under the mouse here too; the engine's hover mark is off on this page. */
	.bar :is(a, button):is(:global(.primary), :global(.secondary)):not(:disabled):hover {
		background: var(--fill-hot);
		color: var(--ink-hot, var(--ink));
	}

	/* The round button at the header's end: the way out, as the games' is. */
	.exit {
		display: grid;
		place-items: center;
		flex: none;
		margin-inline-start: auto;
		inline-size: 2.75rem;
		block-size: 2.75rem;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--ivory);
		box-shadow: inset 0 0 0 2px rgb(255 244 212 / 0.5);
		cursor: pointer;

		&:hover {
			background: var(--ivory);
			color: var(--night);
		}

		&:focus-visible {
			outline: 3px solid var(--gold);
			outline-offset: 2px;
		}

		& svg {
			inline-size: 1.25rem;
			block-size: 1.25rem;
			fill: none;
			stroke: currentColor;
			stroke-width: 2.4;
			stroke-linecap: round;
			stroke-linejoin: round;
		}

		& span {
			position: absolute;
			inline-size: 1px;
			block-size: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
	}

	/* The board, a sheet in the flow. */
	.sheet {
		box-sizing: border-box;
		inline-size: min(100% - 2rem, 64rem);
		margin-block: 1.5rem 2.5rem;
		margin-inline: auto;
		padding: var(--board-pad);
		border: 2px solid rgb(255 244 212 / 0.3);
		border-radius: 0.75rem;
		background: var(--night);
		box-shadow: 0 0 0 7px var(--night), 0 1.375rem 2.75rem rgb(0 0 0 / 0.3);
		text-wrap: pretty;
	}

	.who {
		margin-block-end: 1.5rem;
	}

	hgroup {
		margin: 0;
	}

	h1 {
		margin: 0;
		color: var(--gold);
		font-size: clamp(2.25rem, 1.5rem + 2.5vw, 3.25rem);
		letter-spacing: 0.03em;
		line-height: 1.02;
		text-transform: uppercase;
	}

	.headline {
		margin-block: 0.375rem 0.75rem;
		color: var(--sky);
		font-size: 1.125rem;
		font-weight: 500;
	}

	.contact {
		font-style: normal;

		& ul {
			display: flex;
			flex-wrap: wrap;
			gap: 0.75rem 1.25rem;
			margin: 0;
			padding: 0;
			list-style: none;
		}
	}

	/* A link in the sheet reads as a card's does: gold, underlined clear of the text. */
	.sheet a {
		color: var(--gold);
		font-weight: 500;
		text-decoration-thickness: 2px;
		text-underline-offset: 5px;

		&:focus-visible {
			outline: 3px solid var(--ivory);
			outline-offset: 3px;
		}
	}

	h2 {
		margin-block: 1.75rem 0.75rem;
		padding-block-end: 0.25rem;
		border-block-end: 1px solid rgb(255 244 212 / 0.2);
		color: var(--sky);
		font-size: 1.5rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	p {
		margin-block: 0 0.75rem;
		max-inline-size: 95%;
		line-height: 1.55;
	}

	/* A role, a project or a degree: its title with the dates at the line's end, who it was for under them, then its points. */
	.entry {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: baseline;
		column-gap: 1rem;
		margin-block-end: 1.25rem;

		& h3 {
			margin: 0;
			font-size: 1.25rem;
			letter-spacing: 0.03em;
			text-transform: uppercase;
		}

		& .when {
			margin: 0;
			max-inline-size: none;
			font-variant-numeric: tabular-nums;
			opacity: 0.75;
			text-align: end;
			white-space: nowrap;
		}

		& .org {
			grid-column: 1 / -1;
			margin-block: 0.125rem 0.375rem;
			max-inline-size: none;
			font-weight: 700;
		}

		& ul {
			grid-column: 1 / -1;
			margin: 1rem 0;
			padding-inline-start: 1.25rem;
			line-height: 1.5;
		}

		& li {
			margin-block-end: 1rem;
		}

		& li::marker {
			color: var(--gold);
		}
	}

	/* The skills, a group a row: its name in the headline face, then the list. */
	.groups {
		margin: 0;
		display:grid;
		gap:1rem;
		& div {
			display: grid;
			grid-template-columns: 9rem minmax(0, 1fr);
			gap: 0.25rem 1rem;
			margin-block-end: 0.5rem;
		}

		& dt {
			color: var(--sky);
			font-family: var(--headline);
			font-size: 1rem;
			font-weight: 800;
			letter-spacing: 0.06em;
			line-height: 1.5;
			text-transform: uppercase;
		}

		& dd {
			margin: 0;
			line-height: 1.5;
		}
	}

	/* On a phone the dates go under the title, and a group's name over its list. */
	@media (width < 36rem) {
		.logo{
			width:100%;
		}
		.entry {
			grid-template-columns: minmax(0, 1fr);

			& .when {
				text-align: start;
			}
		}

		.groups div {
			grid-template-columns: minmax(0, 1fr);
			gap: 0.125rem;
		}
	}

	/*
	 * Printed: white paper and night ink on two Letter pages, the header and the board's frame gone, nothing filled (so no
	 * print-color-adjust is needed). An entry may run over a page, as a long role's list must, but no point of it is cut in
	 * two and no heading, title or employer is left at a page's foot. The page's size is the print dialog's own, Letter
	 * here: `size` isn't Baseline. The links keep their addresses as their text.
	 */
	@page {
		margin: 0.5in;
	}

	@media print {
		.resume {
			color: var(--night);
			font-size: 10pt;
			line-height: 1.3;
		}

		.bar {
			display: none;
		}

		.sheet {
			inline-size: auto;
			margin: 0;
			padding: 0;
			border: 0;
			border-radius: 0;
			background: none;
			box-shadow: none;
		}

		.who {
			margin-block-end: 6pt;
		}

		h1 {
			color: var(--night);
			font-size: 22pt;
		}

		.headline {
			margin-block: 1pt 4pt;
			color: var(--night);
			font-size: 11.5pt;
		}

		/* One line of contacts, a dot after each but the last, so a wrapped line never opens with one. */
		.contact {
			font-size: 9pt;

			& ul {
				gap: 0;
			}

			& li:not(:last-child)::after {
				content: '·';
				margin-inline: 0.6em;
			}
		}

		.sheet a {
			color: inherit;
			font-weight: inherit;
			text-decoration: none;
		}

		h2 {
			margin-block: 11pt 5pt;
			padding-block-end: 1.5pt;
			border-block-end-color: rgb(29 43 58 / 0.35);
			color: var(--night);
			font-size: 11.5pt;
			break-after: avoid;
		}

		h3 {
			font-size: 11pt;
			break-after: avoid;
		}

		p {
			max-inline-size: none;
		}

		.entry {
			margin-block-end: 7pt;

			& .org {
				margin-block: 0 3pt;
				break-after: avoid;
			}

			/* The screen's room round a list and between rows (Joe, 2026-10-02) is the page's own; paper is tighter. */
			& ul {
				margin: 0;
				line-height: 1.3;
			}

			& li {
				margin-block-end: 2pt;
				break-inside: avoid;
			}

			& li::marker {
				color: var(--night);
			}
		}

		/* Should the copy's natural break want moving, `break-before: page` on the entry that is to head the second page. */
		.groups {
			gap: 0;

			& div {
				grid-template-columns: 9rem minmax(0, 1fr);
				margin-block-end: 2pt;
			}

			& dt {
				color: var(--night);
				line-height: 1.3;
			}

			& dd {
				line-height: 1.3;
			}
		}
	}
</style>
