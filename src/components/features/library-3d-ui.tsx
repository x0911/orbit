"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, X, BookOpen, PenTool, ListChecks, Loader2 } from "lucide-react";
import {
  logProgress,
  saveReview,
  updateShelfStatus,
} from "@/app/app/shelf/actions";
import type { LibraryBook } from "./library-3d-experience";

type Tab = "progress" | "review" | "status";

export default function BookHandUI({
  book,
  onClose,
  onUpdate,
}: {
  book: LibraryBook;
  onClose: () => void;
  onUpdate: (updated: LibraryBook) => void;
}) {
  const [tab, setTab] = useState<Tab>("progress");
  const [pagesInput, setPagesInput] = useState("");
  const [rating, setRating] = useState(book.rating || 5);
  const [reviewBody, setReviewBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const progressPct = Math.min(
    100,
    Math.round((book.currentPage / book.pageCount) * 100),
  );

  const handleLogPages = async () => {
    const pages = parseInt(pagesInput, 10);
    if (isNaN(pages) || pages <= 0) {
      setMessage({ type: "error", text: "Enter a valid number of pages" });
      return;
    }
    setBusy(true);
    setMessage(null);
    const res = await logProgress(book.shelfId, pages);
    setBusy(false);
    if (res.success) {
      const newPage = Math.min(book.pageCount, book.currentPage + pages);
      onUpdate({
        ...book,
        currentPage: newPage,
        status: res.finished ? "finished" : "reading",
      });
      setPagesInput("");
      setMessage({
        type: "success",
        text: res.finished ? "Finished the book! 🎉" : "Pages logged!",
      });
    } else {
      setMessage({ type: "error", text: res.error || "Failed to log pages" });
    }
  };

  const handleSaveReview = async () => {
    setBusy(true);
    setMessage(null);
    const res = await saveReview(book.bookId, rating, reviewBody);
    setBusy(false);
    if (res.success) {
      onUpdate({ ...book, rating });
      setMessage({ type: "success", text: "Review saved!" });
    } else {
      setMessage({ type: "error", text: res.error || "Failed to save review" });
    }
  };

  const handleStatusChange = async (status: LibraryBook["status"]) => {
    if (status === book.status) return;
    setBusy(true);
    setMessage(null);
    const res = await updateShelfStatus(book.shelfId, status);
    setBusy(false);
    if (res.success) {
      onUpdate({
        ...book,
        status,
        currentPage:
          typeof res.current_page === "number"
            ? res.current_page
            : book.currentPage,
      });
      setMessage({ type: "success", text: "Status updated!" });
    } else {
      setMessage({
        type: "error",
        text: res.error || "Failed to update status",
      });
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4 md:pb-8 md:px-8">
      <div className="w-full max-w-lg bg-ink-900/95 border border-ink-800 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 p-5 border-b border-ink-850">
          <div className="relative w-12 h-16 shrink-0 rounded-md overflow-hidden border border-ink-800 bg-ink-950">
            {book.coverUrl ? (
              <Image
                src={book.coverUrl}
                alt={book.title}
                fill
                sizes="48px"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[7px] text-parchment-500 p-1 text-center">
                {book.title}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-sans font-bold text-parchment-100 text-sm truncate">
              {book.title}
            </h3>
            <p className="text-xs text-parchment-500 truncate">
              by {book.author}
            </p>
            <span className="inline-block mt-1 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
              {book.status.replace(/_/g, " ")}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Put book back"
            className="p-2 rounded-full bg-ink-950 border border-ink-800 text-parchment-500 hover:text-parchment-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-ink-850">
          {[
            { id: "progress" as Tab, label: "Progress", icon: BookOpen },
            { id: "review" as Tab, label: "Review & Rating", icon: PenTool },
            { id: "status" as Tab, label: "Status", icon: ListChecks },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors cursor-pointer ${
                tab === t.id
                  ? "text-amber-500 bg-amber-500/5 border-b-2 border-amber-500"
                  : "text-parchment-500 hover:text-parchment-100"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[38vh] overflow-y-auto">
          {message && (
            <div
              className={`text-xs px-3 py-2 rounded-lg border ${
                message.type === "success"
                  ? // Let's have light theme classes as we have dark ones
                    "dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-200 bg-emerald-100/40 border-emerald-200/50 text-emerald-800"
                  : "dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-200 bg-red-100/40 border-red-200/50 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          {tab === "progress" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm font-semibold text-parchment-100">
                <span>Reading Progress</span>
                <span className="text-amber-500 font-bold">{progressPct}%</span>
              </div>
              <div className="w-full bg-ink-950 rounded-full h-2 overflow-hidden border border-ink-850">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-parchment-500">
                Page {book.currentPage} of {book.pageCount}
              </p>

              {book.status !== "finished" && (
                <div className="flex gap-2 pt-1">
                  <input
                    type="number"
                    min={1}
                    max={book.pageCount - book.currentPage}
                    value={pagesInput}
                    onChange={(e) => setPagesInput(e.target.value)}
                    placeholder="Pages read..."
                    className="flex-1 bg-ink-950 border border-ink-850 rounded-lg px-3 py-2 text-xs text-parchment-100 placeholder-parchment-500/30 focus:outline-none focus:border-amber-500/50"
                  />
                  <button
                    onClick={handleLogPages}
                    disabled={busy}
                    className="bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-ink-950 font-bold px-4 py-2 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {busy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Log Pages"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "review" && (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-parchment-500 uppercase tracking-wider mb-2">
                  Your Rating
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 text-amber-500 cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${star <= rating ? "fill-current" : "opacity-20"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-parchment-500 uppercase tracking-wider mb-2">
                  Review Comments
                </label>
                <textarea
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  rows={3}
                  placeholder="What did you think?"
                  className="w-full bg-ink-950 border border-ink-850 rounded-lg py-2 px-3 text-xs text-parchment-100 placeholder-parchment-500/30 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
              <button
                onClick={handleSaveReview}
                disabled={busy}
                className="w-full bg-ink-850 hover:bg-ink-800 disabled:opacity-60 border border-ink-800 hover:border-amber-500/20 text-parchment-100 font-semibold px-4 py-2.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {busy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Save Review"
                )}
              </button>
            </div>
          )}

          {tab === "status" && (
            <div className="space-y-3">
              <p className="text-xs text-parchment-500">
                Move this book to a different shelf status:
              </p>
              <div className="flex gap-2">
                {[
                  { value: "want_to_read" as const, label: "Wishlist" },
                  { value: "reading" as const, label: "Reading" },
                  { value: "finished" as const, label: "Finished" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    disabled={busy}
                    className={`flex-1 text-center py-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer disabled:opacity-60 ${
                      book.status === opt.value
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-500"
                        : "bg-ink-950 border-ink-850 text-parchment-500 hover:text-parchment-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Put back footer */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full text-center text-xs text-parchment-500 hover:text-parchment-100 py-2 transition-colors cursor-pointer"
          >
            Put the book back on the shelf
          </button>
        </div>
      </div>
    </div>
  );
}
