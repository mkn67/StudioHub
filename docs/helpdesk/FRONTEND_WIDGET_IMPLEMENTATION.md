# Frontend Helpdesk implementation

## Scope and integration

Baseline: `e5a0ecd`, clean. The sole existing frontend file changed is `client/src/app/layout.tsx`: import HelpdeskWidget and render one instance after Provider. The feature does not consume Provider/store, business mutations, demo auth or private data. No existing page, component, API, package manifest, lockfile, environment or backend file was changed.

## Complete file list

New Helpdesk files under `client/src/features/helpdesk/`:

- `components/HelpdeskWidget.tsx`: persistent launcher/panel, responsive native dialog, visual viewport sizing, scoped GSAP lifecycle, focus/keyboard control, transcript, suggestions, state labels and reset.
- `components/ChatMessage.tsx`: escaped text, reference labels, validated links, independent status result cards, timestamps.
- `components/ChatComposer.tsx`: labeled textarea, IME-safe Enter/Shift+Enter, empty/pending/handoff controls.
- `hooks/useHelpdeskChat.ts`: in-memory messages, deterministic initial greeting, synchronous request guard, timeout/abort cleanup, sanitized errors, handoff pause, conversation limits/reset.
- `services/helpdeskClient.ts`: explicit transport composition point, currently demo only.
- `services/demoHelpdeskAdapter.ts`: deterministic public FAQ routing; no network/persistence/actions.
- `types/helpdesk.types.ts`: transport/message/context/source/result-card contracts, limits, link sanitization.
- `data/demoFaq.ts`: public booking/deposit/cancellation/discovery guidance, actual BP reference labels and suggestions.
- `styles/helpdesk.module.css`: isolated styles using existing cool cyan/ink/canvas tokens, geometric frames, hard-offset shadows, safe-area and responsive layout.
- `tests/demoHelpdeskAdapter.test.ts`: FAQ, unsupported/private/action boundaries, deterministic behavior, abort/input limits and unsafe links.
- `tests/browser-qa.mjs`: Playwright browser verification with existing dependencies; generated results/screenshots go to ignored `.impeccable/review/helpdesk/`.
- `index.ts`: public feature export.

Documentation files: `docs/helpdesk/{PHP_BACKEND_AUDIT,HELPDESK_ARCHITECTURE,FRONTEND_WIDGET_IMPLEMENTATION,NEXT_MILESTONES}.md`.

Existing files changed: `client/src/app/layout.tsx` only (two added lines). PHP backend files changed: **0**. Backend schema changes: **0**. Backend dependency/configuration changes: **0**.

## Behavior and data handling

Desktop: 58px bottom-right launcher and 390px panel, bounded to viewport height; nonmodal native dialog allows ordinary navigation. Mobile under 640px: 54px launcher and near-fullscreen modal panel with native inert background, focus wrapping and Escape/close. The launcher is raised above the existing room booking bar on room detail routes; native business dialogs retain top-layer priority. Widget z-index is below navigation drawer layers. It does not lock page scroll through global CSS or intercept business handlers.

VisualViewport resize/scroll events update panel height/top when the software keyboard changes available space; safe-area insets are respected. Below 520px available height, secondary decorations/suggestions/notes collapse to preserve the transcript and composer. GSAP opening (220ms), closing (160ms) and entrance are scoped with useGSAP and reverted; 140ms CSS message entrances, hover/press feedback and reduced-motion branches avoid infinite motion. Transcript scrolling is local to its scroll container. New assistant text is announced in a separate polite status region; the full log is not repeatedly announced. Text remains selectable; URLs/codes wrap. Desktop dialog does not trap focus, mobile does, and close restores launcher focus when another dialog is not active.

State is retained through normal Next.js Link navigation, close/reopen and role-area route changes. Reload clears the in-memory chat. Xóa clears messages; no persistence exists. The chat never reads or writes application localStorage, dispatches booking/payment commands or sends conversation text externally. Demo copy explicitly states predefined FAQ, no AI/API connection and no ticket/order/money actions. Existing account-restoration support UI is left unchanged.

FAQ policy mapping: booking BP-01/05/11/14–15; payments BP-11/16–19; cancellation BP-22–25; discovery BP-05–09. These are curated summaries, not RAG results. No global 30% cọc rule, blanket refund guarantee, booking status, available date, fake room result or ticket ID is invented. Future source/card payloads are renderable but demo never supplies business cards.

## Running checks

From `client/` on PowerShell:

```powershell
npm.cmd run lint
npm.cmd run typecheck
.\node_modules\.bin\tsx.cmd --test src/domain/*.test.ts src/features/helpdesk/tests/*.test.ts
npm.cmd run build
npm.cmd run start -- --port 3001
# In another terminal:
node src/features/helpdesk/tests/browser-qa.mjs
node scripts/production-qa.mjs
```

Set `HELPDESK_QA_URL` only to an isolated local frontend server if port 3001 is unavailable. Browser scripts use local demo data and do not call PHP. No test stack or package script was added. Windows sandbox may require running tsx outside the sandbox because its Windows user-account query is blocked.

## Replacing transport later

Implement a runtime-validated PHP adapter inside services/ and select it explicitly in helpdeskClient.ts. See HELPDESK_ARCHITECTURE.md for **proposed, currently unavailable** routes. Require a real PHP authentication integration before private lookups; route surface and frontend demo role are not credentials. Add identity-change reset, capabilities/connection readiness, real conversation ownership, ticket confirmation and handoff resume/polling only with verified server contracts. Keep keys and retrieval/tool logic server-side. Do not enable rewrites to missing routes.

## Verification record

Executed on 27 October 2026 with Node.js 24.21.0 and Next.js 16.4.3:

| Check | Actual result |
|---|---|
| `npm.cmd run lint` | Passed after final TypeScript component changes |
| `npm.cmd run typecheck` | Passed; production build also checked the final TypeScript |
| Combined domain + Helpdesk Node/tsx tests | 48 passed, zero failed: 34 existing domain tests and 14 new Helpdesk tests |
| `npm.cmd run build` and production startup | Passed, served locally on port 3001 |
| Helpdesk browser QA | Passed with zero page errors in reduce/no-preference modes; five widths (360/390/768/1024/1440), 390×480 and 390×320 short viewports plus 1024×400 landscape |
| Interaction/privacy checks | Open/close/reopen, welcome, suggestions, empty/Enter/Shift+Enter, bounded messages/reset, unsupported/private/action refusals, local scroll, mobile focus wrapping, focus restoration, business modal/lightbox Escape, room CTA clearance, client navigation persistence, reload reset; no external HTTP requests or localStorage mutation |
| Visual inspection | Reviewed actual 390px and 1440px browser screenshots; final screenshots for all five widths saved under ignored `.impeccable/review/helpdesk/` |
| Protected-path Git diff | `server/`, `database/`, Compose, package.json and package-lock.json unchanged; sole tracked integration diff is two added layout lines |
| Whitespace/conflicts | `git diff --check` passed; new feature/document files separately scanned with no trailing whitespace or conflict markers |

The existing production QA exercised booking/payment simulation, refresh persistence, cancellation/refund state, Admin approval, Host routes and filters. Its first run passed. Later runs, including the final sequential rerun, exited 1 with the sole reported error `lightbox Escape did not close` from the immediate post-keypress count assertion. The new Helpdesk QA independently waits for the existing native dialog to close and passes that check in both motion modes. A separate five-cycle Chromium check observed immediate dialog counts `[1,0,1,0,1]`, followed by successful closure in `[24,17,45,16,15]` milliseconds. This supports a timing-sensitive legacy assertion; the legacy script is **not reported as fully passing**. No existing lightbox or production QA source was modified.

PHP runtime/DB tests remain unverified; Docker client exists but its daemon is unavailable, and PHP/Composer commands are absent. A short browser viewport verifies sizing behavior but cannot substitute for a real iOS/Android software-keyboard test. Browser testing uses Chromium; screen-reader announcements are semantically reviewed, not certified with a physical screen reader. Real transport failure/timeout, private result cards, handoff and server ownership require future contract/runtime tests; they are not claimed verified by demo browser tests.
