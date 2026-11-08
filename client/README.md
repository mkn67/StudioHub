# StudioHub frontend

Next.js App Router frontend for the StudioHub PHP API and Helpdesk.

## Local setup

For the full stack, run `node scripts/setup-docker.mjs`, then `podman-compose --env-file .env.compose up -d --build` from the repository root. Docker Compose works the same way with `docker compose --env-file .env.compose`. Local settings and generated secrets live in `.env.compose`; the production/Aiven `.env` files are left alone. Existing MySQL volumes are preserved.

To run Next.js separately, copy `.env.local.example` to `.env.local` and use:

```dotenv
NEXT_PUBLIC_APP_MODE=rest
NEXT_PUBLIC_API_URL=http://localhost:8000
API_INTERNAL_URL=http://localhost:8000
APP_ORIGIN=http://localhost:3000
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_HELPDESK_MODE=connected
```

`API_INTERNAL_URL` is read only by the Next.js server. Browser requests go to same-origin `/api/rest/*`; the server forwards them to PHP and keeps the JWT in an HttpOnly cookie. The browser does not store or send a bearer token. `NEXT_PUBLIC_API_URL` is only used to render backend-hosted media URLs.

## Vercel configuration

For the deployed frontend, set server-only `API_INTERNAL_URL` to the Render PHP API URL, such as `https://studiohub-jww7.onrender.com`. Set `NEXT_PUBLIC_API_URL` to the same URL for media. Set `APP_ORIGIN` to the exact frontend origins that should be allowed, comma-separated, with no trailing slash. Use the same origin list for `HELPDESK_FRONTEND_ORIGIN` in the Vercel Helpdesk bridge and the Render Helpdesk service. Keep bridge and model API secrets server-side; never add them to a `NEXT_PUBLIC_*` variable.

After changing environment variables, redeploy the frontend. Production and preview deployments have separate variable scopes.

## What is connected

- Customer and Host sign-in, profile refresh, logout, and protected API requests through the same-origin REST proxy.
- Public room search, room details, rates, calendars, booking, and customer booking pages through the PHP backend.
- Host studio, room type, equipment, pricing, booking, reports, and settings pages through the PHP backend.
- Helpdesk conversations use the same HttpOnly account session when one exists and a separate HttpOnly conversation cookie. The widget is hidden in Host and Admin workspaces.

Payment remains a sandbox. Helpdesk answers depend on its configured model gateway and approved business knowledge. A configured gateway key is not a substitute for approving the policy corpus.

## Checks

```sh
npm ci
npm test
npm run lint
npm run typecheck
npm run build
```

See [Backend Integration](docs/BACKEND-INTEGRATION.md) for request routing and deployment variables.
