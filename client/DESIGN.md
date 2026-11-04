---
version: alpha
name: StudioHub
description: Cool Neo-Brutalist editorial marketplace — cyan, natural photography, graphic ink frames and hybrid depth.
colors:
  primary: "#0D7490"
  secondary: "#4F7CCB"
  ink: "#20323E"
  neutral: "#F5FAFC"
  brand-soft: "#CFEFF5"
  surface: "#FFFFFF"
  surface-muted: "#E8F1F5"
  surface-subtle: "#F0F7FA"
  muted: "#526575"
  line: "#CEDDE5"
  line-strong: "#7D929F"
  surface-blue: "#E1EAF4"
  brand-text: "#0B657D"
  brand-hover: "#095E76"
  brand-wash: "#E2F3F7"
  inverse-muted: "#FFFFFF"
  success: "#216043"
  success-bg: "#E8F2E9"
  success-border: "#83A38A"
  warning: "#785018"
  warning-bg: "#FFF1CD"
  warning-border: "#B08D48"
  error: "#A02D39"
  error-bg: "#FBEAEC"
  error-border: "#C38A91"
typography:
  hero: {fontFamily: Bricolage Grotesque Variable, fontSize: 80px, fontWeight: 800, lineHeight: 1.02, letterSpacing: -0.035em}
  h1: {fontFamily: Bricolage Grotesque Variable, fontSize: 48px, fontWeight: 800, lineHeight: 1.08, letterSpacing: -0.03em}
  h2: {fontFamily: Bricolage Grotesque Variable, fontSize: 40px, fontWeight: 700, lineHeight: 1.1, letterSpacing: -0.03em}
  h3: {fontFamily: Bricolage Grotesque Variable, fontSize: 25px, fontWeight: 700, lineHeight: 1.2}
  body: {fontFamily: Bricolage Grotesque Variable, fontSize: 16px, fontWeight: 400, lineHeight: 1.65}
  body-operational: {fontFamily: Bricolage Grotesque Variable, fontSize: 14px, fontWeight: 400, lineHeight: 1.6}
  label: {fontFamily: DM Mono, fontSize: 12px, fontWeight: 400, lineHeight: 1.5, letterSpacing: 0.06em}
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 48px
  section: 80px
  mobile-section: 56px
rounded:
  none: 0px
  control: 4px
  panel: 4px
  utility: 8px
components:
  button-primary: {backgroundColor: "{colors.primary}", textColor: "{colors.surface}", rounded: "{rounded.control}", padding: "12px 22px"}
  button-secondary: {backgroundColor: "{colors.surface}", textColor: "{colors.ink}", rounded: "{rounded.control}"}
  button-editorial: {backgroundColor: "{colors.brand-soft}", textColor: "{colors.ink}", rounded: "{rounded.control}"}
  button-destructive: {backgroundColor: "{colors.surface}", textColor: "{colors.error}", rounded: "{rounded.control}"}
  input: {backgroundColor: "{colors.surface}", textColor: "{colors.ink}", rounded: "{rounded.utility}", padding: 12px}
  room-card: {backgroundColor: "{colors.surface}", textColor: "{colors.ink}", rounded: "{rounded.panel}"}
  featured-room: {backgroundColor: "{colors.surface}", textColor: "{colors.ink}", rounded: "{rounded.none}"}
  selected-control: {backgroundColor: "{colors.primary}", textColor: "{colors.surface}", rounded: "{rounded.control}"}
  balance-summary: {backgroundColor: "{colors.brand-soft}", textColor: "{colors.ink}", rounded: "{rounded.panel}"}
  table-header: {backgroundColor: "{colors.surface-muted}", textColor: "{colors.ink}"}
  status-success: {backgroundColor: "{colors.success-bg}", textColor: "{colors.success}", rounded: "{rounded.control}"}
  status-warning: {backgroundColor: "{colors.warning-bg}", textColor: "{colors.warning}", rounded: "{rounded.control}"}
  status-error: {backgroundColor: "{colors.error-bg}", textColor: "{colors.error}", rounded: "{rounded.control}"}
---

# Design System: StudioHub

## Overview

**Cool Neo-Brutalism × Editorial Marketplace × Layered Motion** is the sole active visual direction. Restore strong geometric frames, sharp corners and selective hard offset shadows while keeping the bright cool palette, natural Studio photography, editorial typography and existing motion. Earlier all-soft/all-rounded instructions are superseded; historical reports are not competing authorities.

Preserve every approved layout, Vietnamese label, category pictogram, exact Room Unit identity, navigation, form, handler, domain/data contract and role permission. Business Policy VI v1.1 remains authoritative for behavior. This is a visual correction, not a product rebuild.

## Colors

Frontmatter colors are normative. Main canvas #F5FAFC, white surface #FFFFFF, ink #20323E, Ocean Cyan #0D7490, soft cyan #CFEFF5 and cool neutral #E8F1F5 establish hierarchy. Secondary Blue #4F7CCB supports small editorial details; pale blue #E1EAF4 provides category variety. Cyan remains dominant; blue is not a competing CTA color. Supporting text #526575 remains readable; small brand text #0B657D, hover #095E76 and selected wash #E2F3F7 derive from the same accent. Ink establishes public structural frames; #CEDDE5 and #DFE9EF remain quiet data separators, and #7D929F defines ordinary control boundaries. Ocean Cyan owns primary CTAs, focus and active selection. No neon, competing saturated accent or dark full-page background.

Use solid white for forms, tables, transactional details and financial data. Cyan is a supporting ground for the outstanding balance with large dark numerals; total amounts remain exact and opaque. Categories alternate white, soft cyan, muted blue and cool neutral, with dark pictograms/text. Featured rooms remain white with natural photography. A pale-cyan Host invitation retains the existing composition without a large saturated band.

Preserve independent semantic success #216043/#E8F2E9, warning #785018/#FFF1CD and error #A02D39/#FBEAEC. Booking, payment and refunds keep their distinct written labels and meanings. Cyan never substitutes for a semantic status. Normal text requires 4.5:1, large text/control boundaries/focus 3:1. Verify every state and alpha-composited background.

## Typography

Preserve self-hosted Bricolage Grotesque Variable for display/body, DM Mono for codes, dates and measured metadata, and the local IBM Plex Mono Vietnamese fallback. Hero remains 64–80px desktop and about 42–48px mobile, 800 weight, 1.02 line-height; public H1 40–52px, H2 32–44px, room titles 20–28px and body 15–17px. Operational H1 is 30–34px with 13–14px body. Preserve clean Vietnamese diacritics, balanced line breaks and tracking no tighter than -.04em. Important monetary values use bold display typography and tabular numerals.

## Layout

Preserve the 1440px container and 48/32/20px gutters. Public sections use 80px top spacing on desktop and 56px on mobile; the journey uses 64px internal spacing (40px mobile). Homepage retains photograph-led hero, headline plate, functional search, categories, featured physical rooms, three-step journey and Host invitation. Search retains the 280–300px filter rail and horizontal 40%-image Room Unit rows. Detail keeps mosaic/lightbox, information and sticky booking panel. Wizard remains three steps, desktop dialog and full-screen mobile. Authentication retains the photographed background and centered form. Customer booking rows and financial hierarchy remain intact; Host/Admin keep sidebar, compact KPIs, tables, timetable, Kanban and split approvals.

Verify 360, 390, 768, 1024 and 1440px. Mobile keeps local filter/tab/table/calendar scrolling, full-screen wizard, sticky booking action and drawer access. No document overflow. Sticky navigation uses the shared header-height token; sticky filters, booking panels and operational navigation account for that height. Reduce blur and elevation on mobile rather than shrinking useful text.

## Elevation & Depth

Use distinct brand and functional depth roles. Never stack both families indiscriminately.

| Token | Value | Role |
| --- | --- | --- |
| shadow-hard-sm | 3px 3px 0 #20323E | Public primary buttons and compact brand actions |
| shadow-hard-md | 5px 5px 0 #20323E | Featured cards, category hover and search frame |
| shadow-hard-lg | 7px 7px 0 #20323E | Hero headline and selected editorial promotion |
| shadow-hard-pressed | 1px 1px 0 #20323E | Compressed public primary-button/category state |
| shadow-soft-sm | 0 4px 12px rgba(32,50,62,.07) | Supporting utility surface and KPI group |
| shadow-soft-md | 0 12px 28px rgba(32,50,62,.10) | Dialogs, floating navigation and supporting panels |
| radius-editorial | 0px | Hero, search, categories, featured cards and brand geometry |
| radius-control / radius-panel | 4px | Primary buttons and moderate-intensity Customer panels |
| radius-utility | 8px | Ordinary inputs, utility dialogs and ordinary operational fields |
| blur-surface | 12px desktop / 8px mobile | Selected navigation and search layers |

Border hierarchy: hero/search/category and important interactive frames 2px ink; featured cards 2.5px ink; primary buttons 2px ink; booking/payment primary surfaces 2px ink. Secondary operational panels1–1.5px; dense tables/calendar cells use 1px cool separators. Keep images clipped to existing frames. Search rows have 2px ink frames with no resting hard shadow; only featured/promotional cards receive hard offsets. No shadow per audit row, table cell, calendar event or Kanban card.

### Frosted surfaces

Sticky navigation may use .90-white and the floating hero search .92-white with controlled blur. Both retain an opaque white fallback outside the support query. Search keeps its 2px ink frame. The headline plate is solid white and unblurred, with a 7px hard shadow. Never blur photographs/text themselves or put glass on financial details/dense data. Native dialog content is opaque; its backdrop remains a simple slate alpha overlay. Reduced transparency restores opaque surfaces. Glass supports the geometry and never replaces it.

## Shapes

Public editorial surfaces are square: hero headline, search panel, categories, featured listings and promotional frame. Primary buttons and Customer panels use at most 4px corners. Ordinary inputs and utility dialogs may retain 8px corners; status badges and operational navigation use 4px. No12–16px card system or pill-shaped branding. Full-screen mobile dialogs/drawers remain square. Keep the existing geometric category pictograms and naturally colored photographic frames.

## Components

Primary buttons use Ocean Cyan/white, secondary white/ink with a visible control border, editorial secondary soft cyan/ink, and destructive actions quiet semantic-error borders/text. Controls keep 44–46px touch targets. Public primary buttons have 2px ink borders and 3px hard offsets. Hover moves 1px up/left and expands the hard shadow to 5px; press moves 2px toward the shadow and reduces it to 1px. Secondary buttons stay quieter with thin control borders, soft hover elevation and a 1px downward press without shadow. Operational, payment and destructive actions retain stable positions. Disabled states expose their state without movement.

Room cards use white surfaces and geometric 2px ink frames. Featured cards have 2.5px borders and 5px hard offsets; default search rows remain unshadowed at rest and use only slight soft elevation on hover. Keep a 1.02 photo zoom. Category cards preserve the custom camera, clapperboard, presentation board and studio microphone pictograms, original links/IDs, titles and proportions. Supporting halftone is restrained. My Bookings retains locally scrolling boxed pressed-state filters and real derived counts; active filters use cyan/white with a 2px ink border, inactive white/ink with neutral borders and 4px corners.

Booking/payment summaries use solid white or pale-cyan emphasis, readable separators and large exact amounts. Status, room identity, rental time, payment breakdown and outstanding balance precede secondary details. Cancellation stays recognizable and secondary. Auth/forms remain solid and focused. Native dialogs retain their focus management, validation, callbacks and authentication handoff.

Host/Admin use the quietest interpretation: cool canvas, white working surfaces, subtle soft KPI-group elevation, clear cyan selected navigation with a thin ink frame, and precise tables. No decorative hard shadows in audit/financial tables. Table headers are cool neutral, rows white, hover subtle. Calendar event positions and semantic labels remain exact. Kanban headers keep status meaning and cards remain calm. Audit/financial data never become translucent.

Focus is 2px Ocean Cyan with 3px offset; on colored or photographic controls use an opaque underlying surface and clearly contrasting outline. Keep keyboard navigation, labels, touch targets and reduced-motion handling. Browser caret, selection and scrollbars use the same brand roles.

### Shared motion

GSAP with the official useGSAP hook owns timeline choreography, once-only ScrollTrigger reveals, gallery-image feedback, native dialog/drawer movement, directional booking panels and committed-result opacity. Use scoped refs, cleanup and client-only registration. Existing CSS owns simple hover/press, hard-shadow compression, status colors and backdrop/toast feedback. Native React/browser View Transitions retain page/shared-photo navigation. AnimatePresence only retains exiting DOM and positions outgoing panels; it does not animate DOM opacity or transforms.

Preserve every existing duration/easing token: press120ms, hover160ms, icon/select180ms, dialog-in240ms/out180ms, page240ms, section460ms, card380ms and stagger70ms capped210ms. GSAP CustomEase matches the canonical cubic-bezier(.16,1,.3,1). The labeled hero sequence settles the plate, then copy, search and CTA within540ms. Images/listing frames stay stationary during scroll; section headings carry their reveal and promotional copy receives opacity feedback. Compact category grids reveal one visible row at a time. Ordinary sections/categories use opacity-only reveals with immediateRender:false to limit frame cost; the hero retains spatial choreography. Content remains visible by default and interactions can complete a decorative entrance immediately.

Keep native scrolling; no pinning, scrub, scroll proxy or artificial operation delay. Use gsap.matchMedia for reduced motion and revert contexts/triggers on unmount. Utility scopes subscribe to live reduced-motion changes through useSyncExternalStore; immediate safeToRemove runs in a passive effect after the Presence layout commit. Clear finished inline properties so CSS regains control. Cancel stale image/font callbacks, preserve interrupted overlay poses and keep native focus/scroll locking through exit. Committed results use180ms opacity feedback, operational headings move only3px, and changed gallery images receive240ms opacity/4px feedback after decode. Wizard validation, parent state, exact monetary values and operational calendar coordinates remain unchanged. See docs/ANIMATION_SYSTEM.md and docs/GSAP_MOTION_UPGRADE.md for ownership and verification.

## Do's and Don'ts

### Host/Admin operational variant

For descendants of `.ops-shell` only, [Dashboard Design System](../docs/DASHBOARD_DESIGN_SYSTEM.md) defines the current **Cool Neubrutalist Operations** variant. It supersedes the earlier quiet-only operational styling and 0/4/8px radius restriction in this document for Host/Admin. Customer typography, geometry, tokens and all Helpdesk styling remain governed by their existing rules. Operational panels may use 12–16px corners, selected navigation and KPI cards receive selective hard shadows, and dense calendars/tables remain quiet. Dashboard-only tokens live in `src/features/dashboard/styles/dashboard.css`; do not promote them to `:root`.

The current [workspace typography/shell refinement](../docs/DASHBOARD_TYPOGRAPHY_SHELL_REFINEMENT.md) uses Space Grotesk Variable for Host/Admin UI and Space Mono selectively for references, both self-hosted with Vietnamese subsets. Workspace page titles use 28px/700, not global editorial display weights. The public header is absent from Host/Admin render trees; their own 56px toolbar, sidebar, mobile drawer and account/logout controls provide navigation. Scoped booking semantics are defined in `src/features/dashboard/booking-status.ts`; they never replace Customer, payment, refund or equipment status colors.

No invented claims, metrics, categories or policies. Do not change booking holds/buffers, inventory, pricing, deposits, payment, refunds, rescheduling, check-in/out, no-show, overtime, restrictions or Admin authority. Historical design reports remain explicitly historical. The final build requires actual rendered inspection, relevant checks and documented verification; a clean detector is not a visual review.

### Do

- Do preserve natural photographs, exact physical room identity and clean Vietnamese lettering.
- Do use hard shadows for public identity and soft shadows for functional layering; use the 0/4/8px radius vocabulary.
- Do keep real derived counts, exact amounts, domain behavior and native form/modal semantics.
- Do honor reduced motion, reduced transparency and opaque backdrop-filter fallbacks.

### Don't

- Don't invent claims, metrics, categories or policies.
- Don't restore warm retro grounds, generic rounded SaaS cards, competing dominant blue or pill-shaped branding.
- Don't apply glass to financial, transactional or operational data.
- Don't change booking, payment, inventory, scheduling or role authority through visual work.

### Current Host/Admin refinements

Within `.ops-shell`, [Colored dashboard refinement](../docs/COLORED_DASHBOARD_REFINEMENT.md) defines the current soft color zoning, larger operational typography, tactile primary/secondary buttons, Pricing editor layout and Reports hierarchy. It supersedes earlier white-first operational guidance above. Dense rows/tables stay neutral. [Calendar timetable refinement](../docs/HOST_CALENDAR_TIMETABLE_REFINEMENT.md) specifies exact time geometry, progressive labels and initial viewport behavior. Customer and Helpdesk styling remain separate.
