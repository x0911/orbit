"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

gsap.registerPlugin(ScrollTrigger);

interface RingData {
  title: string;
  author: string;
  percentage: number;
  currentPage: number;
  totalPages: number;
  color: string;
}

const booksData: RingData[] = [
  {
    title: "The Odyssey",
    author: "Homer",
    percentage: 85,
    currentPage: 340,
    totalPages: 400,
    color: "#E6A62E",
  },
  {
    title: "Neuromancer",
    author: "William Gibson",
    percentage: 50,
    currentPage: 150,
    totalPages: 300,
    color: "#F2B84B",
  },
  {
    title: "1984",
    author: "George Orwell",
    percentage: 20,
    currentPage: 40,
    totalPages: 200,
    color: "#C4881B",
  },
];

// Circle dimensions (radius = 45, circumference = 2 * PI * 45 = 282.74)
const radius = 45;
const circumference = 2 * Math.PI * radius; // 282.743

export default function ProgressRings() {
  const containerRef = useRef<HTMLDivElement>(null);
  const ring1Ref = useRef<SVGCircleElement>(null);
  const ring2Ref = useRef<SVGCircleElement>(null);
  const ring3Ref = useRef<SVGCircleElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Numeric count-up states
  const [val1, setVal1] = useState(0);
  const [val2, setVal2] = useState(0);
  const [val3, setVal3] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const ringRefs = [ring1Ref.current, ring2Ref.current, ring3Ref.current];

    if (prefersReducedMotion) {
      // Instant set for reduced motion
      setVal1(booksData[0].percentage);
      setVal2(booksData[1].percentage);
      setVal3(booksData[2].percentage);

      ringRefs.forEach((ring, i) => {
        if (ring) {
          const targetOffset =
            circumference * (1 - booksData[i].percentage / 100);
          ring.style.strokeDashoffset = targetOffset.toString();
        }
      });
      return;
    }

    // Set initial dash offsets
    ringRefs.forEach((ring) => {
      if (ring) {
        ring.style.strokeDashoffset = circumference.toString();
      }
    });

    const numbersObj = { count1: 0, count2: 0, count3: 0 };
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 75%",
        end: "bottom 25%",
        toggleActions: "play none none reverse", // Reverses cleanly on scroll-up
      },
    });

    // 1. Animate percentage counts
    timeline.to(
      numbersObj,
      {
        count1: booksData[0].percentage,
        count2: booksData[1].percentage,
        count3: booksData[2].percentage,
        duration: 1.4,
        ease: "power2.out",
        onUpdate: () => {
          setVal1(Math.round(numbersObj.count1));
          setVal2(Math.round(numbersObj.count2));
          setVal3(Math.round(numbersObj.count3));
        },
      },
      0,
    );

    // 2. Animate SVG stroke offsets (staggered)
    ringRefs.forEach((ring, i) => {
      if (ring) {
        const targetOffset =
          circumference * (1 - booksData[i].percentage / 100);
        timeline.to(
          ring,
          {
            strokeDashoffset: targetOffset,
            duration: 1.2,
            ease: "power2.out",
          },
          i * 0.25, // Stagger ring fillings
        );
      }
    });

    return () => {
      timeline.kill();
    };
  }, [prefersReducedMotion]);

  const vals = [val1, val2, val3];
  const refs = [ring1Ref, ring2Ref, ring3Ref];

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 py-8 max-w-4xl mx-auto justify-items-center"
    >
      {booksData.map((book, i) => {
        const currentRef = refs[i];
        const displayVal = vals[i];

        return (
          <div
            key={i}
            className="flex flex-col items-center bg-ink-900 border border-ink-850 p-6 rounded-2xl w-full max-w-[240px] shadow-lg hover:border-ink-800 transition-colors"
          >
            {/* SVG Ring Container */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 110 110"
              >
                {/* Background track circle */}
                <circle
                  cx="55"
                  cy="55"
                  r={radius}
                  className="stroke-ink-950 fill-none"
                  strokeWidth="8"
                />
                {/* Foreground animated progress circle */}
                <circle
                  ref={currentRef}
                  cx="55"
                  cy="55"
                  r={radius}
                  stroke={book.color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="fill-none transition-all duration-75"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference}
                />
              </svg>
              {/* Inner Label */}
              <div className="absolute text-center">
                <span className="font-sans text-xl font-bold tracking-tight text-parchment-100">
                  {displayVal}%
                </span>
              </div>
            </div>

            {/* Book Details */}
            <div className="mt-5 text-center space-y-1.5">
              <h3 className="font-sans font-bold text-sm text-parchment-100 line-clamp-1">
                {book.title}
              </h3>
              <p className="text-[11px] text-parchment-500">by {book.author}</p>
              <div className="text-[10px] text-amber-500 font-semibold px-2 py-0.5 rounded bg-amber-500/5 border border-amber-500/10 inline-block">
                Page {Math.round((displayVal / 100) * book.totalPages)} of{" "}
                {book.totalPages}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
