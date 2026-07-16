"use client";

import { useState, useCallback, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Plus, CheckCircle, Loader2, BookOpen } from "lucide-react";
import { addToShelf } from "@/app/app/shelf/actions";

interface OpenLibraryBook {
  title: string;
  author: string;
  open_library_id: string;
  cover_url: string | null;
  page_count: number;
  genre: string;
  slug?: string;
}

interface DiscoverClientProps {
  initialResults: OpenLibraryBook[];
  initialQuery: string;
  initialGenre: string;
  initialPage: number;
  totalPages: number;
  totalItems: number;
  loadingError: string;
  initialStatusMap: Record<string, string>;
  isLoggedIn: boolean;
}

const GENRES = [
  { label: "All Genres", value: "" },
  { label: "Fantasy", value: "fantasy" },
  { label: "Science Fiction", value: "science_fiction" },
  { label: "Mystery", value: "mystery" },
  { label: "Thriller", value: "thrillers" },
  { label: "Romance", value: "romance" },
  { label: "Horror", value: "horror" },
  { label: "Historical Fiction", value: "historical_fiction" },
  { label: "Adventure", value: "adventure" },
  { label: "Young Adult", value: "young_adult_fiction" },
  { label: "Children's", value: "children" },
  { label: "Biography", value: "biography" },
  { label: "History", value: "history" },
  { label: "Poetry", value: "poetry" },
  { label: "Classics", value: "classic_literature" },
  { label: "Crime", value: "crime" },
  { label: "Comics & Graphic Novels", value: "comics" },
  { label: "Self-Help", value: "self_help" },
  { label: "Business", value: "business" },
  { label: "Religion & Spirituality", value: "religion" },
  { label: "Cooking", value: "cooking" },
];

export default function DiscoverClient({
  initialResults,
  initialQuery,
  initialGenre,
  initialPage,
  totalPages,
  totalItems,
  loadingError,
  initialStatusMap,
  isLoggedIn,
}: DiscoverClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // ── Local state ────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState(initialQuery);
  // Optimistic shelf status map — updated immediately on submit
  const [statusMap, setStatusMap] =
    useState<Record<string, string>>(initialStatusMap);
  // Client-selected local status map for toggling before submit
  const [selectedStatusMap, setSelectedStatusMap] = useState<
    Record<string, string>
  >({});
  // Per-book loading / success state for shelf buttons
  const [bookLoading, setBookLoading] = useState<Record<string, boolean>>({});
  const [bookSuccess, setBookSuccess] = useState<Record<string, boolean>>({});
  const [bookError, setBookError] = useState<Record<string, string>>({});
  // Global banner for error fallback
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  // ── URL navigation helper ──────────────────────────────────────────────
  const navigateTo = useCallback(
    (q: string, genre: string, page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("q", q);
      params.set("genre", genre);
      params.set("page", String(page));
      startTransition(() => {
        router.push(`/discover?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  // ── Search form submit ─────────────────────────────────────────────────
  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    navigateTo(searchInput.trim(), initialGenre, 1);
  };

  // ── Genre filter click ─────────────────────────────────────────────────
  const handleGenreClick = (genre: string) => {
    navigateTo(initialQuery, genre, 1);
  };

  // ── Pagination ─────────────────────────────────────────────────────────
  const handlePageChange = (newPage: number) => {
    navigateTo(initialQuery, initialGenre, newPage);
  };

  // ── Add/Update shelf — optimistic, no redirect ─────────────────────────
  const handleAddToShelf = useCallback(
    async (book: OpenLibraryBook, status: string) => {
      const olId = book.open_library_id;

      // Immediately update UI optimistically
      setStatusMap((prev) => ({ ...prev, [olId]: status }));
      setBookLoading((prev) => ({ ...prev, [olId]: true }));
      setBookSuccess((prev) => ({ ...prev, [olId]: false }));
      setBookError((prev) => ({ ...prev, [olId]: "" }));
      setBanner(null);

      try {
        const res = await addToShelf(
          {
            title: book.title,
            author: book.author,
            cover_url: book.cover_url || "",
            open_library_id: olId,
            page_count: book.page_count || 200,
            genre: book.genre || "Fiction",
          },
          status as "want_to_read" | "reading" | "finished",
        );

        if (res.success) {
          setBookSuccess((prev) => ({ ...prev, [olId]: true }));
          setBanner({
            type: "success",
            msg: `"${book.title}" shelf status updated!`,
          });
          // Auto-clear success tick after 2s
          setTimeout(() => {
            setBookSuccess((prev) => ({ ...prev, [olId]: false }));
          }, 2000);
        } else {
          // Revert optimistic update on error
          setStatusMap((prev) => {
            const reverted = { ...prev };
            delete reverted[olId];
            return reverted;
          });
          const errMsg = res.error || "Failed to update shelf";
          setBookError((prev) => ({ ...prev, [olId]: errMsg }));
          setBanner({ type: "error", msg: errMsg });
        }
      } catch {
        setStatusMap((prev) => {
          const reverted = { ...prev };
          delete reverted[olId];
          return reverted;
        });
        setBookError((prev) => ({ ...prev, [olId]: "Network error" }));
        setBanner({ type: "error", msg: "Network error. Please try again." });
      } finally {
        setBookLoading((prev) => ({ ...prev, [olId]: false }));
      }
    },
    [],
  );

  return (
    <div className="space-y-8">
      {/* ── Global banner ─────────────────────────────────────────────── */}
      {banner && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 text-sm shadow-sm transition-all ${
            banner.type === "success"
              ? "dark:bg-emerald-950/40 border dark:border-emerald-900/50 dark:text-emerald-200 bg-emerald-100/40 border-emerald-200/50 text-emerald-800"
              : "dark:bg-red-950/40 border dark:border-red-900/50 dark:text-red-200 bg-red-100/40 border-red-200/50 text-red-800"
          }`}
        >
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{banner.msg}</span>
          <button
            onClick={() => setBanner(null)}
            className="ml-auto text-current opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Search Bar ────────────────────────────────────────────────── */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-parchment-500" />
          <input
            name="q"
            type="text"
            value={searchInput || ""}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title, author, or keyword..."
            className="w-full bg-ink-900 border border-ink-800 rounded-xl py-3 pl-12 pr-4 text-parchment-100 placeholder-parchment-500/40 text-sm focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-ink-950 font-semibold px-6 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer flex items-center gap-2"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Search
        </button>
      </form>

      {/* ── Genre Filters ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-850 pb-4 text-left">
        <span className="text-xs font-semibold text-parchment-500 uppercase tracking-widest mr-2">
          Filter Genre:
        </span>
        {GENRES.map((g) => {
          const isActive = initialGenre === g.value;
          return (
            <button
              key={g.label}
              onClick={() => handleGenreClick(g.value)}
              disabled={isPending}
              className={`text-xs px-3.5 py-1.5 rounded-full border transition-all duration-200 cursor-pointer disabled:opacity-60 ${
                isActive
                  ? "bg-amber-500/10 border-amber-500/50 text-amber-500 font-bold"
                  : "bg-ink-900 border-ink-850 text-parchment-500 hover:text-parchment-100 hover:border-ink-800"
              }`}
            >
              {g.label}
            </button>
          );
        })}
        {isPending && (
          <Loader2 className="w-3.5 h-3.5 text-parchment-500 animate-spin ml-1" />
        )}
      </div>

      {/* ── Books Grid ─────────────────────────────────────────────────── */}
      <div className="space-y-6 text-left">
        <h2 className="text-xs font-semibold text-parchment-500 uppercase tracking-widest">
          {initialQuery
            ? `Search Results for "${initialQuery}"`
            : "Featured Reading Selections"}
          {totalItems > 0 && (
            <span className="ml-2 text-parchment-500/60 normal-case tracking-normal">
              ({totalItems.toLocaleString()} total)
            </span>
          )}
        </h2>

        {loadingError && (
          <p className="text-red-400 text-sm py-4">{loadingError}</p>
        )}

        {initialResults.length === 0 && !loadingError && !isPending && (
          <div className="text-center py-12 rounded-xl bg-ink-900 border border-ink-800 border-dashed">
            <p className="text-parchment-500 text-sm">
              No books found matching your query. Try another search.
            </p>
          </div>
        )}

        {/* Loading skeleton overlay while navigating */}
        {isPending && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-ink-900 border border-ink-800 rounded-xl p-5 flex flex-col gap-4 shadow-lg"
              >
                <div className="shelf-card-skeleton aspect-[2/3] w-32 mx-auto rounded-lg" />
                <div className="space-y-2 text-center">
                  <div className="shelf-card-skeleton h-3 rounded w-3/4 mx-auto" />
                  <div className="shelf-card-skeleton h-2.5 rounded w-1/2 mx-auto" />
                </div>
                <div className="shelf-card-skeleton h-8 rounded-lg mt-auto" />
              </div>
            ))}
          </div>
        )}

        {!isPending && initialResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {initialResults.map((book, i) => {
              const olId = book.open_library_id;
              const currentStatus = statusMap[olId];
              const cleanStatusLabel = currentStatus
                ? currentStatus.replace(/_/g, " ")
                : null;
              const isLoading = !!bookLoading[olId];
              const isSuccess = !!bookSuccess[olId];
              const cardError = bookError[olId];
              const hasStatusChanged = selectedStatusMap[olId] !== undefined && selectedStatusMap[olId] !== currentStatus;
              const isButtonDisabled = isLoading || (!!currentStatus && !hasStatusChanged);

              const bookDetailUrl = `/book/${book.slug || olId}`;

              return (
                <div
                  key={i}
                  className="bg-ink-900 border border-ink-800 rounded-xl p-5 flex flex-col justify-between shadow-lg hover:border-ink-700 transition-all hover:translate-y-[-2px] duration-300"
                >
                  <div className="space-y-4">
                    {/* Cover & title link */}
                    <Link
                      href={bookDetailUrl}
                      className="block group/cover space-y-4"
                    >
                      <div className="relative aspect-[2/3] w-32 mx-auto rounded-lg overflow-hidden border border-ink-800 bg-ink-950 shadow-md group-hover/cover:border-amber-500/50 transition-all">
                        {book.cover_url ? (
                          <Image
                            src={book.cover_url}
                            alt={`Cover of ${book.title}`}
                            fill
                            sizes="128px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-parchment-500 text-[10px] p-2 text-center font-sans leading-tight">
                            {book.title}
                          </div>
                        )}
                      </div>

                      <div className="text-center space-y-1">
                        <h3 className="font-sans font-bold text-parchment-100 text-sm line-clamp-1 group-hover/cover:text-amber-500 transition-colors">
                          {book.title}
                        </h3>
                        <p className="text-xs text-parchment-300 line-clamp-1">
                          {book.author}
                        </p>
                      </div>
                    </Link>

                    <div className="text-center space-y-1">
                      <p className="text-[10px] text-parchment-500">
                        {book.page_count} pages • {book.genre}
                      </p>

                      {cleanStatusLabel && (
                        <div className="inline-flex mt-1 text-[9px] font-semibold bg-amber-500/10 border border-amber-500/25 text-amber-500 px-2 py-0.5 rounded uppercase tracking-wider">
                          On Shelf: {cleanStatusLabel}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shelf controls */}
                  <div className="mt-5 pt-4 border-t border-ink-850">
                    {isLoggedIn ? (
                      <div className="flex flex-col gap-3">
                        {cardError && (
                          <p className="text-[10px] text-red-400 text-center">
                            {cardError}
                          </p>
                        )}

                        {/* Status radio buttons */}
                        <div
                          className="flex gap-1.5"
                          role="radiogroup"
                          aria-label="Shelf status selector"
                          id={`shelf-status-${olId}`}
                        >
                          {[
                            { value: "want_to_read", label: "Wishlist" },
                            { value: "reading", label: "Reading" },
                            { value: "finished", label: "Finished" },
                          ].map((opt) => {
                            const activeStatus =
                              selectedStatusMap[olId] ||
                              currentStatus ||
                              "want_to_read";
                            const checked = activeStatus === opt.value;
                            return (
                              <label
                                key={opt.value}
                                className={`flex-1 text-center py-1.5 rounded-lg text-[9px] font-semibold border cursor-pointer select-none transition-all ${
                                  checked
                                    ? "bg-amber-500/10 border-amber-500/40 text-amber-500"
                                    : "bg-ink-950 border-ink-850 text-parchment-500 hover:text-parchment-300"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`status-${olId}`}
                                  value={opt.value}
                                  checked={!!checked}
                                  className="sr-only"
                                  onChange={() => {
                                    setSelectedStatusMap((prev) => ({
                                      ...prev,
                                      [olId]: opt.value,
                                    }));
                                  }}
                                />
                                {opt.label}
                              </label>
                            );
                          })}
                        </div>

                        {/* Submit button — fully client-side, no form action redirect */}
                        <button
                          type="button"
                          disabled={isButtonDisabled}
                          onClick={() => {
                            const selectedStatus =
                              selectedStatusMap[olId] ||
                              currentStatus ||
                              "want_to_read";

                            handleAddToShelf(book, selectedStatus);
                          }}
                          className={`w-full py-2 rounded-lg text-xs font-semibold transition-all focus:outline-none flex items-center justify-center gap-1 border ${
                            isSuccess
                              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                              : isButtonDisabled
                                ? "bg-ink-800/40 border-ink-850/40 text-parchment-500 cursor-not-allowed"
                                : "bg-ink-800 hover:bg-amber-500 hover:text-ink-950 text-parchment-100 border-ink-850 hover:border-transparent cursor-pointer"
                          }`}
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isSuccess ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              Saved!
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              {currentStatus ? "Update Status" : "Add to Shelf"}
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <Link
                        href="/login"
                        className="w-full bg-ink-800 hover:bg-ink-750 text-parchment-300 hover:text-parchment-100 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 border border-ink-850"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Sign In to Add
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !isPending && (
          <div className="flex items-center justify-center gap-4 pt-6 border-t border-ink-850">
            <button
              onClick={() => handlePageChange(initialPage - 1)}
              disabled={initialPage <= 1 || isPending}
              className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                initialPage > 1
                  ? "bg-ink-900 border-ink-800 text-parchment-100 hover:bg-ink-800 cursor-pointer"
                  : "opacity-40 pointer-events-none text-parchment-500 border-ink-850"
              }`}
            >
              Previous
            </button>
            <span className="text-xs text-parchment-500 font-semibold uppercase tracking-wider">
              Page {initialPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(initialPage + 1)}
              disabled={initialPage >= totalPages || isPending}
              className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                initialPage < totalPages
                  ? "bg-ink-900 border-ink-800 text-parchment-100 hover:bg-ink-800 cursor-pointer"
                  : "opacity-40 pointer-events-none text-parchment-500 border-ink-850"
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
