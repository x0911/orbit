"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Trash2, Edit3, X, ArrowRight } from "lucide-react";
import TiltedCard from "@/components/TiltedCard";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  logProgress,
  saveReview,
  removeFromShelf,
} from "@/app/app/shelf/actions";

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

/** Small pulsing skeleton card shown before entrance animation */
function SkeletonCard() {
  return (
    <div className="flex flex-col items-center">
      <div
        className="shelf-card-skeleton rounded-xl border border-ink-800"
        style={{ width: "160px", height: "240px" }}
      />
      <div className="mt-3 space-y-1.5 w-full px-2">
        <div className="shelf-card-skeleton h-2.5 rounded w-3/4 mx-auto" />
        <div className="shelf-card-skeleton h-2 rounded w-1/2 mx-auto" />
      </div>
    </div>
  );
}

export default function ShelfView({
  initialShelves,
  initialReviewMap,
}: {
  initialShelves: ShelfItem[];
  initialReviewMap: Record<string, number>;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [shelves, setShelves] = useState<ShelfItem[]>(initialShelves);
  const [reviewMap, setReviewMap] =
    useState<Record<string, number>>(initialReviewMap);
  const [selectedItem, setSelectedItem] = useState<ShelfItem | null>(null);
  const [animateModal, setAnimateModal] = useState(false);

  // ── Entrance animation state ───────────────────────────────────────────
  // After mount we flip this to start the stagger cascade
  const [isReady, setIsReady] = useState(false);
  // Per-section visibility (driven by IntersectionObserver)
  const [sectionVisible, setSectionVisible] = useState<[boolean, boolean, boolean]>([
    false,
    false,
    false,
  ]);
  const sectionRefs = [
    useRef<HTMLElement>(null),
    useRef<HTMLElement>(null),
    useRef<HTMLElement>(null),
  ];

  // Form states in modal
  const [pagesLogValue, setPagesLogValue] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Group items by status
  const reading = shelves.filter((s) => s.status === "reading");
  const wantToRead = shelves.filter((s) => s.status === "want_to_read");
  const finished = shelves.filter((s) => s.status === "finished");

  // Keep state synced with server props
  useEffect(() => {
    setShelves(initialShelves);
  }, [initialShelves]);

  useEffect(() => {
    setReviewMap(initialReviewMap);
  }, [initialReviewMap]);

  // ── Trigger entrance animations after first paint ──────────────────────
  useEffect(() => {
    // One RAF to let browser paint the skeletons first
    const raf = requestAnimationFrame(() => {
      setIsReady(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── IntersectionObserver for each shelf column ─────────────────────────
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    sectionRefs.forEach((ref, idx) => {
      if (!ref.current) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setSectionVisible((prev) => {
              const next = [...prev] as [boolean, boolean, boolean];
              next[idx] = true;
              return next;
            });
            observer.disconnect();
          }
        },
        { threshold: 0.08 }
      );
      observer.observe(ref.current);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open modal handler
  const handleOpenItem = useCallback(async (item: ShelfItem) => {
    setSelectedItem(item);
    setPagesLogValue("");
    setReviewRating(reviewMap[item.books.id] || 5);
    setActionError("");
    setActionSuccess("");
    setReviewBody("");
    setTimeout(() => setAnimateModal(true), 10);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewMap]);

  // Close modal handler
  const handleCloseModal = useCallback(() => {
    setAnimateModal(false);
    setTimeout(() => setSelectedItem(null), 200);
  }, []);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCloseModal]);

  // Trap focus inside modal
  useEffect(() => {
    if (!selectedItem) return;
    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex="0"]',
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    const timeout = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    modal.addEventListener("keydown", handleTab);
    return () => {
      clearTimeout(timeout);
      modal.removeEventListener("keydown", handleTab);
    };
  }, [selectedItem]);

  // Handle progress logging
  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const pages = parseInt(pagesLogValue, 10);
    if (isNaN(pages) || pages <= 0) {
      setActionError("Please enter a valid page count");
      return;
    }

    const maxPages = selectedItem.books.page_count - selectedItem.current_page;
    if (pages > maxPages) {
      setActionError(`You can log at most ${maxPages} pages`);
      return;
    }

    setActionError("");
    setActionSuccess("");

    const res = await logProgress(selectedItem.id, pages);
    if (res.success) {
      setActionSuccess("Pages logged successfully!");
      setPagesLogValue("");

      // Update local state instantly — no page reload
      const updatedShelves = shelves.map((s) => {
        if (s.id === selectedItem.id) {
          const newPage = s.current_page + pages;
          const isFinished = newPage >= s.books.page_count;
          return {
            ...s,
            current_page: newPage,
            status: (isFinished ? "finished" : "reading") as
              | "reading"
              | "finished",
          };
        }
        return s;
      });
      setShelves(updatedShelves);

      const active = updatedShelves.find((s) => s.id === selectedItem.id);
      if (active) setSelectedItem(active);
    } else {
      setActionError(res.error || "Failed to log progress");
    }
  };

  // Handle Review submit
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setActionError("");
    setActionSuccess("");

    const res = await saveReview(
      selectedItem.books.id,
      reviewRating,
      reviewBody,
    );
    if (res.success) {
      setActionSuccess("Review saved successfully!");
      setReviewMap((prev) => ({
        ...prev,
        [selectedItem.books.id]: reviewRating,
      }));
    } else {
      setActionError(res.error || "Failed to save review");
    }
  };

  // Handle remove book
  const handleRemoveBook = async () => {
    if (!selectedItem) return;
    if (
      !confirm(`Are you sure you want to remove "${selectedItem.books.title}"?`)
    )
      return;

    const res = await removeFromShelf(selectedItem.id);
    if (res.success) {
      setShelves(shelves.filter((s) => s.id !== selectedItem.id));
      handleCloseModal();
    } else {
      setActionError(res.error || "Failed to remove book");
    }
  };

  // ── Card renderer ──────────────────────────────────────────────────────
  const renderBookCard = (item: ShelfItem, cardIndex: number) => {
    const book = item.books;
    const progressPct = Math.round((item.current_page / book.page_count) * 100);
    const userRating = reviewMap[book.id];
    const delay = cardIndex * 80; // 80ms stagger per card

    return (
      <div
        key={item.id}
        className={`group flex flex-col items-center ${
          isReady ? "shelf-card-enter" : "opacity-0"
        }`}
        style={isReady ? { animationDelay: `${delay}ms` } : {}}
      >
        <button
          onClick={() => handleOpenItem(item)}
          className="relative text-left rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-300 hover:scale-[1.05] cursor-pointer group/card"
          style={{ width: "160px", height: "240px" }}
          aria-label={`Open details for ${book.title}`}
        >
          {/* Glow halo on hover */}
          <span
            className="absolute inset-0 rounded-xl pointer-events-none z-10 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
            style={{ boxShadow: "0 0 20px 2px rgba(230,166,46,0.22), 0 0 40px 4px rgba(230,166,46,0.08)" }}
          />

          {prefersReducedMotion ? (
            <div className="relative w-full h-full border border-ink-800 rounded-xl bg-ink-900 overflow-hidden shadow-lg">
              {book.cover_url ? (
                <Image
                  src={book.cover_url}
                  alt={`Cover of ${book.title}`}
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 p-3 flex items-center justify-center text-center font-sans text-xs text-parchment-500">
                  {book.title}
                </div>
              )}
            </div>
          ) : (
            <TiltedCard
              imageSrc={book.cover_url || ""}
              altText={`Cover of ${book.title}`}
              captionText={book.title}
              containerWidth="160px"
              containerHeight="240px"
              imageWidth="160px"
              imageHeight="240px"
              scaleOnHover={1.08}
              rotateAmplitude={12}
              showMobileWarning={false}
              showTooltip={false}
            />
          )}

          {/* Progress indicator overlay */}
          {item.status === "reading" && (
            <div className="absolute bottom-2 left-2 right-2 bg-ink-950/90 border border-ink-800 rounded px-2 py-1 flex flex-col gap-1 text-[10px] z-[5] shadow-md backdrop-blur-sm">
              <div className="flex justify-between font-semibold text-parchment-300">
                <span>Page {item.current_page}</span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full bg-ink-800 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {item.status === "finished" && userRating && (
            <div className="absolute bottom-2 left-2 bg-ink-950/90 border border-ink-800 rounded px-1.5 py-0.5 flex items-center gap-1 text-[10px] z-[5] text-amber-500 shadow-md backdrop-blur-sm">
              <Star className="w-3 h-3 fill-current" />
              <span className="font-semibold">{userRating}</span>
            </div>
          )}
        </button>

        <div className="mt-3 text-center w-full px-2">
          <h4 className="font-sans font-bold text-xs text-parchment-100 line-clamp-1 group-hover:text-amber-400 transition-colors duration-200">
            {book.title}
          </h4>
          <p className="text-[10px] text-parchment-500 line-clamp-1">
            {book.author}
          </p>
        </div>
      </div>
    );
  };

  // ── Column section renderer ────────────────────────────────────────────
  const renderColumn = (
    sectionIdx: 0 | 1 | 2,
    ref: React.RefObject<HTMLElement | null>,
    label: string,
    dotColor: string,
    dotGlow: string,
    isPulse: boolean,
    items: ShelfItem[],
    emptyMessage: React.ReactNode,
  ) => {
    const visible = sectionVisible[sectionIdx];
    const colDelay = sectionIdx * 100; // columns stagger in

    return (
      <section
        ref={ref as React.RefObject<HTMLElement>}
        className={`bg-ink-900 border border-ink-800 rounded-2xl p-6 min-h-[400px] flex flex-col shadow-xl transition-all ${
          visible ? "shelf-section-reveal" : "opacity-0"
        }`}
        style={visible ? { animationDelay: `${colDelay}ms` } : {}}
      >
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-ink-850">
          <span
            className={`w-2.5 h-2.5 rounded-full ${dotColor} ${dotGlow} ${isPulse ? "animate-pulse" : ""}`}
          />
          <h2 className="font-sans text-lg font-bold">{label}</h2>
          <span className="text-xs bg-ink-950 px-2 py-0.5 rounded text-parchment-500 border border-ink-850 ml-auto tabular-nums transition-all duration-300">
            {items.length}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            {emptyMessage}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 justify-items-center">
            {/* Show skeleton cards briefly before isReady */}
            {!isReady
              ? items.map((item) => <SkeletonCard key={item.id} />)
              : items.map((item, i) => renderBookCard(item, i))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-12">
      {/* Shelf Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 items-start">
        {renderColumn(
          0,
          sectionRefs[0],
          "Currently Reading",
          "bg-amber-500",
          "shadow-[0_0_8px_rgba(230,166,46,0.5)]",
          true,
          reading,
          <>
            <p className="text-sm text-parchment-500 max-w-xs mb-4">
              No books here. Discover new reads or move a book here to start
              tracking!
            </p>
            <Link
              href="/discover"
              className="inline-flex items-center gap-1 text-xs text-amber-500 font-semibold hover:text-amber-400 underline underline-offset-4"
            >
              Find books to read
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </>,
        )}

        {renderColumn(
          1,
          sectionRefs[1],
          "Finished",
          "bg-emerald-500",
          "shadow-[0_0_8px_rgba(16,185,129,0.5)]",
          false,
          finished,
          <p className="text-sm text-parchment-500">
            Keep reading! Your finished library books will appear here.
          </p>,
        )}

        {renderColumn(
          2,
          sectionRefs[2],
          "Want to Read",
          "bg-indigo-500",
          "shadow-[0_0_8px_rgba(99,102,241,0.5)]",
          false,
          wantToRead,
          <p className="text-sm text-parchment-500">
            Add books from search that you want to read in the future.
          </p>,
        )}
      </div>

      {/* ── Detail Modal Overlay ─────────────────────────────────────────── */}
      {selectedItem && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center px-4 bg-ink-950/80 backdrop-blur-sm transition-opacity duration-200 ${
            animateModal ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            ref={modalRef}
            className={`bg-ink-900 border border-ink-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative transition-all transform duration-200 ${
              animateModal ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
          >
            {/* Close button */}
            <button
              ref={closeButtonRef}
              onClick={handleCloseModal}
              aria-label="Close details"
              className="absolute top-1.5 right-1.5 z-20 p-1.5 rounded-full bg-ink-950 border border-ink-800 text-parchment-500 hover:text-parchment-100 hover:bg-ink-850 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Left: Cover image */}
            <div className="w-full md:w-[220px] bg-ink-950 p-6 flex flex-col items-center md:items-start text-center md:text-left justify-between border-r border-ink-850">
              <div className="space-y-4 w-full flex flex-col items-center">
                <div className="relative aspect-[2/3] w-32 rounded-lg overflow-hidden border border-ink-850 shadow-md">
                  {selectedItem.books.cover_url ? (
                    <Image
                      src={selectedItem.books.cover_url}
                      alt={`Cover of ${selectedItem.books.title}`}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 p-2 flex items-center justify-center text-center font-sans text-[10px] text-parchment-500 bg-ink-900">
                      {selectedItem.books.title}
                    </div>
                  )}
                </div>
                <div>
                  <h3
                    id="modal-title"
                    className="font-sans font-bold text-sm text-parchment-100 line-clamp-2"
                  >
                    {selectedItem.books.title}
                  </h3>
                  <p className="text-[10px] text-parchment-500 mt-1">
                    by {selectedItem.books.author}
                  </p>
                </div>
              </div>

              <div className="w-full space-y-3 mt-6">
                <Link
                  href={`/app/book/${selectedItem.books.slug}`}
                  onClick={handleCloseModal}
                  className="w-full inline-flex items-center justify-center gap-1 bg-ink-900 hover:bg-ink-850 border border-ink-800 text-parchment-300 hover:text-parchment-100 py-2 rounded-lg text-xs font-semibold transition-all focus:outline-none"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Full Reading View
                </Link>
                <button
                  onClick={handleRemoveBook}
                  className="w-full inline-flex items-center justify-center gap-1 bg-red-950/10 hover:bg-red-950/20 border border-red-950/30 hover:border-red-900/40 text-red-400 py-2 rounded-lg text-xs font-semibold transition-all focus:outline-none cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            </div>

            {/* Right: Logging & reviewing */}
            <div className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto max-h-[500px] md:max-h-none text-left">
              {actionError && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/50 text-red-200 text-xs">
                  {actionError}
                </div>
              )}
              {actionSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/50 text-emerald-200 text-xs">
                  {actionSuccess}
                </div>
              )}

              {/* Progress Log */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span>Reading Progress</span>
                  <span className="text-amber-500 font-bold">
                    {Math.min(
                      100,
                      Math.round(
                        (selectedItem.current_page /
                          selectedItem.books.page_count) *
                          100,
                      ),
                    )}
                    %
                  </span>
                </div>
                <div className="w-full bg-ink-950 rounded-full h-2 overflow-hidden border border-ink-850">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (selectedItem.current_page / selectedItem.books.page_count) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-parchment-500">
                  Currently at page {selectedItem.current_page} of{" "}
                  {selectedItem.books.page_count}
                </p>

                {selectedItem.status !== "finished" && (
                  <form onSubmit={handleLogSubmit} className="flex gap-2 pt-2">
                    <input
                      type="number"
                      min={1}
                      max={
                        selectedItem.books.page_count -
                        selectedItem.current_page
                      }
                      required
                      value={pagesLogValue}
                      onChange={(e) => setPagesLogValue(e.target.value)}
                      placeholder="Pages read..."
                      className="flex-1 bg-ink-950 border border-ink-850 rounded-lg px-3 py-2 text-xs text-parchment-100 placeholder-parchment-500/30 focus:outline-none focus:border-amber-500/50"
                    />
                    <button
                      type="submit"
                      className="bg-amber-500 hover:bg-amber-600 text-ink-950 font-bold px-4 py-2 rounded-lg text-xs transition-all focus:outline-none cursor-pointer"
                    >
                      Log Pages
                    </button>
                  </form>
                )}
              </div>

              {/* Review & Rating */}
              <div className="pt-6 border-t border-ink-850 space-y-4">
                <h4 className="text-sm font-semibold">Review & Rating</h4>
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-parchment-500 uppercase tracking-wider mb-2">
                      Your Rating (Interactive)
                    </label>
                    <div
                      className="flex gap-1"
                      role="radiogroup"
                      aria-label="Book rating"
                      onKeyDown={(e) => {
                        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                          e.preventDefault();
                          setReviewRating((r) => Math.min(5, r + 1));
                        } else if (
                          e.key === "ArrowLeft" ||
                          e.key === "ArrowDown"
                        ) {
                          e.preventDefault();
                          setReviewRating((r) => Math.max(1, r - 1));
                        }
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          role="radio"
                          aria-checked={reviewRating === star}
                          aria-label={`${star} Star${star > 1 ? "s" : ""}`}
                          className="p-1 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded text-amber-500 cursor-pointer transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-6 h-6 transition-all ${
                              star <= reviewRating
                                ? "fill-current"
                                : "opacity-20 hover:opacity-50"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="modal-review-body"
                      className="block text-[10px] font-semibold text-parchment-500 uppercase tracking-wider mb-2"
                    >
                      Review Comments
                    </label>
                    <textarea
                      id="modal-review-body"
                      value={reviewBody}
                      onChange={(e) => setReviewBody(e.target.value)}
                      placeholder="What did you think of the book?"
                      rows={3}
                      className="w-full bg-ink-950 border border-ink-850 rounded-lg py-2 px-3 text-xs text-parchment-100 placeholder-parchment-500/30 focus:outline-none focus:border-amber-500/50 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-ink-850 hover:bg-ink-800 border border-ink-800 hover:border-amber-500/20 text-parchment-100 font-semibold px-4 py-2 rounded-lg text-xs transition-all focus:outline-none cursor-pointer"
                  >
                    Save Review
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
