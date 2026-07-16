"use client";

import { useState, useEffect, useRef } from "react";
import { Star, Share2, ChevronLeft, ChevronRight, Award, BookOpen, Layers, Flame } from "lucide-react";
import gsap from "gsap";
import SplitText from "@/components/SplitText";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface WrappedViewProps {
  username: string;
  displayName: string;
  year: string;
  booksCount: number;
  pagesCount: number;
  genres: Array<{ genre: string; count: number }>;
  averageRating: number | null;
  isOwnWrapped: boolean;
}

export default function WrappedView({
  username,
  displayName,
  year,
  booksCount,
  pagesCount,
  genres,
  averageRating,
  isOwnWrapped,
}: WrappedViewProps) {
  const prefersReducedMotion = useReducedMotion();
  const [activeSlide, setActiveSlide] = useState(0);
  const [shareText, setShareText] = useState("Share");

  // Numeric count-up states
  const [dispBooks, setDispBooks] = useState(0);
  const [dispPages, setDispPages] = useState(0);

  // SVG donut metrics
  const totalGenreCount = genres.reduce((acc, g) => acc + g.count, 0) || 1;
  const radius = 40;
  const circumference = 2 * Math.PI * radius; // ~251.32

  const slidesContainerRef = useRef<HTMLDivElement>(null);

  // Color palette for genre slices
  const genreColors = ["#E6A62E", "#F2B84B", "#C4881B", "#9C8F7A", "#D8CCB8", "#1E1B18"];

  // 1. Handle counting animation when Slide 1 (the stats card) is visible
  useEffect(() => {
    if (activeSlide !== 1) {
      setDispBooks(0);
      setDispPages(0);
      return;
    }

    if (prefersReducedMotion) {
      setDispBooks(booksCount);
      setDispPages(pagesCount);
      return;
    }

    const stateObj = { books: 0, pages: 0 };
    const tween = gsap.to(stateObj, {
      books: booksCount,
      pages: pagesCount,
      duration: 1.6,
      ease: "power2.out",
      onUpdate: () => {
        setDispBooks(Math.round(stateObj.books));
        setDispPages(Math.round(stateObj.pages));
      },
    });

    return () => {
      tween.kill();
    };
  }, [activeSlide, booksCount, pagesCount, prefersReducedMotion]);

  // 2. Animate Donut slices when Slide 2 (genres breakdown) mounts
  const sliceRefs = useRef<SVGCircleElement[]>([]);
  useEffect(() => {
    if (activeSlide !== 2 || prefersReducedMotion) return;

    // Reset offsets
    sliceRefs.current.forEach((slice) => {
      if (slice) {
        slice.style.strokeDasharray = `0 ${circumference}`;
      }
    });

    const timeline = gsap.timeline();

    genres.forEach((gen, index) => {
      const slice = sliceRefs.current[index];
      if (slice) {
        const pct = gen.count / totalGenreCount;
        const targetLength = circumference * pct;
        
        timeline.to(
          slice,
          {
            strokeDasharray: `${targetLength} ${circumference}`,
            duration: 0.8,
            ease: "power2.out",
          },
          index * 0.25 // staggered segment drawings
        );
      }
    });

    return () => {
      timeline.kill();
    };
  }, [activeSlide, genres, totalGenreCount, circumference, prefersReducedMotion]);

  // Handle Share link copying
  const handleShare = () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setShareText("Copied!");
    setTimeout(() => {
      setShareText("Share");
    }, 2000);
  };

  const handleNext = () => {
    setActiveSlide((prev) => Math.min(3, prev + 1));
  };

  const handlePrev = () => {
    setActiveSlide((prev) => Math.max(0, prev - 1));
  };

  // Pre-calculate donut slice alignments
  let accumulatedPct = 0;

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col justify-center items-center h-[80vh] relative px-4">
      {/* Top Meta Details */}
      <div className="w-full flex items-center justify-between mb-6 z-10">
        <div className="flex flex-col text-left">
          <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500">
            {year} WRAPPED
          </span>
          <span className="text-xs text-parchment-500">
            @{username}
          </span>
        </div>

        <button
          onClick={handleShare}
          className="bg-ink-900 hover:bg-ink-850 text-parchment-300 hover:text-parchment-100 border border-ink-800 px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          {shareText}
        </button>
      </div>

      {/* Slide Container (Viewport) */}
      <div
        ref={slidesContainerRef}
        className="w-full aspect-[3/4] bg-ink-900 border border-ink-800 rounded-3xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden select-none"
      >
        {/* Glow Effects */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Slide 0: Cover Slide */}
        {activeSlide === 0 && (
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-ink-950 border border-ink-850 text-amber-500 flex items-center justify-center shadow-lg">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <SplitText
                text={`${year} Reading Wrapped`}
                className="font-serif text-3xl font-bold tracking-wide text-parchment-100"
                splitType="words"
                delay={60}
              />
              <p className="text-xs text-parchment-500 max-w-xs mx-auto">
                {isOwnWrapped
                  ? "Explore a summary of your literary journey over the past year."
                  : `See how ${displayName} progressed through their libraries.`}
              </p>
            </div>
          </div>
        )}

        {/* Slide 1: Stats Volume Counters */}
        {activeSlide === 1 && (
          <div className="flex-1 flex flex-col justify-center items-center space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500">
                LITERARY VOLUME
              </span>
              <h3 className="font-serif text-2xl font-bold">The Year in Numbers</h3>
            </div>

            <div className="space-y-6 w-full max-w-[280px]">
              <div className="bg-ink-950/65 border border-ink-850 p-5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-ink-900 border border-ink-800 text-amber-500 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-parchment-300">Books Finished</span>
                </div>
                <span className="font-serif text-2xl font-bold text-amber-500">{dispBooks}</span>
              </div>

              <div className="bg-ink-950/65 border border-ink-850 p-5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-ink-900 border border-ink-800 text-amber-500 flex items-center justify-center">
                    <Flame className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-parchment-300">Pages Logged</span>
                </div>
                <span className="font-serif text-2xl font-bold text-amber-500">
                  {dispPages.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Slide 2: Genre Slices breakdown */}
        {activeSlide === 2 && (
          <div className="flex-1 flex flex-col justify-center items-center space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500">
                GENRE LANDSCAPE
              </span>
              <h3 className="font-serif text-2xl font-bold">Your Preferred Spheres</h3>
            </div>

            {genres.length === 0 ? (
              <p className="text-xs text-parchment-500 py-8">No books finished yet to map genres.</p>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-6 w-full max-w-[340px]">
                {/* SVG Circular Donut Chart */}
                <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={radius} className="stroke-ink-950 fill-none" strokeWidth="8" />
                    
                    {genres.map((gen, i) => {
                      const color = genreColors[i % genreColors.length];
                      const pct = gen.count / totalGenreCount;
                      const dashOffset = circumference * (1 - accumulatedPct);
                      const targetLength = prefersReducedMotion ? circumference * pct : 0;
                      
                      accumulatedPct += pct;

                      return (
                        <circle
                          key={gen.genre}
                          ref={(el) => {
                            if (el) sliceRefs.current[i] = el;
                          }}
                          cx="50"
                          cy="50"
                          r={radius}
                          stroke={color}
                          strokeWidth="8"
                          strokeDasharray={prefersReducedMotion ? `${targetLength} ${circumference}` : `0 ${circumference}`}
                          strokeDashoffset={-dashOffset}
                          className="fill-none transition-all duration-75"
                          strokeLinecap="butt"
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute">
                    <Layers className="w-5 h-5 text-parchment-500" />
                  </div>
                </div>

                {/* Legend list */}
                <div className="flex-1 w-full space-y-2 text-left">
                  {genres.slice(0, 4).map((gen, i) => {
                    const color = genreColors[i % genreColors.length];
                    const pctVal = Math.round((gen.count / totalGenreCount) * 100);
                    return (
                      <div key={gen.genre} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded shrink-0 block" style={{ backgroundColor: color }} />
                          <span className="text-parchment-300 truncate font-medium">{gen.genre}</span>
                        </div>
                        <span className="font-bold text-parchment-100">{pctVal}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Slide 3: Reviews / Final rating slide */}
        {activeSlide === 3 && (
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500">
                CRITICAL LENS
              </span>
              <h3 className="font-serif text-2xl font-bold">Average Year Score</h3>
            </div>

            {averageRating ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-serif text-6xl font-black text-amber-500">
                    {averageRating.toFixed(1)}
                  </span>
                  <div className="flex flex-col items-start">
                    <div className="flex text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(averageRating) ? "fill-current" : "opacity-25"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[9px] uppercase font-bold text-parchment-500 tracking-wider">
                      out of 5 stars
                    </span>
                  </div>
                </div>
                <p className="text-xs text-parchment-500 max-w-[240px] mx-auto leading-relaxed">
                  Your taste index for the year. Thanks for tracking your reading journey with Orbit!
                </p>
              </div>
            ) : (
              <p className="text-xs text-parchment-500 py-8">
                No ratings submitted for books finished in {year} yet.
              </p>
            )}
          </div>
        )}

        {/* Bottom Progress Bars */}
        <div className="flex justify-between items-center w-full pt-4 border-t border-ink-850 z-10">
          <div className="flex gap-1 flex-1 max-w-[180px]">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded-full ${
                  idx <= activeSlide ? "bg-amber-500" : "bg-ink-950"
                } transition-all duration-300`}
              />
            ))}
          </div>

          <span className="text-[10px] text-parchment-500 font-semibold uppercase tracking-wider">
            Slide {activeSlide + 1} of 4
          </span>
        </div>
      </div>

      {/* Nav controllers */}
      <div className="flex items-center gap-4 mt-6 z-10">
        <button
          onClick={handlePrev}
          disabled={activeSlide === 0}
          aria-label="Previous Slide"
          className="w-10 h-10 rounded-full bg-ink-900 border border-ink-800 text-parchment-300 hover:text-parchment-100 hover:border-ink-700 flex items-center justify-center shadow focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={handleNext}
          disabled={activeSlide === 3}
          aria-label="Next Slide"
          className="w-10 h-10 rounded-full bg-ink-900 border border-ink-800 text-parchment-300 hover:text-parchment-100 hover:border-ink-700 flex items-center justify-center shadow focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
