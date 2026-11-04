# Frontend implementation plan

1. Repair committed frontend merge conflicts and eliminate references to the incompatible frontend architecture by restoring routes to the existing Application shell.
2. Keep API configuration centralized. API mode is the default; browser-only demo requires `NEXT_PUBLIC_DEMO_MODE=true`. Keep sessions separate and expire them explicitly.
3. Implement API-backed auth/profile, discovery/detail, availability/quote/create, booking lifecycle and sandbox payment using the current components/design.
4. Connect host resource management, calendar, reports and admin account management to existing endpoints. Display backend scope limitations on unsupported pages.
5. Add meaningful frontend contract/timezone tests, run existing domain/helpdesk tests, typecheck, lint, build and browser smoke checks when tools permit.
6. Document exact verification results, setup, API usage and backend blockers. Confirm zero backend diff. Do not commit.
