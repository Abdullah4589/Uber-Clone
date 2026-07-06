# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

RideShare PK — a functional Uber/Careem-style ride-booking prototype for Pakistan. One backend serves a **Rider**, **Driver**, and **Admin** (agency owner) app. Two trip kinds: **within-city** (landmark → landmark, dispatched immediately) and **city-to-city** (intercity, scheduled with a pickup date/time). Fares are in PKR. Everything requiring a paid/real integration (geocoding, payments, GPS, SMS, auth hashing) is **mocked** — but the full ride lifecycle works end-to-end with a simulated real-time driver.

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

There is **no test suite and no linter** — the README explicitly notes no tests / no security hardening by design.

## Environment

`server/.env` must contain `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (the app throws on startup without the URL — see `server/src/db.ts`). Optional: `PORT` (default 4000), `JWT_SECRET` (falls back to a hardcoded prototype secret).

## Architecture

Three npm workspaces:

- **`packages/shared`** (`@uber-clone/shared`) — the single source of truth imported by both server and web. Holds shared TS types (`Ride`, `RideStatus`, `UserPublic`, `AdminStats`, `LatLng`) and the fare/distance math (`estimateFare`, `haversineKm`). Fare constants (base/per-km/per-min in PKR, road factor, avg speed) live here so both sides agree. Change fare logic here, never duplicate it.
- **`server`** — Express REST + Socket.IO, single process. `src/index.ts` wires the HTTP server, Socket.IO, and routes. `src/routes.ts` is the entire REST API (`buildRoutes(io)` — routes get the `io` instance to emit socket events). `src/services/simulator.ts` is the mocked-GPS driver movement engine.
- **`web`** — React 18 + Vite + TS + Tailwind SPA. `src/app/App.tsx` does role-based routing: `/rider`, `/driver`, `/admin` each gated on `user.role`. Three feature apps under `src/features/{rider,driver,admin}`. Leaflet map lives only in `src/components/MapView.tsx`.

### Data flow / real-time model

The ride lifecycle drives everything:

```
SEARCHING → DRIVER_ASSIGNED → EN_ROUTE_TO_PICKUP → ARRIVED → IN_PROGRESS → COMPLETED   (or CANCELLED)
```

- **Matching**: on `POST /api/rides`, the ride is emitted (`ride:request`) to every online driver's personal room; first driver to `POST /rides/:id/accept` wins (guarded server-side — a second accept 409s because status is no longer `SEARCHING`).
- **Socket rooms**: each connected user joins `user:<id>` (from the JWT in the socket handshake). Clients also `emit('ride:join', rideId)` to join a per-ride room `<rideId>` for live tracking. Key events: server→client `ride:request`, `ride:assigned`, `ride:status`, `driver:location`; client→server `ride:join` / `ride:leave`.
- **Driver simulation** (`simulator.ts`): after an accept, `beginEnRoute` interpolates the driver marker from ~1.5km away to the pickup along a straight line, emitting `driver:location` every ~1.5s, then auto-transitions to `ARRIVED`. When the driver taps Start (`POST /rides/:id/start`), `beginTrip` drives pickup→dropoff and auto-transitions to `COMPLETED`. Simulator state is **in-memory** (`active` Map keyed by rideId) — it does not survive a server restart, though ride rows in the DB do. `startedAt` is set at IN_PROGRESS, `completedAt` at COMPLETED.

### Auth

Mock JWT (`server/src/auth.ts`). Login compares **plaintext** passwords. `requireAuth` reads `Authorization: Bearer <token>`; `requireAdmin` additionally checks `role === 'ADMIN'`. All `/api/admin/*` routes are guarded server-side. On the web side the token is stored in **`sessionStorage`, not `localStorage`** (see `web/src/lib/api.ts`) — deliberately per-window so you can run a rider in one window and a driver in another without their tokens clobbering each other.

### Database

Turso (cloud libSQL) accessed via Prisma's driver adapter (`server/src/db.ts` → `PrismaLibSQL`). Important quirk: the `datasource url` (a local sqlite file) in `server/prisma/schema.prisma` is used **only by the Prisma CLI** for `generate`/`migrate diff` — runtime always talks to Turso via `TURSO_DATABASE_URL`. Schema is pushed with `db:push` (`prisma/turso-push.ts`), not standard `prisma migrate`. Models: `User`, `Ride`, `Rating`. `role` is a plain string column (`"RIDER" | "DRIVER" | "ADMIN"`), not a Prisma enum.

### Web ↔ server wiring in dev

Vite proxies `/api` → `http://localhost:4000` (`web/vite.config.ts`), so REST calls use a relative `/api` base (`web/src/lib/api.ts`). The **Socket.IO connection is hardcoded to `http://localhost:4000`** (`web/src/lib/socket.ts`), bypassing the proxy.

### Mocked locations

No geocoder — `web/src/lib/locations.ts` holds a seeded list of Pakistani `CITIES`, each with a center anchor and landmark `places`. Within-city trips pick two `places` in one city; city-to-city trips pick a landmark in the origin and destination cities.

## Where to swap mocks for real providers

- **Maps/geocoding**: `web/src/components/MapView.tsx` (tiles/markers) and `web/src/lib/locations.ts` (place list).
- **Payments**: `PaymentScreen` in `web/src/features/rider/RiderApp.tsx`.
- **Real GPS**: replace `server/src/services/simulator.ts`; keep the `driver:location` socket contract so the client is unchanged.
- **DB (e.g. to Postgres)**: change the Prisma `datasource` and swap the adapter in `server/src/db.ts`.

## Demo accounts

Password is `password` for all. Riders: `alice@rider.com`, `bob@rider.com`. Drivers: `dan@driver.com`, `eve@driver.com`, `sam@driver.com`. Admin: `admin@rideshare.com` → `/admin` dashboard (all rides / pending / completed / users / overview, auto-refreshing).
