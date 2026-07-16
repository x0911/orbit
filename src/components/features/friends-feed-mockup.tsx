"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { Star, Clock } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitText from "@/components/SplitText";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

gsap.registerPlugin(ScrollTrigger);

interface MockActivity {
  id: string;
  user: {
    name: string;
    avatarInitials: string;
  };
  action: string;
  bookTitle: string;
  bookAuthor: string;
  bookCover: string;
  timestamp: string;
  rating?: number;
}

export default function FriendsFeedMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const mockActivities: MockActivity[] = [
    {
      id: "mock-1",
      user: { name: "Alex Carter", avatarInitials: "A" },
      action: "logged 32 pages of",
      bookTitle: "Neuromancer",
      bookAuthor: "William Gibson",
      bookCover: "https://covers.openlibrary.org/b/id/8291419-L.jpg",
      timestamp: "10 mins ago",
    },
    {
      id: "mock-2",
      user: { name: "Sarah Jenkins", avatarInitials: "S" },
      action: "finished reading",
      bookTitle: "Dune",
      bookAuthor: "Frank Herbert",
      bookCover: "https://covers.openlibrary.org/b/id/10128919-L.jpg",
      timestamp: "1 hour ago",
      rating: 5,
    },
    {
      id: "mock-3",
      user: { name: "Elena Rostova", avatarInitials: "E" },
      action: "started reading",
      bookTitle: "Snow Crash",
      bookAuthor: "Neal Stephenson",
      bookCover: "https://covers.openlibrary.org/b/id/9253459-L.jpg",
      timestamp: "3 hours ago",
    },
  ];

  useEffect(() => {
    if (prefersReducedMotion || !cardsRef.current) return;

    const cards = cardsRef.current.children;

    // Stagger slide & fade entrance for cards
    const anim = gsap.fromTo(
      cards,
      {
        opacity: 0,
        y: 40,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: cardsRef.current,
          start: "top 80%",
          toggleActions: "play none none reverse", // Reverses on scroll-up
        },
      },
    );

    return () => {
      anim.scrollTrigger?.kill();
      anim.kill();
    };
  }, [prefersReducedMotion]);

  return (
    <div ref={containerRef} className="max-w-xl mx-auto space-y-8">
      {/* Section Heading utilizing SplitText */}
      <div className="text-center space-y-2">
        <SplitText
          text="See What Friends Are Reading"
          className="font-sans text-2xl md:text-3xl font-bold tracking-wide text-parchment-100"
          splitType="words"
          delay={60}
          duration={0.8}
        />
        <p className="text-xs text-parchment-500 max-w-sm mx-auto">
          Reading is better together. Real-time updates from followed profiles.
        </p>
      </div>

      {/* Cards stack */}
      <div ref={cardsRef} className="space-y-4">
        {mockActivities.map((act) => {
          const showRating = act.rating;

          return (
            <div
              key={act.id}
              className={`p-5 bg-ink-900 border border-ink-850 rounded-2xl flex gap-4 text-left shadow-lg transition-transform duration-300 ${
                prefersReducedMotion
                  ? ""
                  : "hover:translate-y-[-2px] hover:border-ink-800"
              }`}
            >
              {/* Avatar circle (no emojis) */}
              <div className="w-10 h-10 rounded-full bg-ink-950 border border-ink-800 text-amber-500 flex items-center justify-center font-bold text-sm uppercase shrink-0 shadow-md">
                {act.user.avatarInitials}
              </div>

              {/* Info Column */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1 text-xs text-parchment-300">
                    <span className="font-bold text-parchment-100">
                      {act.user.name}
                    </span>
                    <span>{act.action}</span>
                  </div>

                  <h4 className="font-sans font-bold text-sm text-parchment-100 line-clamp-1">
                    {act.bookTitle}
                  </h4>
                  <p className="text-[10px] text-parchment-500">
                    by {act.bookAuthor}
                  </p>

                  {showRating && (
                    <div className="flex items-center gap-1 pt-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${star <= act.rating! ? "fill-current" : "opacity-20"}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[9px] text-parchment-500 pt-2.5">
                  <Clock className="w-3 h-3" />
                  <span>{act.timestamp}</span>
                </div>
              </div>

              {/* Book cover (small thumbnail 2:3 ratio) */}
              <div className="relative aspect-[2/3] w-12 shrink-0 rounded-lg overflow-hidden border border-ink-850 bg-ink-950 shadow-md">
                <Image
                  src={act.bookCover}
                  alt={`Cover of ${act.bookTitle}`}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
