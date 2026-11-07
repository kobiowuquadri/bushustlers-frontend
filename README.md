# Bushustlers web app

Next.js 16 (App Router, React 19, Tailwind 4) frontend for Bushustlers: the public website, merchant dashboard and buyer checkout. It talks only to the Bushustlers API (`../bushustler-backend`).

## Run it

```bash
pnpm install
cp .env.example .env.local     # BACKEND_URL = the API, e.g. https://bushustlers-backend.onrender.com or http://localhost:5000
pnpm dev                       # http://localhost:3000
```

`/api/v1/*` is proxied to `BACKEND_URL` by a rewrite in `next.config.ts`, so the API's HttpOnly session cookies are first-party and no API host or secret appears in browser code. `BACKEND_URL` is read when `pnpm dev` starts and when `pnpm build` runs (rewrites are compiled into the build): restart/rebuild after changing it. The API must list this site's origin in its `CORS_ORIGIN`.

Checks: `pnpm lint`, `npx tsc --noEmit`, `pnpm build`.

## What's where

- `app/page.tsx` — website (pricing comes from the API's fee configuration, revalidated hourly)
- `app/(auth)/*`, `app/onboarding` — sign up/in, password reset, email confirmation, business setup
- `app/dashboard/*` — Overview, Orders, Payment links, Transactions, Customers, Settlements, Settings
- `app/pay/[linkId]` — buyer checkout (no account), `…/receipt` — printable receipt
- `app/dev/mailbox` — development-only view of captured emails
- `components/ui.tsx` — shared UI kit (buttons, fields, pills, notices, dialogs, toasts); tokens in `app/globals.css`
- `lib/api.ts` — typed client (CSRF header, single-flight session refresh); `lib/types.ts` — API contracts; `lib/format.ts` — BigInt money formatting

## Deploy (Vercel)

Set `BACKEND_URL` in the project's environment variables (build-time), deploy, then add the site's URL to the API's `CORS_ORIGIN` and `FRONTEND_URL`. `proxy.ts` only redirects visitors without a session cookie away from `/dashboard`; the API enforces authentication on every request.
