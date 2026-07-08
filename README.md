# RideShare PK — Ride-Booking Prototype

**Live demo:** https://server-production-d014.up.railway.app/login

A functional **Uber/Careem-style prototype** for Pakistan with a **Rider**, **Driver**, and **Admin** app sharing one backend. Riders can book two kinds of trips:

- **Within-city** — pickup & drop are landmarks inside one city (e.g. Clifton → Airport in Karachi), dispatched immediately.
- **City-to-city** — intercity trips where you choose a **pickup landmark in the origin city** and a **drop landmark in the destination city** (e.g. Clifton, Karachi → Liberty Market, Lahore), plus a **pickup date and time** to schedule the ride.

**Key features:**
- **Real-time geolocation** for automatic pickup detection + manual map selection
- **Live destination search** (OpenStreetMap Nominatim)
- **Ride fare tiers**: BIKE (0.6x), RICKSHAW (0.8x), ECONOMY, COMFORT, PREMIUM with live fare calculation
- **10-second countdown** for driver requests + **5-minute arrival timer** with sound notification
- **InDrive-style fare negotiation** with counter-offers + auto-accept option
- **Clerk authentication** (modern auth) + demo accounts (legacy fallback)
- **Real-time driver tracking** with map visualization
- Web-first, dark mode, map-centric. Fares in **PKR (Rs)**. Everything that would need a paid integration (geocoding, payments, GPS, SMS) is mocked — but the full ride lifecycle works end-to-end.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind (dark mode) |
| Map | Leaflet + react-leaflet + OpenStreetMap tiles; Nominatim reverse geocoding |
| Backend | Node + Express + TypeScript |
| Real-time | Socket.IO (ride rooms for status + live driver location) |
| Database | Turso (libSQL) via Prisma driver adapter |
| Auth | **Clerk** (modern SSO/email) + mock JWT fallback (demo accounts) |
| Geolocation | Browser Geolocation API + Nominatim for address lookup |
| Monorepo | npm workspaces (`packages/shared` holds types + fare logic + tier multipliers) |

## Prerequisites

- **Node.js 18+** and **npm 9+**
- **Turso account** (free tier available at https://turso.tech)

## Environment Setup

Create `server/.env`:
```env
TURSO_DATABASE_URL=libsql://your-db-name-xxxxx.turso.io
TURSO_AUTH_TOKEN=eyJhbGc...your_token...
PORT=4000
JWT_SECRET=your-secret-key-here
```

**Clerk authentication (required for login)**  
Create `web/.env.local`:
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

And add to `server/.env`:
```env
CLERK_SECRET_KEY=sk_test_...
```

The login page shows **Sign in with Google** and **Sign up with Google** only. Demo accounts can still be used directly via the API for testing.

## Run it locally

```bash
# 1. Install all workspaces
npm install

# 2. Push the schema to Turso and seed demo users (2 riders, 3 drivers, 1 admin)
#    Safe to re-run: seeding is idempotent and does NOT delete rides/ratings.
npm run db:setup

# 3. Start the API (:4000) and web app (:5173) together
npm run dev
```

Open **http://localhost:5173**

### Demo accounts (password: `password` for all)

| Role | Email | Use case |
|---|---|---|
| **Rider** | `alice@rider.com` (Ayesha) | Test rider flow — booking, tracking, payment, rating |
| **Rider** | `bob@rider.com` (Bilal) | Second rider window (multi-window test) |
| **Driver** | `dan@driver.com` (Danish) | Accept requests, simulate pickups & dropoffs |
| **Driver** | `eve@driver.com` (Imran) | Additional driver for testing dispatch |
| **Driver** | `sam@driver.com` (Saad) | Additional driver for testing dispatch |
| **Admin** | `admin@rideshare.com` | View all rides, users, KPIs, force cancel rides |

**No demo buttons in the UI** — enter credentials manually or use Clerk sign-up.

### Agency owner dashboard

Log in as the admin (`admin@rideshare.com`) to reach `/admin` — an agency-owner control panel:

- **All rides** (home) — the full record book: every ride (pending + completed + cancelled) with **user name, driver, pickup point, drop-off point, started date/time, finished date/time, fare and status**. Scheduled pickups are shown too. Auto-refreshes every 5s.
- **Pending** — rides still in progress (searching → in-progress), with a **Force cancel** action for stuck rides or disputes.
- **Completed** — finished rides only.
- **Users** — all riders, drivers and admins with online status, rating and ride counts.
- **Overview** — KPIs (revenue, active rides, drivers online, riders, completed/cancelled) and a rides-by-status breakdown.

Ride start time (`startedAt`) is recorded when the trip begins; finish time (`completedAt`) when it completes. Admin routes (`/api/admin/*`) are guarded server-side by a `requireAdmin` check.

### UI Screenshots

**Login Page** — Google sign-in only.
- Dark theme with centered form
- "Sign in with Google" and "Sign up with Google" buttons (Clerk)
- Clean, minimalist Uber-style design

![Login Page](docs/screenshots/login-page.png)

**Rider App** — Real-time map-centric interface with live driver tracking:
- Full-screen interactive Leaflet map (OpenStreetMap tiles)
- **Driver marker** with vehicle info (name, rating ⭐, car plate, fare estimate)
- **Pickup marker** (green) — current location or manually selected
- **Dropoff marker** (blue) — destination landmark
- **Live driver position** updates every ~1.5s
- **Status badge** showing current state (Driver en route, Arrived, etc.)
- **Countdown timer** — 5 minutes to meet driver with sound notification
- **Fare display** — real-time estimate (PKR), fare tier (ECONOMY shown)
- **Top navigation**: Ride / History / AK (quick actions) / Sign out
- **Action buttons**: Cancel ride (red), Meet driver confirmation
- Seamless real-time updates via Socket.IO

![Rider App](docs/screenshots/rider-app-active-ride.png)

**Driver App** — Incoming request cards with 10-second accept window:
- Incoming request card with:
  - 10-second countdown timer (shrinking red bar)
  - Rider name & rating (e.g., "Ayesha Khan • ⭐ 5")
  - Pickup/dropoff locations preview
  - Counter-offer field (InDrive-style negotiation)
  - Accept / Decline buttons
- Once accepted, driver sees:
  - Route from current location to pickup
  - "En route to pickup" status
  - Real-time position shown on map
  - "Arrived" status when pickup point is reached
  - "Start ride" button to begin trip to dropoff
- Online toggle to receive/pause ride requests

![Driver App](docs/screenshots/driver-app-request.png)

**Admin Dashboard** — Agency owner control panel:
- **All rides tab** — Full record book with searchable table:
  - User name, driver, pickup point, drop-off point
  - Started date/time, finished date/time
  - Fare (PKR), status (Searching, In Progress, Completed, Cancelled)
  - Auto-refreshes every 5 seconds
  - Scheduled intercity rides shown with pickup date
- **Pending tab** — Rides still in progress with Force Cancel action
- **Completed tab** — Finished rides only
- **Users tab** — All riders, drivers, admins with:
  - Online status (green dot)
  - Rating and ride count
  - Role badge
- **Overview tab** — KPI cards and metrics:
  - Total revenue (PKR)
  - Active rides count
  - Drivers online
  - Riders online
  - Completion rate (%)
  - Cancelled rides (%)

![Admin Dashboard](docs/screenshots/admin-dashboard-overview.png)

### Try the full flow

**Scenario: Multi-window test (rider + driver)**

1. **Open two browser tabs/windows**
   - Window 1: Log in as `alice@rider.com` (Rider)
   - Window 2: Log in as `dan@driver.com` (Driver)

2. **Rider: Request a ride**
   - Click **"Ride"** tab
   - Choose pickup: **Current location** (auto-detect) or **Manual** (tap map / search)
   - Choose destination: Search or tap a landmark
   - Select **Fare tier**: BIKE (cheapest), RICKSHAW, ECONOMY, COMFORT, PREMIUM
   - **Request ride** → 10-second countdown for driver

3. **Driver: Accept ride**
   - Incoming request card appears with 10-second countdown timer
   - Optionally make a **counter-offer** (InDrive style)
   - **Accept** → driver map shows auto-accept if rider enabled it
   - Toggle **Online** to receive requests

4. **Tracking: Real-time movement**
   - Driver location updates live on rider map (~1.5s intervals)
   - Status: `EN_ROUTE_TO_PICKUP` → `ARRIVED`

5. **Arrival: Notification + Timer**
   - **Sound** plays when driver arrives
   - **5-minute countdown** appears on rider
   - Rider can: tap **"I've met my driver"** to start trip, or **Cancel ride**

6. **Trip: Pickup to Dropoff**
   - Driver taps **"Start ride"**
   - Car moves to dropoff on map
   - Status: `IN_PROGRESS` → `COMPLETED`

7. **After ride**
   - Rider sees **Payment screen** (mocked)
   - Both get **Rating** prompt (1–5 stars)
   - Both can view **History** with earnings/spending

### Admin Dashboard

Log in as `admin@rideshare.com` to access `/admin`:

- **All Rides** — full record: user, driver, pickup, drop, times, fare, status. Auto-refreshes every 5s.
- **Pending** — rides in progress; action: **Force cancel** (for disputes).
- **Completed** — finished rides only.
- **Users** — all riders/drivers with online status, rating, ride count.
- **Overview** — KPIs: revenue, active rides, drivers online, completed/cancelled breakdown.

## New Features (v2)

- ✅ **Clerk Authentication** — Google sign-in/sign-up with automatic app JWT exchange
- ✅ **Real-time Geolocation** — Auto-detect rider pickup location via browser Geolocation API
- ✅ **Live Destination Search** — Nominatim autocomplete with 400ms debounce, Pakistan-biased
- ✅ **10-second Driver Request Timer** — Countdown bar shrinks red as time runs out
- ✅ **5-minute Arrival Wait Timer** — Sound notification + visual countdown
- ✅ **"I've met my driver" Button** — Quick transition to IN_PROGRESS without manual start
- ✅ **Ride Cancellation** — Riders can cancel in SEARCHING, EN_ROUTE_TO_PICKUP, ARRIVED
- ✅ **Fare Tiers** — BIKE (0.6x), RICKSHAW (0.8x), ECONOMY, COMFORT (1.4x), PREMIUM (1.8x)
- ✅ **InDrive-style Negotiation** — Drivers make counter-offers; riders auto-accept if enabled
- ✅ **No Mock Data in UI** — Demo buttons removed; manual login only

## File Structure

```
.
├── packages/shared              # Shared types, fare logic, tier multipliers
│   └── src/index.ts            # Ride, User, AdminStats, estimateFare(), haversineKm()
├── server                       # Express + Socket.IO backend
│   ├── src/
│   │   ├── index.ts            # HTTP/Socket.IO setup
│   │   ├── routes.ts           # All REST endpoints + /auth/clerk(onboard)
│   │   ├── auth.ts             # Mock JWT generation/verification
│   │   ├── clerk.ts            # Clerk token verification
│   │   ├── db.ts               # Prisma + Turso setup
│   │   └── services/simulator.ts # GPS interpolation engine (0–2km, straight line)
│   └── prisma/schema.prisma    # User, Ride, Rating models (clerkId field optional)
└── web                          # React + Vite frontend
    └── src/
        ├── app/App.tsx         # Role-based routing + OnboardingScreen
        ├── features/
        │   ├── rider/RiderApp.tsx      # Pickup mode, location search, tier grid, timers
        │   ├── driver/DriverApp.tsx    # Online toggle, 10s countdown on requests, offers
        │   └── admin/AdminApp.tsx      # Rides, users, KPIs dashboard
        ├── lib/
        │   ├── auth.tsx         # AuthProvider + ClerkBridge (session exchange)
        │   ├── geo.ts           # getCurrentLocation(), reverseGeocode(), searchPlaces()
        │   ├── socket.ts        # Socket.IO connection + event handlers
        │   └── api.ts           # Axios with Bearer token
        └── components/
            ├── MapView.tsx      # Leaflet map with ClickPicker (tap to select location)
            ├── LocationSearch.tsx # Nominatim debounced autocomplete
            ├── CountdownBar.tsx # 10-second shrinking timer bar
            └── RatingModal.tsx  # 1–5 star post-ride rating
```

## Data persistence

All data lives in **Turso** (a cloud libSQL database), so it **persists across server restarts** — stopping/starting `npm run dev` never touches it. Data is only removed by commands you run explicitly:

- `npm run db:seed -w server` / `npm run db:setup` — **non-destructive**; upserts the demo accounts and leaves all rides/ratings intact.
- `npm run db:reset -w server` — **destructive**; wipes all users/rides/ratings and re-seeds a clean demo. Only run this when you want a fresh slate.

## Architecture

```
packages/shared   Shared TS types + fare/distance math (single source of truth)
server            Express REST + Socket.IO; Prisma/SQLite; driver movement simulator
web               React SPA, role-based routes (/rider, /driver)
```

- **Ride lifecycle**: `SEARCHING → DRIVER_ASSIGNED → EN_ROUTE_TO_PICKUP → ARRIVED → IN_PROGRESS → COMPLETED` (or `CANCELLED`).
- **Matching**: on request, the ride is offered to all online drivers; first to accept wins (guarded server-side).
- **Real-time tracking**: `server/src/services/simulator.ts` interpolates the driver's coordinates along a straight line (pickup → dropoff) and pushes `driver:location` events into the ride's Socket.IO room every ~1.5s. Status transitions to ARRIVED / COMPLETED happen automatically when a leg finishes.

## What's mocked vs real

| Feature | Status |
|---|---|
| Maps / tiles | **Real** (OpenStreetMap); locations are a seeded list of Pakistani cities/landmarks |
| Geolocation | **Real** (Browser Geolocation API); reverse geocoding via Nominatim |
| Destination search | **Real** (Nominatim); autocomplete with 400ms debounce, Pakistan-biased |
| Driver GPS | **Mocked** — server-side coordinate interpolation (0–2km from pickup, straight line to drop) |
| Auth | **Hybrid** — Clerk (real OAuth) if key present; fallback to mock JWT (demo accounts) |
| Payments | **Mocked** — "payment successful" screen; no real gateway |
| Fare tiers & math | **Real** — multipliers (BIKE 0.6x, RICKSHAW 0.8x, ECONOMY 1x, COMFORT 1.4x, PREMIUM 1.8x); `estimateFare()` in `packages/shared` |
| Ride history & ratings | **Real** — persisted in Turso/SQLite |
| Real-time tracking | **Real** — Socket.IO with driver location every ~1.5s |
| Notifications | **Real** — Web Audio API chime on arrival |

## Swapping in real providers later

- **Maps**: `web/src/components/MapView.tsx` is the only place tiles/markers are rendered. Replace `<TileLayer>` (and geocoding in `web/src/lib/locations.ts`) to move to Google/Mapbox.
- **Payments**: replace `PaymentScreen` in `web/src/features/rider/RiderApp.tsx` with a real checkout.
- **GPS**: replace `server/src/services/simulator.ts` with real driver-device coordinate ingestion; the socket contract (`driver:location`) stays the same.
- **DB**: the app runs on **Turso (libSQL)** via the Prisma driver adapter (`server/src/db.ts`). Schema is pushed with `npm run db:push -w server` (`server/prisma/turso-push.ts`). To move to Postgres later, change the Prisma `datasource` and swap the adapter.

## Clerk Authentication (Optional)

The app comes with **two authentication modes**:

### Mode 1: Built-in (Demo Accounts)
- Use without any external services
- Credentials hardcoded in DB (seeded at `npm run db:setup`)
- Fast for testing/prototyping

### Mode 2: Clerk (Google sign-in)
If Clerk keys are present, the login page shows **Sign in with Google** and **Sign up with Google**. First-time users are taken through an onboarding screen to pick their role (Rider/Driver) and vehicle.

**Setup Clerk (free tier):**
1. Create account at https://clerk.com
2. Create an app, enable Google social connection
3. Set `VITE_CLERK_PUBLISHABLE_KEY` (web) and `CLERK_SECRET_KEY` (server)
4. Restart the app

**Multi-window caveat:**  
Clerk sessions are per-browser-profile, not per-window. To run rider + driver simultaneously use two different browsers or normal + incognito. Demo accounts use per-window `sessionStorage` so they don't have this limitation.

## Notes

This is a prototype: no security hardening, no tests, single-process in-memory simulator state. Not production-ready by design. Perfect for:
- **Learning** full-stack ride-sharing architecture
- **Pitching** to investors / stakeholders (works offline, no third-party dependencies except Turso)
- **Portfolio** — end-to-end feature delivery in a week
- **Teaching** real-time web apps, Socket.IO, geo services
