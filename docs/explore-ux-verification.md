# Explore Studio UX verification

The Customer Explore screen keeps the PHP room-search API and existing room data. No schema, pricing calculation, booking, payment, Host/Admin or Helpdesk implementation changed in this task.

## Findings and changes

- The active public navigation link had both a visible `border-bottom` from `globals.css` and `text-decoration` from `editorial.css`. It now uses one 2px text underline with a 6px offset, including on hover. Route matching is preserved and public links expose `aria-current`.
- Connected login/register screens wrapped the entire supporting sentence in a link. Only the action is now linked, cyan, underlined and keyboard focusable; submission/session logic is unchanged.
- Explore rendered its `api-form` and results as successive block siblings, with a 760px form cap. A shared grid now gives filters 280–320px and results the remaining desktop width (1024px+). Tablet stacks a compact two-column form above results; below 768px an accessible toggle collapses filters. Closing preserves draft selections; submitting closes the mobile panel and restores focus to the toggle.
- The native maximum hourly price slider uses 0–2,000,000 VND, step 100,000, default 2,000,000. Its value and cyan fill update immediately; requests still happen on submit. Zero remains an actual zero ceiling. The maximum remains a finite ceiling.
- Applied search state comes from the URL; draft edits do not change results until submission. Submit, pagination, reset and browser history keep results and controls synchronized. Unrelated URL parameters survive. Removed `min_area`/`minArea` parameters are stripped and never sent to the API. Room area remains visible in cards.
- Search requests reuse `GET /api/rooms`, with `keyword`, `space_type_id`, `max_price`, `page`, `limit=12` and explicit `rate_unit=hour`. The existing repository compares minimum active, effective hourly rates and returns the matching hourly `display_rate`. No combo price conversion or endpoint was introduced. There was no existing sort control in this screen.

## Changed source files

- `client/src/app/globals.css` — remove border underline; retain one text underline.
- `client/src/app/editorial.css` — active link color/weight without a second underline definition.
- `client/src/app/explore.css` — scoped Explore layout, cards, slider and auth action styles.
- `client/src/app/layout.tsx` — load the scoped stylesheet.
- `client/src/components/application.tsx` — public navigation semantics.
- `client/src/components/api-accounts.tsx` — separate neutral auth question from action link.
- `client/src/features/marketplace/backend-pages.tsx` — connected Explore form/results structure and state.
- `client/src/services/api/room-search.ts` — URL parsing, request mapping, reset and price formatting.
- `client/src/services/api/room-search.test.ts` — focused URL/filter boundary tests.
- `client/scripts/explore-qa.mjs` — repeatable browser and live API verification.
- `docs/explore-ux-verification.md` — this report.

## Verification

Run from `client/`:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
node scripts/explore-qa.mjs
```

TypeScript, ESLint and production build passed. All 140 unit tests passed, including four new search tests. On this Windows sandbox, `npm.cmd` avoids PowerShell execution-policy restrictions; running the tsx tests required access to Windows user information outside the sandbox.

Browser verification uses the running local frontend and PHP/MySQL backend. It checks single navigation underline including hover/focus, auth action styles/routes/keyboard navigation, slider bounds and keyboard interaction, immediate Vietnamese formatting, no requests during slider edits, real hourly-price boundaries (0 / 100,000 / 1,000,000 / 2,000,000), studio/room name search, category and combined filtering, URL restoration, Back, reset, and removal of invisible area filters.

Loading, retry after an API error, filter preservation on failure, and two-page pagination use controlled browser API responses because the local database has only four rooms. These scenarios do not write database records.

Screenshots are captured at 360, 390, 768, 1024, 1280, 1440 and 1728px in `.tmp/explore-qa/`. Browser assertions check no horizontal overflow, aligned desktop columns, sidebar width, mobile expand/collapse/apply/reset and no uncaught page errors. Screenshots were visually inspected on desktop and mobile.

## Limits

- The requested slider excludes rooms above 2,000,000 VND/hour and rooms without an active comparable hourly rate; 2,000,000 is not an unlimited search.
- Invalid/out-of-range URL prices fall back to 2,000,000. In-range URL prices are rounded to the nearest slider step so the visible control and request use the same value.
- Seed room images use external Unsplash URLs. External image requests are blocked in the QA browser to keep tests independent of that network service; screenshots show their alt text. Original image URLs and cropping remain in place; image availability was not verified.
- Existing customer typography is retained; no Be Vietnam Pro installation was present and no new font dependency was added.

No commit, push or deployment was performed.
