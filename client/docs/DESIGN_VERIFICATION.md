# Design documentation verification

Historical verification of the earlier monochrome implementation. Current user-approved identity and checks: [RISOGRAPH_REDESIGN_REPORT.md](RISOGRAPH_REDESIGN_REPORT.md).

Verified 2026-10-25. Scope: documentation extracted from the implemented StudioBlank visual identity. No application source, imagery or original reference file was changed by this documentation pass.

## Evidence and reconciliation

- src/app/globals.css supplies palette custom properties, 14px body type, heading overrides, square controls, borders, transitions, focus, breakpoints and reduced-motion behavior.
- src/app/layout.tsx imports local Inter Latin/Vietnamese weights and IBM Plex Mono Latin 400. Mono inherits its size; room-card prices currently use Inter. Documentation records these limits without changing the approved pairing.
- src/components/ui.tsx supplies RoomCard and native dialog behavior; application.tsx supplies public/mobile navigation; marketplace.tsx supplies hero and search composition.
- Root DESIGN.md now records actual hero fluid sizing/weight and mobile override; heading line height/tracking; body/small sizes; 1440px container; gutter/filter breakpoints; section rhythm; 46px default and 40px compact button minima; transparent secondary buttons; semantic status grounds; motion and focus. Removed unobserved 128px and 96px spacing entries and recorded actual section/gap values. Removed the redundant caption token in favor of the shared small-text role.
- Google rejects clamp() in frontmatter dimensions. The hero token stores its observed 72px ceiling; prose and typography metadata preserve clamp(48px, 5.1vw, 72px) and the 45px mobile override. Secondary button backgroundColor is omitted because transparent background causes a false contrast warning: its exact ground and hover are in the snippet. Status border colors remain in snippets because frontmatter component properties do not support borders.

## Sidecar

.impeccable/design.json uses schemaVersion 2 and extends frontmatter with metadata, without duplicate primitive token arrays. Seven scoped framework-free examples cover primary/secondary buttons, labeled field, confirmed/pending statuses, public navigation and room row. State CSS preserves actual hover/focus behavior; noninteractive statuses have no invented interaction states. No special pressed style is invented.

The room row embeds existing public/images/daylight.jpg bytes as a data URI, avoiding an external image dependency. Copy is explicitly illustrative. Fonts and custom properties inherit from the host application as required by the sidecar contract. Four breakpoint names preserve max/min direction. Empty shadows, northStar, keyCharacteristics and named rules reflect the approved document; no new metaphor or doctrine was invented.

Each frontmatter color has an eight-step OKLCH ramp derived from its hue/chroma. These synthesized panel-preview strips satisfy the documenter requirement; they are not additional application tokens or approved UI colors.

## Checks

- Cached official @google/design.md 0.4.0 CLI command: node C:/Users/Admin/AppData/Local/npm-cache/_npx/9cb06364208d5c89/node_modules/@google/design.md/dist/index.js lint DESIGN.md. Final exit 0: 0 errors, 0 warnings, 1 informational token summary (10 colors, 7 typography scales, 1 rounding level, 8 spacing tokens, 6 component token groups).
- Parsed sidecar and checked schemaVersion, component kinds, required snippets and absence of framework className/Tailwind runtime dependencies.
- Rendered seven snippets in Chromium shadow roots with actual root color variables. All controls/surfaces had 0px radius and no box shadow; primary/secondary/input/status colors matched source; embedded photo loaded. Keyboard focus produced 2px outline and 3px offset. Reduced motion produced 0s transitions. At 390px the room row became block layout.
- npm-exec waited on package lookup; direct invocation of the cached official CLI completed validation without adding dependencies.

## Review scope and limits

The independent final reviewer reported Ship after named fixes were resolved at the targeted verdict-pass scope. This is not an exhaustive audit claim. Parent verification reported production browser checks with 61 screenshots and errors[], 34 passing domain tests, and successful typecheck, lint and production build. Those application checks belong to the parent workflow and were not repeated for documentation-only changes.

Snippets document visuals, not routing, mobile-menu runtime, booking calculations or modal interaction. Existing demo/security/payment/backend limits remain those in PRODUCT.md. Compact source buttons are 40px; documentation does not claim all controls meet a 44px target. Original docs/references files remain intact.
