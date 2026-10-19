x# Design context

StudioHub serves Vietnamese renters, studio operators, and administrators. Practical, calm, trustworthy, modern. Warm minimal marketplace; restrained operational dashboards. Search first, generous studio photography, visible pricing units, compact action queues, readable tables.

Tokens: background #FAFAF9, foreground #18181B, primary #C2410C, accent #F97316. White surfaces, neutral borders, charcoal navigation. Green for recorded successful states, dark red for destructive actions. Orange is reserved for primary actions. Focus rings use primary with visible offset.

Be Vietnam Pro with Vietnamese glyph support, 16px body, 14px labels, tabular figures. Four-pixel spacing rhythm. Standard corners 6px. Minimal shadows, no gradients, no invented metrics or testimonials. Real seed-derived figures only.

Marketplace: search-led header, photo categories, compact featured rooms, horizontal search results. Detail: mosaic, content hierarchy, sticky availability card. Dashboards: neutral selected navigation, studio context, compact four-value overview, meaningful work queues.

Responsive: 360/390/768/1024/1440px. Single-column mobile cards, Radix mobile drawers and bottom sheets, safe-area spacing for booking actions. Tables explicitly scroll. Dialogs trap and restore focus. Reduced motion respected.

Impeccable was searched in the project, user skills, plugin cache, and adjacent known skill locations; no installed Impeccable package or supported command was found. No invocation claimed. Equivalent manual critique/audit/polish passes are recorded in docs/DESIGN-REVIEW.md.

## Tokens and typography

CSS custom properties in `src/app/globals.css` supply surface, border, muted text, primary and destructive colors. White surfaces sit on the warm off-white background. The orange primary has readable white button text; success and warning labels use restrained light backgrounds with dark text. State is always expressed with text as well as color.

Typography uses locally bundled Be Vietnam Pro at weights 400, 500, 600 and 700. Font files include Vietnamese subsets. Body copy is 16px with comfortable line height; dashboard metadata can be 12–14px. Main headings are compact enough for mobile Vietnamese phrases. Monetary and operational figures use tabular numerals. Spacing follows a four-pixel rhythm with 16–32px section padding, clear group boundaries and six-pixel surface corners.

## Components and interaction

Shared primitives live in `src/components/ui/`; features reuse Button, Input, Select, Textarea, Dialog, Sheet, Drawer, Menu, Popover and ChartContainer. The Radix-backed overlays handle keyboard focus, Escape and restoration. Field associates labels, hints and inline errors. ErrorSummary focuses a failed form summary. PriceBreakdown, StatusBadge, StudioImage, EmptyState, ConfirmDialog and DataTable unify behavior across roles.

Buttons distinguish one primary action from outline and text actions. Destructive actions require a concrete confirmation, and reasoned exceptions retain a timeline and audit record. Forms show loading states, protect unsaved edits and preserve entered data after validation failures. Toasts announce mutations, pause while hovered/focused and leave errors visible until dismissed. Broken images show a neutral, readable fallback rather than a remote random replacement.

## Marketplace and workspaces

The marketplace prioritizes a real search form and original room photography. Filters live in the URL, including pagination and sorting. Search results are descriptive room cards with area, capacity, type, location and an explicit rental unit. The detail page has a photo mosaic, accessible gallery, included amenities, optional equipment, actual rates, rules, contact details and an interval-based availability card.

The booking wizard reduces the task to time, equipment and confirmation. The summary shows every price change and the distinction between deposit and balance. Customer order cards and detail pages use the same lifecycle labels as host/admin pages. Payment result language explicitly distinguishes successful simulated payment from host confirmation.

Workspaces use a neutral sidebar, contextual studio selection and restrained horizontal KPI groups. Host overview surfaces pending confirmation and ended rentals requiring manual completion before an agenda. Admin overview surfaces applications and exceptional-action orders. Tables favor readable text, sorting and labeled scrolling over ornamentation. Analytics charts are simple and include expandable value tables.

## Responsive rules

Desktop marketplace content uses a bounded container; detail and booking summaries become sticky beside the primary content. Below the desktop breakpoint, search filters use a sheet, navigation uses a drawer, search cards stack, the calendar exposes a grouped day agenda and the booking summary becomes an expandable bottom control. Safe-area and bottom padding keep sticky controls clear of the final content. Dense tables remain in explicit keyboard-focusable scroll regions instead of forcing page overflow. Reduced-motion users receive no required animation.

The rendered review and exact evidence are recorded in [docs/DESIGN-REVIEW.md](docs/DESIGN-REVIEW.md). Original image provenance is recorded in [docs/ASSETS.md](docs/ASSETS.md).
