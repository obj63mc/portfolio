# MonsterCommerce functionality comparisons

Researched 2026-10-01. **Eight real feature matches** between MonsterCommerce 3.x and 4.x are recorded in `matches.json`. Seven are strong primary choices; the customer-record comparison is a smaller supporting example. Nine additional original 3.x figures were recovered during this pass.

## Recommended comparisons

| Feature | 3.x evidence | 4.x evidence | Match quality |
| --- | --- | --- | --- |
| Orders list | [image016.jpg](https://web.archive.org/web/20021003025154id_/http://monstercommerce.com/manual/index_files/image016.jpg) — 2002-10-03 | [op3.jpg](https://web.archive.org/web/20060410054812id_/http://www.monstercommerce.com/imgs05/screenshots/lg/op3.jpg) — 2006-04-10 | Strong: both are New Orders with status changes and per-order actions. |
| Find and manage products | [image086.jpg](https://web.archive.org/web/20021003022357id_/http://monstercommerce.com/manual/index_files/image086.jpg) — 2002-10-03 | [im2.jpg](https://web.archive.org/web/20060410054636id_/http://www.monstercommerce.com/imgs05/screenshots/lg/im2.jpg) — 2006-04-10 | Strong: both show searchable product tables with thumbnails and edit/delete actions. |
| Edit a product | [image061.jpg](https://web.archive.org/web/20021110183850id_/http://monstercommerce.com/manual/index_files/image061.jpg) — 2002-11-10 | [im3.jpg](https://web.archive.org/web/20060410054622id_/http://www.monstercommerce.com/imgs05/screenshots/lg/im3.jpg) — 2006-04-10 | Strong: both show General product editing with advanced tabs, descriptive fields, pricing and display settings. |
| Manage inventory quantities | [image048.jpg](https://web.archive.org/web/20021206184456id_/http://monstercommerce.com/manual/index_files/image048.jpg) — 2002-12-06 | [im4.jpg](https://web.archive.org/web/20060410054643id_/http://www.monstercommerce.com/imgs05/screenshots/lg/im4.jpg) — 2006-04-10 | Strong: both are Inventory Manager with category filtering, product stock rows and bulk stock quantity controls. |
| Edit product categories | [image050.jpg](https://web.archive.org/web/20021206184547id_/http://monstercommerce.com/manual/index_files/image050.jpg) — 2002-12-06 | [im1.jpg](https://web.archive.org/web/20060410054628id_/http://www.monstercommerce.com/imgs05/screenshots/lg/im1.jpg) — 2006-04-10 | Strong function match: category/subcategory naming, sort order, visibility and markup. |
| Edit the storefront header HTML | [image095.jpg](https://web.archive.org/web/20021110162505id_/http://monstercommerce.com/manual/index_files/image095.jpg) — 2002-11-10 | [mc-2005-site-design.jpg](https://web.archive.org/web/20060410054747id_/http://www.monstercommerce.com/imgs05/screenshots/lg/sd1.jpg) — 2006-04-10 | Strong: direct equivalents with an HTML textarea and Display Option selection. |
| Configure custom payment methods | [image043.jpg](https://web.archive.org/web/20030413174901id_/http://www.monstercommerce.com/manual/index_files/image043.jpg) — 2003-04-13 | [op2.jpg](https://web.archive.org/web/20060410054823id_/http://www.monstercommerce.com/imgs05/screenshots/lg/op2.jpg) — 2006-04-10 | Strong: equivalent custom payment method editors with costs, confirmation text and custom input fields. |
| Manage customer records | [image025.gif](https://web.archive.org/web/20021110193559id_/http://monstercommerce.com/manual/index_files/image025.gif) — 2002-11-10 | [cs1.jpg](https://web.archive.org/web/20060410054728id_/http://www.monstercommerce.com/imgs05/screenshots/lg/cs1.jpg) — 2006-04-10 | Valid but compact: both show customer search results and editable customer records. |

## Reading the comparisons

The 3.x figures come from the [official manual captured December 11, 2002](https://web.archive.org/web/20021211092032/http://www.monstercommerce.com/manual/). Its login illustration explicitly says **MonsterCommerce v3.0**. Other figures have no patch label, so the comparison labels say **3.x**. Their individual archive captures are dated separately in the manifest. The manual HTML, source figure references and neighboring explanatory text are preserved in the earlier software research and `manual-image-context.json`.

The 4.x originals were published in the official website’s software screenshot gallery. Most show **v4.1.1.0b** in the original footer. Orders and customers show **v4.1.5.0**. The product editor has no version footer in its captured viewport; it is conservatively labeled **4.x**, with its official screenshot-series provenance. Image captures resolve to April 10, 2006 even where the referring page was captured in 2005.

## Crop instructions

`matches.json` contains repo-relative paths and crop rectangles in **original source pixels**, `[x, y, width, height]`. Every rectangle was checked against the source image dimensions. The image contents were visually inspected before matching.

- `crop` is the recommended comparable application area. Period browser title bars, toolbars and status bars are excluded from 4.x crops.
- `applicationCrop` preserves the wider application shell where useful. Original 3.x manual figures often contain only the functional panel, so using their entire source image is intentional.
- Keep the original numbered callouts in 3.x figures; they are historical training annotations.
- Use letterboxing or whitespace to accommodate differing proportions. Do not stretch or fill missing UI, and do not hide a source’s natural viewport cutoff.
- Product Editor 4.x ends at the original viewport; it is not a complete long-page capture.
- Customer Records 3.x is only a single-result strip, **620×100**. The corresponding 4.x recommendation includes search controls and the first result. It should be secondary to the richer seven comparisons.

## Screen-state differences

- **Orders list:** Different sample orders; 3.x includes an open order-navigation menu and original numbered callouts. Both crops preserve the application shell while excluding browser chrome.
- **Find and manage products:** 3.x uses a filtered jewelry search, 4.x an unfiltered electronics list. The data differs but this is the same product-management function. 4.x crop omits navigation/browser chrome to correspond to the original 3.x panel figure.
- **Edit a product:** 3.x shows a jewelry product; 4.x shows a home-theater system. The latter has a dedicated category assignment area. 4.x original ends at a vertical viewport cutoff, and is not a full page.
- **Manage inventory quantities:** 3.x has original training callouts; 4.x adds more filtering controls. Both crops preserve the application context without period browser chrome.
- **Edit product categories:** 3.x shows several categories together; 4.x shows a selected category and its children. This is a real interface-organization change, not the same selected state.
- **Edit the storefront header HTML:** 3.x label: Home Page Header HTML Editor; 4.x label: Top of Page HTML Editor. The 3.x example is blank placeholder HTML; 4.x has saved markup and a WYSIWYG option.
- **Configure custom payment methods:** 3.x shows one Credit Card method plus an add form; 4.x shows Account Number and Credit Card methods. Field layout and configuration differ; these are the same feature.
- **Manage customer records:** The recovered 3.x figure is only a single-result strip, so the 4.x crop contains its search controls and first result. Avoid presenting this as a complete 3.x Customer Manager page. Lower-priority comparison because of the small source.

## Additional originals and excluded pairs

- `image055.gif`: 3.x Edit Products landing controls and search form. Useful alternate view of the same product-management function; the more visually informative search-results figure `image086.jpg` is the selected primary.
- `image045.jpg`: 3.x Bank of America online gateway configuration. The preserved 4.x screenshot shows the Online Payment Manager with no gateway enabled, so it was left out of the eight stronger pairs.
- Admin login is not paired: the preserved 4.x `cs2.jpg` is a **storefront/customer login**, not the merchant administration login. A matching 4.x admin login was not recovered in this pass.
- No unsupported 4.x dashboard substitute was selected.

## Files

- `matches.json`: final eight feature-pair mappings and complete provenance.
- `build-matches.py`: reproducible manifest and bounds validation.
- `image025.gif`, `image043.jpg`, `image045.jpg`, `image048.jpg`, `image050.jpg`, `image055.gif`, `image061.jpg`, `image086.jpg`, `image095.jpg`: newly recovered native 3.x figures.
- Corresponding `.headers` files record redirects, actual capture timestamps and original HTTP metadata.
- `additional-downloads.json`: recovery outcomes for the second group; the customer search-controls figure `image023.gif` remained unavailable.
- `manual-figure-cdx.json` and `manual-image-context.json`: discovery evidence.

No composite images were created, no original screenshots were changed, and no production files were edited. Network Solutions third-generation matches are handled separately.


---

# Network Solutions application comparison sources

Researched 2026-10-01. One exact feature match recovered for the MonsterCommerce 3.x → 4.x → Network Solutions comparison. Original page pixels are preserved; no UI reconstruction or enhancement was applied.

## Header / HTML editor — verified match

- Source: [Ecommerce Help Manual, Network Solutions](https://www.yumpu.com/en/document/view/354016/ecommerce-help-manual-network-solutions), printed page **298**, viewer page **74**.
- Original image: [Yumpu page JPEG](https://img.yumpu.com/354016/74/1238x1600/ecommerce-help-manual-network-solutions.jpg?quality=80), saved as `printed-298-header-footer.jpg` (actual size **1236 × 1600**).
- Feature crop: **[146,145,954,565]**. This contains the title, Manage Header editor, View HTML control, nsScript dropdown, WYSIWYG toolbar and preview content.
- Complete application figure crop: **[146,145,954,1079]**. This also includes the Manage Footer editor and Save / Save & Return / Cancel & Return buttons.
- `matches.json` supplies the root compositor's exact schema and source checksum.
- Date is the manual's **2009 copyright**, not a browser replay date. Yumpu lists **2012-07-29** as its upload date. The screenshot's exact creation date is unknown.
- Version is **7.x family**, based on its shared 2009 manual and the explicit **Pro E-Commerce 7.3.2.0** dashboard on printed page 323. The header-editor image itself does not display a patch version, so it is not labeled 7.3.2.0.
- The source includes a View HTML button; it is pictured in WYSIWYG mode. This is the same header-customization function as the earlier MonsterCommerce Top of Page HTML Editor, with a different editor view.

## Other requested features

Orders, product list, product editor, inventory, categories, customers and custom payments are not represented by part 3 (printed pages 225–344). A similarly named Product List Design screen in part 3 configures storefront layout and is not a product-management screen; it was intentionally excluded from those feature comparisons.

The [part 1 mirror](https://manualzilla.com/doc/5857483/ecommerce-help-manual--1-of-3-) and [part 2 mirror](https://manualzilla.com/doc/5720495/ecommerce-help-manual--2-of-3-) have searchable transcripts. Part 2 begins on printed page 105, and includes category manager instructions on 109, category details on 110–111, and later product-management instructions. Image/PDF retrieval was unavailable behind the site's human-verification challenge. The [Yumpu publisher catalog](https://www.yumpu.com/user/networksolutions) lists seven documents, including only part 3 of this manual. No substitute screenshot was fabricated or inferred from the transcripts.

## Files

- `printed-298-header-footer.jpg`: unchanged original manual page image.
- `matches.json`: exact crop rectangles and source/version/date metadata.
- `yumpu-part3.json`: public Yumpu document metadata (document 354016).
- Failed HTTP probe files, when retained, are diagnostic only and are not assets.
