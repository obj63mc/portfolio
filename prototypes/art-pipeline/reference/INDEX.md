# Style references

Everything in this folder is a style reference for the recipe, never an asset. The `ref-*.png` files and `church-entrance-crop.png` are committed; `home.png`, `about.png` and `wayback/` stay local (gitignored).

## Loading into the harness

In `review.html` use the file picker on the "Style reference" slot and pick any of the `ref-*.png` files here (the folder picker only maps files inside `assets/`, so references are chosen by hand). Three or four is plenty; the palette strip is per file.

- `ref-scene-0-arrival-mock.png`: the day scene with the original sign and moose composited on it. Closest thing to the planned arrival point at Maplewood. The brick church on the right is the real Moosylvania office; the Maplewood prompt must reference it.
- `ref-scene-1-day.png`, `ref-scene-2-night.png`, `ref-scene-3-theatre.png`, `ref-scene-4-office.png`: the four sections of the old homepage backdrop, cut from `wayback/homepage/bg-main.jpg`.
- `ref-sheet-props.png`: contact sheet of the standalone props (moose, sign, billboard, frog, mountain guys, cardinal, shark, spaceman, dogs, section layers, logos).
- `church-entrance-crop.png`: the church's arched doorway cut from `assets/maplewood.webp`; attach it to the door prompt so the double door matches the opening.
- `ref-sheet-case.png`: contact sheet of case study art. Mostly photography and device mock-ups, so use it only for the few flat-vector pieces (knight on horse, Enterprise cars).

## Joe's screenshots

- `home.png`, `about.png`: full-page screenshots Joe saved.

## Pulled from the Wayback Machine (`wayback/`)

170 images, keyed by their original path under `themes/moosylvania/images/` (uploads under `wayback/uploads/`, the blog header under `wayback/blog/`). `wayback/inventory.txt` lists every file with dimensions and bytes. Sources:

- https://web.archive.org/web/20140215012802/http://www.moosylvania.com (served as the 2014-02-08 capture) and its stylesheets, which hold every homepage background and prop.
- https://web.archive.org/web/20130513180924/http://www.moosylvania.com/case-studies/study/Fast+Five+Speed+To+The+Safe
- https://web.archive.org/web/20130513174759/http://www.moosylvania.com/case-studies/study/Sapporo
- https://web.archive.org/web/20140320062401/http://www.moosylvania.com/case-studies/study/universal
- https://web.archive.org/web/20140215012802/http://www.moosylvania.com/case-studies/study/greygoose
- https://web.archive.org/web/20140215014444/http://www.moosylvania.com/case-studies/study/enterprise

The files that matter for the recipe, all in `wayback/homepage/` unless noted:

| File | Size | Why it matters |
| --- | --- | --- |
| `bg-main.jpg` | 1800 x 6230 | The whole scrolling scene: sky and prairie with a brick church, lake, night sky over a bridge into town, theatre, wood floor, wallpaper. The palette and the flat shading with no outlines come from here. |
| `bg-home.png`, `bg-about.png`, `bg-work.png`, `bg-connect.png`, `bg-contact.png` | 1800 wide | Transparent overlays per section: clouds, mountains, the dark screen, phone and cable, office objects (bike, bookshelf, armchair, door, map). |
| `sign.png` | 585 x 447 | The original "Welcome to Moosylvania" hanging sign. The recipe's welcome sign should quote this. |
| `moose.png` | 427 x 439 | The moose standing in water. Reference for the four-part rig; note the antlers and head overlap the body, so separated parts must be repainted behind the overlaps. |
| `billboard.png` | 666 x 456 | Green billboard on posts; a template for prop signage. |
| `blog-frog.png`, `mountain-guy.png`, `cardinal.png`, `shark.png`, `spaceman.png`, `animated-dog.png`, `animated-sign.png` | small | Ambient props. The dog and sign strips are sprite sheets, which shows how the old site cycled frames. |
| `clock.png`, `hour-hand.png`, `minute-hand.png`, `sechand.png` | tiny | A pivoted clock built from separate layers, the same approach as ADR 0002. |
| `../moose-logo.png`, `../footer-moose.png`, `../blog/hdr-moose.png` | small | Moose marks in the brand browns and oranges. |
| `../case/universal/hgt.png`, `../case/enterprise/hgt.png` | medium | Flat-vector knight and cars from the case studies, same style family. |

Everything else (`case/*/top-*.png`, `vertical-nav/`, `conn-*.png`, icons, separators) is site chrome and can be ignored.
