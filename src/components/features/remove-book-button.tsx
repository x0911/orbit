"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { removeFromShelf } from "@/app/app/shelf/actions";

export default function RemoveBookButton({
  shelfId,
  bookTitle,
}: {
  shelfId: string;
  bookTitle: string;
}) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [animateConfirm, setAnimateConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const triggerConfirm = () => {
    setShowConfirm(true);
    setTimeout(() => setAnimateConfirm(true), 10);
  };

  const closeConfirm = () => {
    setAnimateConfirm(false);
    setTimeout(() => setShowConfirm(false), 200);
  };

  const handleConfirmRemove = async () => {
    setIsDeleting(true);
    setError("");
    try {
      const res = await removeFromShelf(shelfId);
      if (res.success) {
        closeConfirm();
        router.push("/app/shelf");
        router.refresh();
      } else {
        setError(res.error || "Failed to remove book");
        setIsDeleting(false);
      }
    } catch {
      setError("An unexpected error occurred");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={triggerConfirm}
        className="inline-flex items-center justify-center gap-2 w-full bg-ink-950 border border-red-950/20 hover:border-red-900/40 text-red-400/80 hover:text-red-400 hover:bg-red-950/10 px-4 py-2.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
        Remove from Shelf
      </button>

      {showConfirm && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className={`fixed inset-0 bg-ink-950/85 backdrop-blur-sm transition-opacity duration-200 ${
              animateConfirm ? "opacity-100" : "opacity-0"
            }`}
            onClick={isDeleting ? undefined : closeConfirm}
          />
          
          {/* Modal Box */}
          <div 
            className={`relative bg-ink-900 border border-ink-800 rounded-2xl max-w-sm w-full p-6 text-left shadow-2xl transition-all transform duration-200 ${
              animateConfirm ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
          >
            <h3 className="font-sans text-lg font-bold text-parchment-100 mb-2">
              Remove from Shelf
            </h3>
            <p className="text-sm text-parchment-500 mb-6">
              Are you sure you want to remove &ldquo;{bookTitle}&rdquo; from your shelf? Your reading progress and history for this book will be permanently deleted.
            </p>
            {error && (
              <p className="text-xs text-red-400 mb-4">{error}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={closeConfirm}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-ink-950 border border-ink-800 text-parchment-300 hover:text-parchment-100 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmRemove}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-all cursor-pointer border border-transparent disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Remove
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
