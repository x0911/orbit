import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ChevronLeft,
  Plus,
  Calendar,
  BookOpen,
  PenTool,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  logProgress,
  saveReview,
} from "@/app/app/shelf/actions";
import InteractiveStars from "@/components/features/interactive-stars";
import RemoveBookButton from "@/components/features/remove-book-button";

interface ReadingLog {
  id: string;
  shelf_id: string;
  pages_read: number;
  logged_at: string;
}

export default async function AuthenticatedBookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1. Fetch current user session (already verified in app layout, but needed for querying)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // 2. Fetch book details
  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!book) {
    notFound();
  }

  // 3. Fetch user shelf info for this book
  const { data: shelf } = await supabase
    .from("shelves")
    .select(
      `
      id,
      status,
      current_page,
      started_at,
      finished_at
    `,
    )
    .eq("user_id", user.id)
    .eq("book_id", book.id)
    .maybeSingle();

  // 4. Fetch user's review for this book (if any)
  const { data: review } = await supabase
    .from("reviews")
    .select("rating, body")
    .eq("user_id", user.id)
    .eq("book_id", book.id)
    .maybeSingle();

  // 5. Fetch reading logs for this shelf
  let readingLogs: ReadingLog[] = [];
  if (shelf) {
    const { data: logs } = await supabase
      .from("reading_logs")
      .select("*")
      .eq("shelf_id", shelf.id)
      .order("logged_at", { ascending: false });
    readingLogs = (logs || []) as ReadingLog[];
  }

  // Form actions
  const handleLogProgress = async (formData: FormData) => {
    "use server";
    if (!shelf) return;
    const pages = parseInt(formData.get("pages") as string, 10);
    if (isNaN(pages) || pages <= 0) return;
    await logProgress(shelf.id, pages);
  };

  const handleSaveReview = async (formData: FormData) => {
    "use server";
    const rating = parseInt(formData.get("rating") as string, 10);
    const body = formData.get("body") as string;
    if (isNaN(rating) || rating < 1 || rating > 5) return;
    await saveReview(book.id, rating, body);
  };

  const progressPercent =
    shelf && book.page_count
      ? Math.min(100, Math.round((shelf.current_page / book.page_count) * 100))
      : 0;

  return (
    <main className="text-parchment-100 min-h-screen pb-12">
      <Link
        href="/app/shelf"
        className="inline-flex items-center gap-1 text-sm text-parchment-500 hover:text-amber-500 mb-8 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Shelf
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
        {/* Left Column - Book Info */}
        <div className="md:col-span-1 flex flex-col items-center text-center md:items-start md:text-left space-y-6">
          <div className="relative aspect-[2/3] w-full max-w-[240px] rounded-xl overflow-hidden shadow-2xl border border-ink-800 bg-ink-900">
            {book.cover_url ? (
              <Image
                src={book.cover_url}
                alt={`Cover of ${book.title}`}
                fill
                sizes="240px"
                priority
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-parchment-500 text-sm font-sans p-4 text-center">
                {book.title}
              </div>
            )}
          </div>

          <div className="w-full">
            <span className="inline-block text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
              {book.genre}
            </span>
            <h1 className="font-sans text-2xl md:text-3xl font-bold tracking-wide text-parchment-100 mb-2 leading-tight">
              {book.title}
            </h1>
            <p className="text-parchment-300 mb-4">by {book.author}</p>
            <div className="text-xs text-parchment-500 space-y-1 border-t border-b border-ink-800 py-3 mb-6">
              <p>Total Pages: {book.page_count}</p>
              <p>Open Library ID: {book.open_library_id}</p>
            </div>

            {shelf && (
              <RemoveBookButton shelfId={shelf.id} bookTitle={book.title} />
            )}
          </div>
        </div>

        {/* Right Column - Trackers & Forms */}
        <div className="md:col-span-2 space-y-6">
          {!shelf ? (
            <div className="p-8 rounded-xl bg-ink-900 border border-ink-800 text-center">
              <h2 className="text-lg font-semibold mb-2">Book Not on Shelf</h2>
              <p className="text-sm text-parchment-500 mb-6">
                Add this book to your shelf to start tracking your reading
                progress.
              </p>
              <Link
                href={`/book/${book.slug}`}
                className="bg-amber-500 hover:bg-amber-600 text-ink-950 font-semibold px-6 py-2.5 rounded-lg text-sm transition-all inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <Plus className="w-4 h-4" />
                Go to Add to Shelf
              </Link>
            </div>
          ) : (
            <>
              {/* Progress Tracker Box */}
              <div className="p-8 rounded-xl bg-ink-900 border border-ink-800 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-ink-950 border border-ink-800 text-amber-500 flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">
                        Reading Progress
                      </h2>
                      <p className="text-xs text-parchment-500 capitalize">
                        Status: {shelf.status.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-bold tracking-tight text-amber-500">
                      {progressPercent}%
                    </span>
                    <p className="text-xs text-parchment-500">
                      Page {shelf.current_page} of {book.page_count}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-ink-950 rounded-full h-2.5 overflow-hidden border border-ink-800">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {shelf.status !== "finished" && (
                  <form
                    action={handleLogProgress}
                    className="pt-4 border-t border-ink-850 flex flex-col md:flex-row items-end gap-4"
                  >
                    <div className="flex-1 w-full text-left">
                      <label
                        htmlFor="pages-input"
                        className="block text-xs font-semibold text-parchment-500 uppercase tracking-wider mb-2"
                      >
                        Log Pages Read
                      </label>
                      <input
                        id="pages-input"
                        name="pages"
                        type="number"
                        min={1}
                        max={book.page_count - shelf.current_page}
                        required
                        placeholder="How many pages did you read?"
                        className="w-full bg-ink-950 border border-ink-850 rounded-lg py-2.5 px-4 text-parchment-100 placeholder-parchment-500/30 text-sm focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-ink-950 font-semibold px-6 py-2.5 rounded-lg text-sm transition-all focus:outline-none cursor-pointer"
                    >
                      Log Pages
                    </button>
                  </form>
                )}
              </div>

              {/* Review & Rating Editor */}
              <div className="p-8 rounded-xl bg-ink-900 border border-ink-800 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-ink-950 border border-ink-800 text-amber-500 flex items-center justify-center">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Your Review</h2>
                    <p className="text-xs text-parchment-500">
                      Share your thoughts with the community
                    </p>
                  </div>
                </div>

                <form action={handleSaveReview} className="space-y-4">
                  <div className="text-left">
                    <label
                      htmlFor="rating-select"
                      className="block text-xs font-semibold text-parchment-500 uppercase tracking-wider mb-2"
                    >
                      Star Rating
                    </label>
                    <InteractiveStars
                      name="rating"
                      defaultValue={review?.rating || 5}
                    />
                  </div>

                  <div className="text-left">
                    <label
                      htmlFor="review-body"
                      className="block text-xs font-semibold text-parchment-500 uppercase tracking-wider mb-2"
                    >
                      Review Comments
                    </label>
                    <textarea
                      id="review-body"
                      name="body"
                      rows={4}
                      placeholder="Write your review here..."
                      defaultValue={review?.body || ""}
                      className="w-full bg-ink-950 border border-ink-850 rounded-lg py-3 px-4 text-parchment-100 placeholder-parchment-500/30 text-sm focus:outline-none focus:border-amber-500/50 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-ink-850 hover:bg-ink-800 border border-ink-800 hover:border-amber-500/20 text-parchment-100 font-semibold px-6 py-2.5 rounded-lg text-sm transition-all focus:outline-none cursor-pointer"
                  >
                    Save Review
                  </button>
                </form>
              </div>

              {/* Progress History Logs */}
              <div className="p-8 rounded-xl bg-ink-900 border border-ink-800 space-y-6">
                <h3 className="text-base font-semibold">
                  Reading Logs History
                </h3>
                {readingLogs.length === 0 ? (
                  <p className="text-sm text-parchment-500">
                    No reading logs submitted yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {readingLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between text-sm py-3 border-b border-ink-850 last:border-0"
                      >
                        <div className="flex items-center gap-2 text-parchment-300">
                          <Calendar className="w-4 h-4 text-parchment-500" />
                          <span>Logged {log.pages_read} pages</span>
                        </div>
                        <span className="text-xs text-parchment-500">
                          {new Date(log.logged_at).toLocaleDateString()}{" "}
                          {new Date(log.logged_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
