# Local Guide

Hotel Pearl Palace’s Jaipur travel companion. React 18, TypeScript, Vite, Tailwind 4, Zustand, React Router 6, Leaflet/OpenStreetMap, Framer Motion, Appwrite and Gemini.

## Run

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/api` to the local Node server on port 3001. `npm run preview` previews static output only; it does not start the API.

Copy `.env.example` to `.env.local` for a fresh checkout. In this workspace, public Appwrite identifiers already live in `.env`; `.env.local` holds server secrets. Set `GEMINI_API_KEY` there. Restart `npm run dev` after changing server environment variables. Never put Gemini or Appwrite API keys in `VITE_*` variables. The existing legacy Appwrite key was moved to `APPWRITE_API_KEY` in the ignored `.env.local`.

**Current external setup:** Appwrite has double `rating` and a `naturalKey` column; the duplicate LMB rows must be resolved before its unique index can be enabled. All 20 source places are present (21 rows while the duplicate remains). Local secrets are kept in ignored `.env.local`; `.env.example` contains blank secret placeholders. The seed prefers `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` for the designated admin and closes its temporary session afterward. Without admin credentials it uses `APPWRITE_API_KEY`, which must have `documents.write`; the currently configured key lacks that scope. Cookie-only Appwrite sessions are supported without requiring a session secret. Gemini function calling and final streaming were verified separately using a fictional cafe, without exporting the live catalogue in the diagnostic.

## Appwrite

The code now follows the supplied Console schema for POIs/vendors, trips and bookings. Set the actual database/collection IDs in `.env.local`; the POI collection can be named `vendors` or anything else when `VITE_APPWRITE_COLLECTION_ID` matches its ID.

| Collection / column | Console configuration | Stored value |
|---|---|---|
| POIs / `rating` | **Change integer to double**, range 0–5 | Decimal ratings such as `4.7` |
| POIs / `naturalKey` | **Required string/varchar, size 255; unique index** | Normalized lowercase `name\|area` |
| POIs / `openHours` | Keep scalar text | JSON object, e.g. `{"mon":"09:00-18:00","tue":"closed"}` |
| POIs / `foreignerFeeINR` | Keep text | Numeric text, e.g. `"500"`; decoded to a number |
| POIs / `tags` | Keep text array | `["heritage","kids"]` |
| POIs / `bookingUrl` | Keep optional URL | Valid URL or `null` |
| Trips / `stops` | Keep scalar longtext | One JSON array of immutable stop objects |
| Trips / creation time | Built-in `$createdAt` | Converted to milliseconds for the UI |
| Bookings / booking time | Built-in `$createdAt` | Converted to milliseconds for the UI |

No custom `createdAt` or `bookedAt` columns are needed. The trip code is also its document ID, so `/trip/:code` needs no code query/index. Readers also support older hours arrays, stop arrays and custom numeric timestamps; new writes use the table above.

If records already exist, export them before replacing the integer rating column, and restore their ratings after creating the double column. Backfill `naturalKey` before making it required and adding its unique index. Set the category enum to `restaurant`, `attraction`, `experience`, `shopping`, `cafe`, `wellness`, `park`, `transport`.

Add an ascending `name` index to POIs. Bookings sort by the indexed system column `$createdAt`. Wait until columns/indexes are available before seeding. POI permissions: Any read, and Create/Update/Delete only for your designated admin's **project Auth user ID**. Keep broad Users/Any write grants removed. Trips retain Any read/create + Users CRUD; bookings retain Any read/create for the demo.

POI identity is the combination of name and area: case, Unicode presentation differences and repeated whitespace are ignored. Different areas remain separate branches. Both create and edit check for duplicates before writing and show a message to edit the existing place; editing that same record is allowed. The form also ignores repeated submissions while a save is running. This check improves feedback, while an Appwrite **unique** index on the complete `naturalKey` column rejects concurrent duplicate writes atomically. A plain key index does not enforce uniqueness. See [Appwrite indexes](https://appwrite.io/docs/products/databases/tablesdb/tables#indexes).

For existing duplicates, back up both records, choose which details to retain, and check trips/bookings for references before deleting either ID. Normalize/backfill retained keys, then create `unique_naturalKey` with type **Unique** and column **naturalKey**. Wait for **Available**. All application and seed writes generate this key; direct Console edits must keep it consistent with the name and area.

An account's email or the `/admin` route does not confer Appwrite permissions. Log into the project account whose `$id` has the POI collection's Create/Update/Delete grants. A Console owner account and a project Auth user are separate identities. In an error such as `Missing "create" permission for role "user:A" ... "user:B" ... scopes are allowed`, `A` is the role required by the collection and `B` is the authenticated account making the request. Sign out and log in as `A`, or correct the collection grants if `B` is the intended admin. Creation permissions belong on the collection/table, not individual documents/rows.

Add the localhost and deployed frontend hostnames as Web platforms. Create `admin@localguide.app` with your chosen password in Appwrite Console. `/admin` authenticates through Appwrite email/password sessions. Seeding is explicit, idempotent by name/area, and never runs on guest page loads:

```sh
npm run seed
```

The seed adds missing places from `src/data/pois.ts`, preserves existing IDs and admin edits, then verifies that every source place is present. Re-running it creates no additional rows. It refuses to write when existing rows or the source contain duplicate normalized names and areas, so resolve duplicates first. Concurrent conflicts are re-read and skipped only when the same place now exists.

**SDK gotchas:** installed/tested `appwrite@28.1.0`. Calls use named parameter objects. SDK 13 examples use positional arguments; those remain deprecated overloads in 28, but named objects are not backward compatible with 13. Databases/collections remain available (now deprecated in favour of TablesDB); this project retains them to match your schema. Updates merge the prior POI to avoid resetting omitted fields. Legacy hours arrays split at the first colon, preserving minutes and closing time.

## Gemini and SSE

`src/lib/gemini.ts` is server-only. It uses the maintained `@google/genai` SDK rather than the deprecated `@google/generative-ai`. `GEMINI_MODEL` defaults to the stable `gemini-3.5-flash-lite` model. A local diagnostic found `gemini-flash-latest` took about 49 seconds for a simple greeting, while Flash-Lite took 2.7 seconds; the old 30-second timeout caused `504 DEADLINE_EXCEEDED`. The latest alias can change its underlying model, so use a specific model available to your key. Individual calls allow 60 seconds; the HTTP request still has a 110-second overall deadline.

Gemini failures now produce specific guest messages for quota/rate limits, timeouts, model availability and connection configuration. The API terminal logs the provider status and details with credentials redacted. Check the `[Guide]` entry when troubleshooting. Restart `npm run dev` after changing `GEMINI_MODEL` or the API key in `.env.local`.

The bounded loop forces `searchPOIs` first, executes all returned function calls, preserves full model content/thought signatures/call IDs, and sends function responses before the next turn. `buildRoute` only accepts searched IDs after `checkHours`, then rechecks every actual arrival, full visit and time budget. Final text uses a separate `generateContentStream` request with successful tool results and no tool declarations or function-call history. POST SSE includes status, text, itinerary, error and done frames; the client handles fragmented UTF-8, CRLF, multiline data, cancellation and truncated connections.

Structured itinerary cards/map pins can only come from validated catalogue records. Gemini prose is still generated text and cannot be guaranteed hallucination-free by prompting; the itinerary is authoritative. Opening hours are catalogue data, not a live venue feed. Haversine distances are straight-line estimates; transfer time uses a road-factor estimate, and excludes the hotel return. Food filters apply to stored flags. Unknown prices stay unknown.

**Data review:** the supplied 20 records include mock partner booking URLs and an “Ayurvedic Spa (In-Hotel)” latitude of `24.9155`, outside Jaipur. It is preserved for review; time-budget validation rejects the long route. Verify partner availability, coordinates, dietary flags, fees and holiday hours with the hotel before launch. No real payments, reservations or commissioned revenue are claimed.

Booking confirmation posts only trip/POI/request IDs. The server checks trip membership and calculates price/commission from the current catalogue. Stable document IDs make retries idempotent. Shared trips render saved stop snapshots even if POI details later change.

## Deploy

Production: [local-guide-sigma.vercel.app](https://local-guide-sigma.vercel.app/). The Vercel project `ram-kishors-projects/local-guide` is connected to GitHub `main`; pushes trigger production deployments. The exact production hostname is registered as an Appwrite web app. Public Appwrite configuration and the server-only Gemini key/model are configured in Vercel environment variables.

**Vercel:** import this repository as a Vite project; `vercel.json` configures the build and SPA routes. `/api/chat` streams SSE and `/api/bookings` records demo reservations. Set public Appwrite variables and server `GEMINI_API_KEY` / `GEMINI_MODEL` in Vercel. Add the Vercel hostname as an Appwrite Web platform. The streaming function allows up to 120 seconds; a 10-second response target is not yet measured.

Server runtime imports use explicit `.js` extensions so the transpiled functions load under native Node ESM. The runtime regression test compiles the complete API dependency graph and imports both handlers without `tsx`; Vite's development resolver alone would miss extensionless imports that fail on Vercel.

**Appwrite Functions:** a reusable buffered adapter is supplied in `functions/index.ts`. Deploy with repository root `.`, Node 20+, build command `npm ci && npm run build:function`, entrypoint `functions/dist/index.js`, public execution permission, and the Appwrite/Gemini environment variables. `/bookings` handles reservations; `/` returns collected chat events as JSON. The default frontend uses Vercel endpoints. Wiring the buffered adapter to React would require a different transport; it is not token streaming.

Appwrite’s documented `res.json/text/binary` helpers return a completed response; they expose no incremental write/flush API. Do not simulate SSE by returning a finished event string. Use the Vercel endpoint for real SSE, or Appwrite Functions + Realtime document updates for a different transport. Keep Gemini keys on the server.

## Verification

```sh
npm test
npm run lint
npm run build
npm run build:function
```

Focused tests cover hours/IST/overnight visits, route budgets, unknown IDs, dietary filters, Appwrite codecs, SSE fragmentation, tool history/signatures, cancellation, bounded loops, provider error handling and credential redaction, native Node ESM loading of the API handlers, WhatsApp links, booking deduplication, normalized POI identity, duplicate creates/renames, concurrent conflicts, and seed preservation/idempotence. A live Gemini integration test with a fictional cafe completed search, hours checking, route building and final streamed text in about 43 seconds. Saving shared trips and reservations still require the external permissions above.

Lint completes with zero errors and three notices on asynchronous Appwrite loading effects.

`npm audit` reports two moderate React Router advisories requiring a v7 upgrade; v6 is retained to meet the requested stack. This app uses fixed Router links and no SSR hydration. See [redirect advisory](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) and [SSR advisory](https://github.com/advisories/GHSA-337j-9hxr-rhxg).

References: [Gemini SDK examples](https://github.com/googleapis/js-genai), [Gemini library migration](https://ai.google.dev/gemini-api/docs/libraries), [Appwrite Function responses](https://appwrite.io/docs/products/functions/develop#response), [Vercel streaming](https://vercel.com/docs/functions/streaming-functions).
