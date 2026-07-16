"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { Boxes, Loader2 } from "lucide-react";
import ShelfView from "@/components/features/shelf-view";
import type { LibraryBook } from "@/components/features/library-3d-experience";

const Library3DExperience = dynamic(
  () => import("@/components/features/library-3d-experience"),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-xs text-parchment-500 uppercase tracking-widest">
          Building your library...
        </p>
      </div>
    ),
  },
);

interface ShelfItem {
  id: string;
  status: "want_to_read" | "reading" | "finished";
  current_page: number;
  books: {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
    page_count: number;
    genre: string;
    slug: string;
  };
}

export default function Shelf3DToggle({
  initialShelves,
  initialReviewMap,
}: {
  initialShelves: ShelfItem[];
  initialReviewMap: Record<string, number>;
}) {
  const [mode, setMode] = useState<"normal" | "active">("normal");
  const [transitioning, setTransitioning] = useState(false);

  const libraryBooks: LibraryBook[] = useMemo(
    () =>
      initialShelves
        .filter((s) => !!s.books)
        .map((s) => ({
          shelfId: s.id,
          bookId: s.books.id,
          title: s.books.title,
          author: s.books.author,
          coverUrl: s.books.cover_url,
          genre: s.books.genre || "Fiction",
          pageCount: s.books.page_count || 200,
          currentPage: s.current_page,
          status: s.status,
          rating: initialReviewMap[s.books.id] ?? null,
        })),
    [initialShelves, initialReviewMap],
  );

  const handleEnter = useCallback(() => {
    setTransitioning(true);
    // Let the normal view fade out before mounting the heavy 3D canvas
    setTimeout(() => {
      setMode("active");
    }, 220);
  }, []);

  const handleExit = useCallback(() => {
    setMode("normal");
    setTimeout(() => setTransitioning(false), 30);
  }, []);

  return (
    <div className="relative">
      <div
        className={`transition-all duration-200 ${
          transitioning ? "opacity-0 scale-[0.98] pointer-events-none" : "opacity-100 scale-100"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="text-left">
            <h1 className="font-sans text-3xl font-bold tracking-wide text-parchment-100">
              My Library Shelf
            </h1>
            <p className="text-sm text-parchment-500 mt-1">
              Keep track of books you want to read, are currently reading, or have
              completed.
            </p>
          </div>

          <button
            onClick={handleEnter}
            disabled={libraryBooks.length === 0}
            className="shrink-0 inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-ink-950 font-bold px-5 py-3 rounded-xl text-sm shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer"
            title={
              libraryBooks.length === 0
                ? "Add a book to your shelf first"
                : "Step inside a 3D library built from your shelf"
            }
          >
            <Boxes className="w-4 h-4" />
            Enter 3D Mode
          </button>
        </div>

        <ShelfView initialShelves={initialShelves} initialReviewMap={initialReviewMap} />
      </div>

      {mode === "active" && (
        <Library3DExperience books={libraryBooks} onExit={handleExit} />
      )}
    </div>
  );
}
