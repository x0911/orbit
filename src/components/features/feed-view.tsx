"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, Clock, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AnimatedList from "@/components/AnimatedList";

interface FeedActivity {
  id: string;
  type: "status_update" | "pages_logged";
  username: string;
  displayName: string;
  bookTitle: string;
  bookAuthor: string;
  bookCover: string | null;
  bookSlug: string;
  timestamp: string;
  pagesRead?: number;
  statusValue?: string;
  ratingValue?: number;
}

export default function FeedView({
  initialActivities,
}: {
  initialActivities: FeedActivity[];
}) {
  const router = useRouter();
  const [activities, setActivities] =
    useState<FeedActivity[]>(initialActivities);

  // Sync state with server props
  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  // Set up Supabase Realtime Listener
  useEffect(() => {
    const supabase = createClient();

    // Listen for inserts or updates to trigger Next.js page re-fetch
    const channel = supabase
      .channel("friend-activity-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shelves" },
        () => {
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reading_logs" },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // Map each activity item to a JSX element for AnimatedList
  const listElements = activities.map((act) => {
    const isFinished = act.statusValue === "finished";
    const isReading = act.statusValue === "reading";
    const isWishlist = act.statusValue === "want_to_read";

    return (
      <div
        key={`${act.type}-${act.id}`}
        className="p-5 bg-ink-900 border border-ink-850 hover:border-ink-800 transition-all rounded-xl flex gap-4 text-left shadow-md w-full"
      >
        {/* Book cover (small thumbnail 2:3) */}
        <Link
          href={`/book/${act.bookSlug}`}
          className="relative aspect-[2/3] w-12 shrink-0 rounded-lg overflow-hidden border border-ink-850 bg-ink-950 shadow"
        >
          {act.bookCover ? (
            <Image
              src={act.bookCover}
              alt={`Cover of ${act.bookTitle}`}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 p-1 flex items-center justify-center text-center font-sans text-[8px] text-parchment-500 bg-ink-900">
              {act.bookTitle}
            </div>
          )}
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-parchment-300">
              <Link
                href={`/u/${act.username}`}
                className="font-bold text-parchment-100 hover:text-amber-500 transition-colors"
              >
                {act.displayName}
              </Link>

              {act.type === "pages_logged" && (
                <span>
                  logged{" "}
                  <span className="font-semibold text-amber-500">
                    {act.pagesRead} pages
                  </span>{" "}
                  of
                </span>
              )}

              {act.type === "status_update" && isFinished && (
                <span>finished reading</span>
              )}
              {act.type === "status_update" && isReading && (
                <span>started reading</span>
              )}
              {act.type === "status_update" && isWishlist && (
                <span>added to wishlist</span>
              )}
            </div>

            <Link
              href={`/book/${act.bookSlug}`}
              className="font-sans font-bold text-sm text-parchment-100 hover:text-amber-500 transition-colors line-clamp-1 block"
            >
              {act.bookTitle}
            </Link>
            <p className="text-[10px] text-parchment-500">
              by {act.bookAuthor}
            </p>

            {/* Special display for ratings */}
            {act.type === "status_update" && isFinished && act.ratingValue && (
              <div className="flex items-center gap-1 pt-1 text-amber-500 text-xs">
                <span className="text-[10px] text-parchment-500">Rated:</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= act.ratingValue! ? "fill-current" : "opacity-25"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-[10px] text-parchment-500 pt-2">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {new Date(act.timestamp).toLocaleDateString()}{" "}
              {new Date(act.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>
    );
  });

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {activities.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-ink-900 border border-ink-850 border-dashed">
          <Activity className="w-8 h-8 text-parchment-500 mx-auto mb-4 opacity-50" />
          <p className="text-parchment-500 text-sm">
            No activity in your feed. Follow other readers to see their reading
            progress!
          </p>
        </div>
      ) : (
        <AnimatedList
          items={listElements}
          className="max-w-xl"
          displayScrollbar={false}
          showGradients={false}
          enableArrowNavigation={false}
        />
      )}
    </div>
  );
}
