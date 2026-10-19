# Rendered design review

## Review method

Impeccable was requested, but searches of the repository, installed skills, plugin cache and adjacent known skill locations found no installed skill or executable. It was not invoked. The substitute was an explicit manual critique/audit/polish workflow, with actual Chromium screenshots, interactive browser checks, axe and keyboard verification.

The product uses a warm minimal marketplace and restrained workspaces. Avoided patterns include gradient hero sections, decorative metric cards, invented ratings, testimonials, growth badges, oversized rounded pills and ornamental charts. Photography and search have useful prominence; dashboards emphasize work requiring action.

## Findings and corrections

| Finding                                                   | Correction and evidence                                                                              |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Google font download unavailable                          | Bundled the Vietnamese font locally; screenshots show readable diacritics and consistent weights     |
| Homepage line-break whitespace                            | Corrected the heading text so its accessible name and mobile rendering retain the intended phrase    |
| Booking controls could compete on small screens           | Single mobile summary/continue area, safe-area padding and expandable price detail                   |
| Search dates could suggest inaccurate availability        | Date filter now tests real intervals against reservations and operating hours                        |
| Equipment totals could overcount nonoverlapping orders    | Use peak simultaneous reservations; deterministic boundary tests                                     |
| Controlled dialogs had no trigger-based focus restoration | Capture and restore the originating control; browser gallery and component cancellation checks       |
| Sidebar badges merged with accessible names               | Added separation between labels and counts                                                           |
| Skip link targeted the complete page wrapper              | Move the target onto each real main landmark; keyboard test checks focus skips navigation            |
| Mobile price bar assumed hourly rates                     | Use the shared starting rate and its actual unit; component test changes the room to session pricing |
| Mobile global search hid its text label                   | Added a persistent accessible button name                                                            |
| Reset navigated against the route guard                   | Reload the home destination after reset; confirmed reset browser test passes                         |
| Calendar could hide maintenance time                      | Distinct striped trailing cleaning segment plus text legend and accessible booking labels            |
| Charts need an alternative for nonvisual users            | Readable value tables alongside charts; values come from booking snapshots                           |
| Historical bookings after visibility changes              | Preserve readable snapshots and append reasoned admin/host events                                    |

## Product questions checked in the rendered interface

The final overlay review found that the desktop filter form and mobile sheet reused control IDs. Each filter instance now uses a stable unique React ID prefix. The mobile browser test verifies label lookup inside the sheet, runs axe while it is open, and checks that repeated Tab navigation stays within it. Gallery and account-menu keyboard cycling and focus restoration are also verified.

- Homepage: “Tìm studio, đặt theo giờ.” and the search form appear first; room imagery and priced cards make the purpose clear.
- Price comprehension: every rate includes its unit; booking costs itemize room, equipment, total, simulated deposit and remaining amount. Reference-only units are labeled.
- Availability: users explicitly check an interval and receive a concrete success or conflict message. The wizard rechecks before creation.
- Booking focus: three steps with focused headings, preserved input, equipment stock limits and a persistent summary.
- Payment versus confirmation: payment result says the deposit was simulated and the host must confirm; customer and host screens show the same separate lifecycle.
- Host urgency: actual pending and overdue-completion orders are listed before the seven-day agenda. Metrics use the actual seed/store.
- Admin urgency: pending applications and eligible exceptional orders have direct destinations and required reasons.
- Mobile: single-column marketplace, filter sheet, operational navigation drawer, grouped day agenda, horizontal table regions and appropriately spaced controls.
- Consistency: common typography, borders, six-pixel corners, status badges, fields, dialogs and mutation feedback across all roles.

## Screenshot evidence

The automated responsive run saves homepage, search, detail, booking, host and admin screenshots at 360, 390, 768, 1024 and 1440 pixels under `.studiohub-runtime/screenshots/`. Actual screenshots were opened and visually inspected, including the home desktop/mobile pair, room detail at 360px, host overview at 1440px, admin overview at 360px, the weekly calendar, populated analytics and the complete room editor. Additional editing and populated states are verified through browser interaction tests.

Automated overflow checks cover all five widths. Axe checks cover representative customer, host and admin routes. Visible focus, Escape, focus restoration and keyboard result selection are exercised in component/browser tests. Accessibility automation is a supplement to the manual rendered review, not a claim of formal conformance certification.
