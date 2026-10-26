# Cobalt × warm mustard refinement

Historical cobalt/mustard refinement, superseded by the latest [Warm Editorial refinement](WARM_EDITORIAL_REFINEMENT.md). Root DESIGN.md is the only active visual authority. The measurements below describe the previous palette.

## Visual decisions

- Cobalt remains the dominant action/selected/featured color. Cream, white and sand remain the main content grounds.
- Warm mustard `#E9B44C` supports small logo dots, selected editorial artwork, text selection and the Host invitation action. Category backgrounds alternate subtle cream, white, cobalt and sand; no broad mustard replacement was applied.
- Hero, featured-room and authentication offsets now use deep navy. Button/card offsets keep their existing geometry and zero blur.
- The hero's duplicated registration lettering was removed entirely. Its existing nowrap emphasis and typography remain, with clean Vietnamese diacritics.
- The large Host-band accent is translucent paper. Mustard stays small and deliberate. Customer financial styling, written statuses and quiet operational content are preserved.
- The former fluorescent ink tokens, colored shadow token, decoration class names and active documentation references were removed. Historical source/reference documents and delivery records remain historical evidence.

## Modified files

| File | Change |
|---|---|
| DESIGN.md | Updated first: canonical mustard palette, navy-only shadow vocabulary, category/CTA color dosage and clean hero lettering |
| src/app/globals.css | One shared mustard token; obsolete fluorescent/colored-shadow primitives removed |
| src/app/risograph.css | Selective editorial treatments, navy major shadows, neutral account/category surfaces and no hero ghost |
| src/components/ui.tsx | Decorative circle class renamed to accent; no event-handler or data changes |
| src/components/marketplace.tsx | Clean hero emphasis class, redundant ghost data attribute removed; all content/actions retained |
| PRODUCT.md | Current brand commitments |
| docs/SURFACE_BRIEF.md | Current palette/dosage and direction contract |
| .impeccable/design.json | Current 21-color metadata, three navy shadow roles and ten live-bound component snippets |
| README.md | Current palette summary |
| docs/RISOGRAPH_REDESIGN_REPORT.md | Earlier delivery explicitly marked historical and linked to this refinement |
| docs/MUSTARD_REFINEMENT.md | This change/verification record |

No dependencies, photos, route handlers, business models, fixtures, repositories or workflows were changed. SHA256 comparison of every src file before/after identifies only the four presentation files listed above. All other source files are byte-identical, including domain/tests/data/store, wizard, bookings, accounts, operations, application router and font configuration.

## Verification

| Check | Result |
|---|---|
| npm.cmd run typecheck | PASS |
| npm.cmd run lint | PASS |
| npm.cmd run build | PASS — production Next.js 16.4.3 build |
| npm.cmd run test | PASS — 34/34 existing domain tests |
| Production browser workflows | PASS — wizard/validation/equipment/review/auth, failed payment/retry, refresh, Host approval, cancellation/separate refund, Admin partner approval, mobile filters/empty/reset, lightbox |
| Responsive capture | Homepage/search/room and key Host views at 360/390/768/1024/1440px; booking/payment/auth/Admin views at desktop/mobile; 68 PNGs retained |
| Computed accent audit | PASS — eight supplemental desktop/mobile observations, no old fluorescent CSS colors, missing tokens, runtime errors or global overflow |
| Category ground audit | Subtle cream, white, cobalt, muted sand; full mustard cards absent |
| Shadow/hero audit | Navy 7px hard offsets on hero/feature, navy auth offsets; hero pseudo-content none |
| Contrast | Navy on mustard 8.96:1; cobalt/white and semantic status pairs unchanged from the preceding verified system |
| Impeccable detector | One explicit source scan: [] findings; no new suppressions |
| Google DESIGN.md lint | Official cached CLI exit 0: zero errors, nine orphaned-token warnings, one informational summary |
| Sidecar | Ten current components, live token references valid, narrative synchronized, original photograph bytes retained |

Local evidence: `.impeccable/review/mustard/` contains source hashes, changed-source list, screenshots, browser results, computed accent observations, detector result and independent finish review. Screenshots await image decoding. Browser state is isolated demo data, not the user's saved browser records.

The nine Google warnings refer to real decorative/border/hover/inverse palette roles that the limited component-frontmatter schema does not reference. They are not invalid CSS or missing UI tokens. No artificial variants were introduced to silence them.

This pass preserves existing behavior; it does not remediate the older functional defects recorded in [POST_IMPLEMENTATION_AUDIT.md](POST_IMPLEMENTATION_AUDIT.md). Browser emulation and scoped color/contrast checks are not an exhaustive accessibility or physical-device certification.
