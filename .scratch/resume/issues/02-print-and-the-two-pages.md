# 02: Print and the two pages

**What to build:** The print styles: white paper and night ink, the bar and the layout's chrome gone, no fill, no point of an entry cut in two, no heading at a page's foot, two Letter pages; the smoke that prints the page to a PDF and counts them.

**Blocked by:** 01

**Status:** resolved

- [x] `@page` margins and the `@media print` rules in the page; the chrome's in `app.css`
- [x] The site's type in the print (the latin faces are preloaded on every page)
- [x] `tests/resume.spec.ts`: print media hides the bar and the controls, the PDF is two pages
- [x] The second page's first entry: left to the flow, which lands it on the Chief Architect entry's last point

## Comments

### Built, 2026-10-02

- `@page { margin: 0.5in }` and no `size`, which isn't Baseline: Letter is the print dialog's default and the smoke's. 10pt Montserrat at 1.3, headings 11 to 24pt, nothing filled, so `print-color-adjust` is never needed.
- A first pass kept each entry whole (`break-inside: avoid`), which pushed the whole Chief Architect entry to page 2 and the resume to three pages. Now a point (`li`) is what stays whole, and `h2`, `h3` and the employer line never end a page (`break-after: avoid`). Two pages, the second opening on the Chief Architect's last point.
- The chrome's print rule sits last in `app.css`: `.controls` sets `display: flex` further down than the rule first stood, and printed the Sound toggle.
- The contacts print at 9pt with a dot after each; the LinkedIn address still wraps to a second line, which the trailing dot reads fine with.
- `tests/resume.spec.ts` prints with `page.pdf({ format: 'Letter' })` and counts `/Type /Page` objects (Chromium keeps them in the clear); `RESUME_PDF=<path>` keeps the file.
