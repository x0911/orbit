# Orbit

**Animated Reading & Book Discovery Tracker**

Orbit is a visual reading companion and discovery ledger built to demonstrate advanced animation techniques, database integrations, and accessibility compliance. 

Instead of traditional flat tables, Orbit maps library shelves, progress indicators, community reviews, and reading logs into an interactive, motion-rich workspace.

---

## 🚀 Key Features

- **WebGL Centerpiece (Three.js)**: A low-poly wireframe-outlined open book model centerpiece with glowing amber moons orbiting on skewed elliptical paths, scrubbed dollying and skews linked to scroll progress.
- **"Your Shelf, Alive" (Canvas 2D)**: A hand-rolled HTML5 Canvas drawing book spines that lean and settle staggered as you scroll.
- **"Progress, Visualized" (SVG Rings)**: Staggered circular draw-ins matched with value count-ups.
- **Friend Activity Feed**: Real-time updates from followed profiles synced instantly using Supabase PostgreSQL Realtime channels.
- **Yearly Wrapped slideshow**: Personal slideshow summaries (Spotify Wrapped style) with SVG genre distribution donut segments and GSAP counting tweens.
- **Accessible & Performance-Minded**:
  - Full `prefers-reduced-motion` compliance across all WebGL, Canvas, SVG, and GSAP timelines.
  - Active focus trapping, key controls, and Escape listeners on modals.
  - Dynamic imports (`ssr: false`) and canvas viewport observations (`IntersectionObserver`) to keep LCP quick and run loop loads low.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 15 (App Router, TypeScript strict)
- **Styling**: Tailwind CSS v4
- **WebGL**: Three.js via `@react-three/fiber` & `@react-three/drei`
- **Animation**: GSAP + ScrollTrigger
- **Database/Realtime**: Supabase (PostgreSQL, Auth, Realtime, RLS)
- **Icons**: `lucide-react` (Zero emoji characters utilized)
- **Motion Primitives**: react-bits (TS-TW variants)

---

## 📁 Folder Structure

```
orbit/
├── .github/workflows/   # CI Lint & Build Actions
├── supabase/            # Init schema migrations & seed files
├── src/
│   ├── app/             # Next.js App Router (Pages, actions, callback API)
│   ├── components/      # react-bits animations & visual wrappers
│   │   ├── features/    # Shelf-view, feed-view, wrapped-view, WebGL orbit
│   │   └── ui/          # Generic shadcn primitives
│   ├── hooks/           # useReducedMotion accessibility listener
│   └── lib/             # Supabase ssr server & client initializers
```

---

## ⚙️ Local Development Setup

### 1. Configure Supabase Projects & Schema
Create a Supabase project and apply the initial schema located under `supabase/migrations/20260716000000_init_schema.sql`.

Run the seed script `supabase/seed.sql` to populate guest demo accounts, reciprocal follows, books, shelves, logs, and reviews.

### 2. Configure Environment variables
Create a `.env.local` file at the root of the project with the following keys:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key-bypasses-rls
SUPABASE_JWKS_URL=your-jwks-endpoint-url
CRON_SECRET=your-cron-secret-key
```

### 3. Install & Start Development Server
```bash
# Install dependencies
npm install --legacy-peer-deps

# Run local development server
npm run dev
```

### 4. Build & Lint Verification
```bash
# Verify static typings and eslint rules
npm run lint

# Build production compiled bundle
npm run build
```
