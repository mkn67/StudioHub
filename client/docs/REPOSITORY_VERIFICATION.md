# Repository verification — 27 October 2026

Verified on Windows with Node.js 24.21.0 against the current frontend rewrite.

- `npm.cmd ls --depth=0`: dependencies resolve without missing or invalid packages.
- `npm.cmd run lint`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd test`: 34 passed, zero failures. The sandbox prevented `tsx` from querying Windows account information; the same command passed outside the sandbox.
- `npm.cmd run build`: passed; production server started on port 3001.
- `node scripts/production-qa.mjs`: passed with zero browser errors. Covers responsive public pages, booking validation, payment simulation, persistence after refresh, cancellation/refund state, Admin approval, Host pages, mobile filters and lightbox behavior.
- `npm.cmd audit --omit=dev --audit-level=high`: zero vulnerabilities reported at verification time.
- Git diff checks passed with Markdown hard line breaks allowed. Original reference documents retain their intentional trailing double spaces.

The QA runner now waits for finite animations before resizing the viewport, avoiding Chromium ViewTransition snapshot cancellation during responsive checks.

Docker Compose uses Node.js 24 and explicitly binds the frontend to `0.0.0.0` inside its container. Docker and PHP executables are unavailable on this machine, so container startup and PHP/MySQL tests were not run. The frontend remains an independent localStorage demo; these checks do not verify API integration, real payments or production authorization.

Locally installed agent tools, machine consent/cache files, browser artifacts and environment secrets are ignored. Shared design metadata and source documents remain versioned.
