# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

RideShare PK — a functional Uber/Careem-style ride-booking prototype for Pakistan. One backend serves a **Rider**, **Driver**, and **Admin** (agency owner) app. Two trip kinds: **within-city** (landmark → landmark, dispatched immediately) and **city-to-city** (intercity, scheduled with a pickup date/time). Fares are in PKR. Everything requiring a paid/real integration (geocoding, payments, GPS, SMS) is **mocked** — but the full ride lifecycle works end-to-end with a simulated real-time driver.

## Commands

Run from the repo root (npm workspaces):

```bash
npm install                       # install all three workspaces
npm run db:setup                  # push schema to Turso + seed demo users (idempotent, non-destructive)
npm run dev                       # start server (:4000) and web (:5173) together via concurrently
```

Per-workspace (use `-w server` / `-w web`):

```bash
npm run dev -w server             # API only: tsx watch src/index.ts
npm run dev -w web                # web only: vite
npm run build -w web              # tsc -b && vite build
npm run db:seed -w server         # upsert demo accounts (non-destructive)
npm run db:reset -w server        # DESTRUCTIVE: wipe users/rides/ratings, re-seed clean demo
npm run db:push -w server         # push Prisma schema to Turso (prisma/turso-push.ts)
npm run prisma:generate -w server # regenerate Prisma client after schema.prisma changes
```

There is **no test suite and no linter**.

## Environment

### `server/.env` (required)
```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=...
DATABASE_URL="file:./dev.db"     # Prisma CLI only, not used at runtime
JWT_SECRET=...                   # falls back to hardcoded prototype secret
PORT=4000
CLERK_SECRET_KEY=sk_test_...     # required for Google sign-in
```

### `web/.env.local` (required for Google sign-in)
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### `server/.env` (optional email)
```
BREVO_API_KEY=...                # HTTP email via Brevo; omit to skip email sending entirely
BREVO_FROM=you@example.com
```

## Architecture

Three npm workspaces:

- **`packages/shared`** (`@uber-clone/shared`) — single source of truth for both server and web. Holds shared TS types (`Ride`, `RideStatus`, `UserPublic`, `AdminStats`, `LatLng`) and fare/distance math (`estimateFare`, `haversineKm`). Fare constants (base/per-km/per-min in PKR, road factor, avg speed, tier multipliers) live here. Change fare logic here only, never duplicate it.
- **`server`** — Express REST + Socket.IO, single process. `src/index.ts` wires the HTTP server, Socket.IO, and routes. `src/routes.ts` is the entire REST API (`buildRoutes(io)`). `src/services/simulator.ts` is the mocked-GPS driver movement engine.
- **`web`** — React 18 + Vite + TS + Tailwind SPA. `src/app/App.tsx` does role-based routing: `/rider`, `/driver`, `/agency-owner` each gated on `user.role`. Three feature apps under `src/features/{rider,driver,admin}`. Leaflet map lives only in `src/components/MapView.tsx`.

### Auth

Two layers work together:

**Clerk** (`server/src/clerk.ts`, `web/src/features/auth/ClerkAuthButtons.tsx`): the primary auth path. The login page shows **"Sign in with Google"** and **"Sign up with Google"** only — no email/password form in the UI. When Clerk isn't configured, the app won't show a login UI at all for new users.

- `VITE_CLERK_PUBLISHABLE_KEY` (web) + `CLERK_SECRET_KEY` (server) must both be set.
- After Google sign-in, `ClerkBridge` (`web/src/lib/auth.tsx`) exchanges the Clerk session token for an app JWT via `POST /auth/clerk`.
- First-time Clerk users hit an onboarding screen to pick role (Rider/Driver) and vehicle.
- `server/src/clerk.ts`: trusts OAuth-authenticated emails without extra verification (`user.externalAccounts.length > 0`). Email/password Clerk accounts still require email verification.
- Clerk users are stored in the DB with `password: "clerk:<uuid>"`.

**Mock JWT** (`server/src/auth.ts`): used by demo accounts (login/register via `POST /auth/login` and `POST /auth/register`). Passwords in the DB are bcrypt-hashed (`$2...`); legacy plaintext rows are lazily upgraded to bcrypt on first login. `requireAuth` reads `Authorization: Bearer <token>`; `requireAdmin` additionally checks `role === 'ADMIN'`. All `/api/admin/*` routes are guarded server-side.

Token is stored in **`sessionStorage`, not `localStorage`** (`web/src/lib/api.ts`) — deliberately per-window so rider and driver can run in separate tabs simultaneously.

### Data flow / real-time model

The ride lifecycle drives everything:

```
SEARCHING → DRIVER_ASSIGNED → EN_ROUTE_TO_PICKUP → ARRIVED → IN_PROGRESS → COMPLETED   (or CANCELLED)
```

- **Matching**: on `POST /api/rides`, the ride is emitted (`ride:request`) to every online driver's personal room; first driver to `POST /rides/:id/accept` wins (a second accept 409s because status is no longer `SEARCHING`).
- **Socket rooms**: each connected user joins `user:<id>` (from the JWT in the socket handshake). Clients also `emit('ride:join', rideId)` to join a per-ride room for live tracking. Key events: server→client `ride:request`, `ride:assigned`, `ride:status`, `driver:location`; client→server `ride:join` / `ride:leave`.
- **Driver simulation** (`simulator.ts`): after accept, `beginEnRoute` interpolates the driver marker from ~1.5km away to the pickup along a straight line, emitting `driver:location` every ~1.5s, then auto-transitions to `ARRIVED`. When the driver taps Start (`POST /rides/:id/start`), `beginTrip` drives pickup→dropoff and auto-transitions to `COMPLETED`. Simulator state is **in-memory** (`active` Map keyed by rideId) — does not survive a server restart.

### Database

Turso (cloud libSQL) accessed via Prisma's driver adapter (`server/src/db.ts` → `PrismaLibSQL`). The `datasource url` (a local sqlite file) in `server/prisma/schema.prisma` is used **only by the Prisma CLI** for `generate`/`migrate diff` — runtime always talks to Turso via `TURSO_DATABASE_URL`. Schema is pushed with `db:push` (`prisma/turso-push.ts`), not `prisma migrate`. Models: `User`, `Ride`, `Rating`. `role` is a plain string column (`"RIDER" | "DRIVER" | "ADMIN"`), not a Prisma enum. `clerkId` on `User` is optional (null for demo accounts).

### Web ↔ server wiring in dev

Vite proxies `/api` → `http://localhost:4000` (`web/vite.config.ts`), so REST calls use a relative `/api` base (`web/src/lib/api.ts`). The **Socket.IO connection is hardcoded to `http://localhost:4000`** (`web/src/lib/socket.ts`), bypassing the proxy.

In production (Railway), the web build is served as static files by the same Express server, and the Socket.IO URL comes from `VITE_SERVER_URL` env var.

### Mocked locations

No geocoder — `web/src/lib/locations.ts` holds a seeded list of Pakistani `CITIES`, each with a center anchor and landmark `places`. Within-city trips pick two `places` in one city; city-to-city trips pick a landmark in the origin and destination cities.

## Where to swap mocks for real providers

- **Maps/geocoding**: `web/src/components/MapView.tsx` (tiles/markers) and `web/src/lib/locations.ts` (place list).
- **Payments**: `PaymentScreen` in `web/src/features/rider/RiderApp.tsx`.
- **Real GPS**: replace `server/src/services/simulator.ts`; keep the `driver:location` socket contract so the client is unchanged.
- **Email**: `server/src/services/mailer.ts` — currently Brevo HTTP API. Railway blocks all outbound SMTP ports (465, 587), so only HTTP-based email APIs work in production.
- **DB (e.g. to Postgres)**: change the Prisma `datasource` and swap the adapter in `server/src/db.ts`.

## Demo accounts

Password is `password` for all. Riders: `alice@rider.com`, `bob@rider.com`. Drivers: `dan@driver.com`, `eve@driver.com`, `sam@driver.com`. Admin: `admin@rideshare.com` → `/agency-owner` dashboard (all rides / pending / completed / users / overview, auto-refreshing). Demo accounts bypass Clerk — they use the mock JWT path directly. To test with demo accounts, use the browser console or API directly since the UI only shows Google sign-in buttons.
