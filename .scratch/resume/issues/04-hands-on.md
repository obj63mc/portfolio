# 04: Hands-on

**What to build:** Nothing: Joe's check of the print and the claims, and the PDF.

**Blocked by:** 02, 03

**Status:** ready-for-human

- [x] Chrome: `npm run preview`, open `/resume`, ⌘P, Letter, default margins, Background graphics off. Two pages in Barlow Condensed and Montserrat, no bar or controls, no point split across pages; page 2 opens on the Chief Architect entry's last point. To move the break, give the entry that should head page 2 `break-before: page` in the print rules.
- [x] Save as PDF and replace `static/resume.pdf` with it; or, after `npm run build`, `RESUME_PDF=static/resume.pdf npx playwright test tests/resume.spec.ts` writes the same print there.
- [x] Safari and Firefox print previews: a line may paginate differently; Chrome's is the PDF.
- [x] A phone at 390 px wide, and the hop from the welcome card with sound on, then under reduced motion, listening for a leaked theme (the iris's fade is skipped there).
- [x] The claims placed from public launch dates: Joe rewrote the copy in his own words (2026-10-02), so it is his.
- [x] A read-through for typos before the print ("projectesacross" in the Engineer III entry, as of 2026-10-02).

## Comments
