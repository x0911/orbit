"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

gsap.registerPlugin(ScrollTrigger);

const targets = {
  books: 24,
  pages: 8450,
  genres: 7,
  sciFiPct: 45,
  fantasyPct: 35,
  fictionPct: 20,
};

export default function WrappedPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<SVGSVGElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Stat counter states
  const [booksRead, setBooksRead] = useState(0);
  const [pagesTurned, setPagesTurned] = useState(0);
  const [genresCount, setGenresCount] = useState(0);

  // SVG bar rect width states (for individual inline animating)
  const [sciFiWidth, setSciFiWidth] = useState(0);
  const [fantasyWidth, setFantasyWidth] = useState(0);
  const [fictionWidth, setFictionWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    if (prefersReducedMotion) {
      // Set instantly
      setBooksRead(targets.books);
      setPagesTurned(targets.pages);
      setGenresCount(targets.genres);
      setSciFiWidth(targets.sciFiPct);
      setFantasyWidth(targets.fantasyPct);
      setFictionWidth(targets.fictionPct);
      return;
    }

    const stateObj = { books: 0, pages: 0, genres: 0, sf: 0, fan: 0, fic: 0 };

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 75%",
        toggleActions: "play none none reverse", // Reverses on scroll-up
      },
    });

    // 1. Animate stat numbers count up
    timeline.to(
      stateObj,
      {
        books: targets.books,
        pages: targets.pages,
        genres: targets.genres,
        duration: 1.5,
        ease: "power2.out",
        onUpdate: () => {
          setBooksRead(Math.round(stateObj.books));
          setPagesTurned(Math.round(stateObj.pages));
          setGenresCount(Math.round(stateObj.genres));
        },
      },
      0,
    );

    // 2. Animate SVG stacked bar widths
    timeline.to(
      stateObj,
      {
        sf: targets.sciFiPct,
        fan: targets.fantasyPct,
        fic: targets.fictionPct,
        duration: 1.2,
        ease: "power2.out",
        onUpdate: () => {
          setSciFiWidth(stateObj.sf);
          setFantasyWidth(stateObj.fan);
          setFictionWidth(stateObj.fic);
        },
      },
      0.2, // slight delay
    );

    return () => {
      timeline.kill();
    };
  }, [prefersReducedMotion]);

  // Format helper for pages number
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <div ref={containerRef} className="max-w-4xl mx-auto space-y-12 py-8 px-4">
      {/* Counters Grid */}
      <div className="grid grid-cols-3 gap-4 md:gap-8 text-center">
        <div className="bg-ink-900 border border-ink-850 p-6 rounded-2xl space-y-1 shadow-lg">
          <span className="block font-sans text-3xl md:text-5xl font-bold tracking-tight text-amber-500">
            {booksRead}
          </span>
          <span className="block text-[10px] md:text-xs text-parchment-500 uppercase font-semibold tracking-wider">
            Books Read
          </span>
        </div>

        <div className="bg-ink-900 border border-ink-850 p-6 rounded-2xl space-y-1 shadow-lg">
          <span className="block font-sans text-3xl md:text-5xl font-bold tracking-tight text-amber-500">
            {formatNumber(pagesTurned)}
          </span>
          <span className="block text-[10px] md:text-xs text-parchment-500 uppercase font-semibold tracking-wider">
            Pages Logged
          </span>
        </div>

        <div className="bg-ink-900 border border-ink-850 p-6 rounded-2xl space-y-1 shadow-lg">
          <span className="block font-sans text-3xl md:text-5xl font-bold tracking-tight text-amber-500">
            {genresCount}
          </span>
          <span className="block text-[10px] md:text-xs text-parchment-500 uppercase font-semibold tracking-wider">
            Genres Read
          </span>
        </div>
      </div>

      {/* SVG Genre Breakdown Bar Chart */}
      <div className="bg-ink-900 border border-ink-850 p-8 rounded-2xl space-y-6 shadow-lg">
        <div className="text-left space-y-1">
          <h3 className="font-sans font-bold text-sm text-parchment-100">
            Genre Breakdown Preview
          </h3>
          <p className="text-xs text-parchment-500">
            Visual breakdown of your reading distribution
          </p>
        </div>

        {/* Hand-rolled horizontal stacked SVG bar chart */}
        <div className="w-full h-8 rounded-xl overflow-hidden border border-ink-950 bg-ink-950">
          <svg
            ref={chartRef}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Sci-Fi rect */}
            <rect
              x="0"
              y="0"
              width={`${sciFiWidth}%`}
              height="100%"
              fill="#059669"
            />
            {/* Fantasy rect */}
            <rect
              x={`${sciFiWidth}%`}
              y="0"
              width={`${fantasyWidth}%`}
              height="100%"
              fill="#10B981"
            />
            {/* Fiction rect */}
            <rect
              x={`${sciFiWidth + fantasyWidth}%`}
              y="0"
              width={`${fictionWidth}%`}
              height="100%"
              fill="#34D399"
            />
          </svg>
        </div>

        {/* Chart Legend */}
        <div className="flex flex-wrap justify-between items-center gap-4 text-xs font-semibold pt-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[#059669] block" />
            <span className="text-parchment-300">
              Sci-Fi ({Math.round(sciFiWidth)}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[#10B981] block" />
            <span className="text-parchment-300">
              Fantasy ({Math.round(fantasyWidth)}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[#34D399] block" />
            <span className="text-parchment-300">
              Fiction ({Math.round(fictionWidth)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
