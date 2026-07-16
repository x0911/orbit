<div align="center">

# Orbit

### A reading tracker that actually feels alive.

**[→ Live demo: join-orbit.vercel.app](https://join-orbit.vercel.app/)** — no signup needed, click "Try Demo" and explore.

</div>

---

Most reading trackers look like a spreadsheet wearing a nice font. Orbit doesn't.

It started from a simple annoyance: tools like this always *feel* like a database with a UI bolted on top. So Orbit was built the other way around — starting from motion and craft, then wiring the data underneath it. The result is a shelf that leans and settles like real books being placed down, progress rings that draw themselves in as you scroll, a friend activity feed that updates the instant someone starts a new book, and a hero section built around a small orbiting solar system of book-moons that responds to your scroll and your cursor.

It's a portfolio project, but it's built to production standards — real auth, real Row Level Security, real accessibility work, real performance budget. Nothing here is a mockup.

**If you're a hiring manager skimming this:** the 90-second version is the live demo link above. Click "Try Demo," scroll through the landing page once, then poke around the shelf. Everything below this point is for the engineers on your team who want to see how it's put together.

---

## What's actually in it

- **A hero built in Three.js**, not a stock template — a wireframe open book with small glowing moons orbiting it on tilted elliptical paths. Scroll and the camera dollies and rotates with you; move your cursor and it parallaxes subtly. Scroll back up and it reverses cleanly, because a scroll animation that only plays forward isn't really reactive, it's just a delayed page load.
- **A shelf you can watch come alive** — book spines drawn on a hand-rolled HTML5 Canvas that lean in and settle into place as they scroll into view, no animation library involved.
- **Progress rings built from raw SVG**, filling in sync with numbers counting up beside them — the same component that powers the real "currently reading" view, not a separate marketing-only asset.
- **A live friend activity feed**, powered by Supabase Realtime — when someone you follow starts a new book, it shows up without a refresh.
- **A yearly "Wrapped"** page, in the spirit of Spotify's — genre breakdown, pages read, animated counters, the whole end-of-year reading recap.
- **Real accessibility work, not an afterthought** — every animation respects `prefers-reduced-motion`, every interactive flow has a full keyboard path, and contrast ratios were checked against the actual dark palette used, not assumed.
- **A real performance budget** — the 3D scene is dynamically imported and only wakes up once it's on screen, images are locked to their aspect ratio so nothing jumps around while loading, and the activity feed is paginated instead of quietly growing forever.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript strict mode) |
| Styling | Tailwind CSS v4 |
| 3D / WebGL | Three.js, via `@react-three/fiber` and `@react-three/drei` |
| Scroll & motion | GSAP + ScrollTrigger |
| Motion primitives | react-bits (TS-TW variants) |
| Database, Auth, Realtime | Supabase (Postgres, Row Level Security, Realtime channels) |
| Icons | `lucide-react` — every icon in the product is a real SVG component, no emoji characters anywhere in the UI |
| Hosting | Vercel, with Speed Insights tracking real Core Web Vitals in production |

---

## Project structure

```
orbit/
├── .github/workflows/     # CI: lint, build, and Lighthouse checks on every PR
├── supabase/              # Schema migrations + seed data for the demo account
├── src/
│   ├── app/               # Next.js App Router — pages, server actions, route handlers
│   ├── components/
│   │   ├── features/      # Shelf view, activity feed, Wrapped page, the WebGL hero
│   │   └── ui/            # Shared primitives (shadcn + react-bits based)
│   ├── hooks/             # Including useReducedMotion, checked by every animation
│   └── lib/               # Supabase client setup (browser + server, split correctly)
```

---

## Running it locally

**1. Set up Supabase**

Create a Supabase project, then apply the schema:

```bash
supabase/migrations/20260716000000_init_schema.sql
```

Seed it with demo data (accounts, follows, shelves, reading logs, reviews) so the app never shows an empty state:

```bash
supabase/seed.sql
```

**2. Environment variables**

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key-bypasses-rls
SUPABASE_JWKS_URL=your-jwks-endpoint-url
CRON_SECRET=your-cron-secret-key
```

Orbit uses Supabase's current key system (publishable/secret), not the legacy anon/service_role keys — the publishable key is safe client-side, the secret key never leaves the server.

**3. Install and run**

```bash
npm install --legacy-peer-deps
npm run dev
```

**4. Verify before you push**

```bash
npm run lint
npm run build
```

---

## A note on how this was built

The landing page's custom Canvas and SVG animations, the Three.js hero, and the scroll-reactive system connecting them were built deliberately from scratch rather than assembled entirely from a motion library — the goal was to demonstrate the underlying animation mechanics themselves (easing, staggering, scroll-scrubbing, viewport-aware performance tradeoffs), not just component composition. react-bits is used where it genuinely fits (text reveals, hover states, card primitives), and never as a substitute for showing that work.