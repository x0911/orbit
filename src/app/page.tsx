"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BookOpen, Compass, Sparkles, Flame, ArrowRight } from "lucide-react";
import ShelfCanvas from "@/components/features/shelf-canvas";
import ProgressRings from "@/components/features/progress-rings";
import FriendsFeedMockup from "@/components/features/friends-feed-mockup";
import WrappedPreview from "@/components/features/wrapped-preview";
import Magnet from "@/components/Magnet";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import ThemeToggle from "@/components/theme-toggle";

// Dynamically import the Three.js Orbit centerpiece so it doesn't block initial page paint (LCP)
const HeroOrbit = dynamic(() => import("@/components/features/hero-orbit"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-ink-950">
      <div className="w-12 h-12 rounded-full border-2 border-t-amber-500 border-ink-800 animate-spin" />
    </div>
  ),
});

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  return (
    <div className="bg-ink-950 text-parchment-100 min-h-screen relative font-sans selection:bg-amber-500/20 selection:text-amber-400">
      {/* 1. Hero Section - WebGL centerpiece + HTML text layer */}
      <header className="relative w-full h-[100vh]">
        {/* Background WebGL Scene */}
        <div className="absolute inset-0 z-0">
          <HeroOrbit />
        </div>

        {/* Foreground Content */}
        <div className="absolute inset-0 z-10 flex flex-col justify-between max-w-7xl mx-auto px-6 py-8 pointer-events-none">
          {/* Bottom header line */}
          <div className="flex justify-between items-center w-full">
            <Link
              href="/"
              className="flex items-center gap-2 group pointer-events-auto"
            >
              <div className="w-8 h-8 rounded-full bg-ink-900 border border-ink-800 text-amber-500 flex items-center justify-center shadow-md">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="font-sans text-lg font-bold tracking-wide text-parchment-100">
                Orbit
              </span>
            </Link>

            <div className="flex items-center gap-3 pointer-events-auto">
              <ThemeToggle />
              <Link
                href={user ? "/app/shelf" : "/login"}
                className="bg-ink-900/80 hover:bg-ink-850 text-parchment-300 hover:text-parchment-100 border border-ink-800 hover:border-amber-500/20 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-md"
              >
                {user ? "Dashboard" : "Sign In"}
              </Link>
            </div>
          </div>

          {/* Central Headline & CTA */}
          <div className="my-auto max-w-xl text-left space-y-6 pt-12">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-amber-500 px-2.5 py-1 rounded bg-amber-500/5 border border-amber-500/10 shadow-[0_0_15px_rgba(230,166,46,0.05)]">
                <Sparkles className="w-3.5 h-3.5" />
                Animated Book Tracker
              </div>
              <h1 className="font-sans text-4xl md:text-6xl font-bold tracking-tight text-parchment-100 leading-tight">
                Your Reading <br />
                Space, Reimagined.
              </h1>
              <p className="text-sm md:text-base text-parchment-500 font-light leading-relaxed max-w-md">
                Build your digital library bookshelf, log progress with visual
                indicators, follow reading circles, and share annual statistics.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pointer-events-auto">
              <Link
                href={user ? "/app/shelf" : "/login"}
                className="bg-amber-500 hover:bg-amber-600 text-ink-950 font-bold px-6 py-3 rounded-xl text-sm shadow-lg hover:shadow-amber-500/10 transition-all flex items-center justify-center gap-1.5 focus:outline-none"
              >
                {user ? "Go to Dashboard" : "Try Demo Account"}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/discover"
                className="bg-ink-900/60 hover:bg-ink-850/80 text-parchment-100 border border-ink-800 hover:border-ink-700 px-6 py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 focus:outline-none"
              >
                <Compass className="w-4 h-4 text-amber-500" />
                Explore Discover
              </Link>
            </div>
          </div>

          {/* Scroll Down Indicator */}
          <div className="w-full text-center flex flex-col items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-widest font-semibold text-parchment-500">
              Scroll to explore
            </span>
            <div className="w-1 h-8 rounded-full bg-ink-900 border border-ink-800 relative overflow-hidden">
              <div className="w-full h-1/2 bg-amber-500 rounded-full absolute top-0 left-0 animate-bounce" />
            </div>
          </div>
        </div>
      </header>

      {/* 2. Shelf Section - "Your Shelf, Alive" */}
      <section className="py-20 border-t border-ink-900 bg-ink-950 px-6">
        <div className="max-w-4xl mx-auto space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="font-sans text-2xl md:text-3xl font-bold tracking-wide">
              Your Shelf, Alive
            </h2>
            <p className="text-xs text-parchment-500 max-w-sm mx-auto">
              Visual lean-and-settle book spine physics. A bookshelf that
              responds interactively as you scroll.
            </p>
          </div>
          <ShelfCanvas />
        </div>
      </section>

      {/* 3. Progress Section - "Progress, Visualized" */}
      <section className="py-20 border-t border-ink-900 bg-ink-950 px-6">
        <div className="max-w-4xl mx-auto space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="font-sans text-2xl md:text-3xl font-bold tracking-wide">
              Progress, Visualized
            </h2>
            <p className="text-xs text-parchment-500 max-w-sm mx-auto">
              Circular rings trace your logged reading pages and fill ratios,
              complete with dynamic percentage updates.
            </p>
          </div>
          <ProgressRings />
        </div>
      </section>

      {/* 4. Friends Section - "See What Friends Are Reading" */}
      <section className="py-20 border-t border-ink-900 bg-ink-950 px-6">
        <FriendsFeedMockup />
      </section>

      {/* 5. Statistics Section - "Your Year in Reading" */}
      <section className="py-20 border-t border-ink-900 bg-ink-950 px-6">
        <div className="max-w-4xl mx-auto space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="font-sans text-2xl md:text-3xl font-bold tracking-wide">
              Your Year in Reading
            </h2>
            <p className="text-xs text-parchment-500 max-w-sm mx-auto">
              Track reading summaries, page volumes, and explore dynamic genre
              distribution ratios.
            </p>
          </div>
          <WrappedPreview />
        </div>
      </section>

      {/* 6. Footer CTA Section */}
      <footer className="py-20 border-t border-ink-900 bg-ink-950 px-6 text-center relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-lg mx-auto space-y-8 relative z-10">
          <div className="space-y-3">
            <h3 className="font-sans text-2xl md:text-3xl font-bold tracking-wide text-parchment-100">
              Ready to explore?
            </h3>
            <p className="text-xs text-parchment-500 max-w-xs mx-auto">
              Sign in to a demo guest account instantly and start structuring
              your library shelf.
            </p>
          </div>

          {/* Magnetic specs button */}
          <div className="flex justify-center">
            <Magnet magnetStrength={3} padding={80}>
              <Link
                href={user ? "/app/shelf" : "/login"}
                className="bg-amber-500 hover:bg-amber-600 text-ink-950 font-bold px-8 py-3.5 rounded-xl text-sm shadow-xl hover:shadow-amber-500/20 transition-all inline-flex items-center gap-1.5 focus:outline-none animate-pulse"
              >
                <Flame className="w-4 h-4 fill-current animate-pulse" />
                {user ? "Open Dashboard" : "Launch Demo Account"}
              </Link>
            </Magnet>
          </div>

          <div className="text-[10px] text-parchment-500/80 pt-12 space-y-2">
            <p>
              © {new Date().getFullYear()} Orbit Project. Low-poly WebGL design
              centerpiece.
            </p>
            <p className="text-[9px] text-parchment-500/40">
              Built using Next.js 15, Three.js, GSAP, and Tailwind CSS.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
