import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, ChevronLeft, LogIn, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addToShelf } from "@/app/app/shelf/actions";

export default async function PublicBookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1. Fetch book details
  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!book) {
    notFound();
  }

  // 2. Fetch reviews with profile names
  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      `
      rating,
      body,
      created_at,
      profiles (
        username,
        display_name
      )
    `,
    )
    .eq("book_id", book.id)
    .order("created_at", { ascending: false });

  // 3. Fetch user session to check if authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if book is already on user's shelf
  let userShelfStatus: string | null = null;
  if (user) {
    const { data: shelf } = await supabase
      .from("shelves")
      .select("status")
      .eq("user_id", user.id)
      .eq("book_id", book.id)
      .maybeSingle();
    userShelfStatus = shelf?.status || null;
  }

  // Calculate average rating
  const reviewList = reviews || [];
  const averageRating =
    reviewList.length > 0
      ? (
          reviewList.reduce((acc, r) => acc + (r.rating || 0), 0) /
          reviewList.length
        ).toFixed(1)
      : null;

  // Add to shelf action wrapper for forms
  const handleAddToShelfAction = async (formData: FormData) => {
    "use server";
    const status = formData.get("status") as
      | "want_to_read"
      | "reading"
      | "finished";
    await addToShelf(
      {
        title: book.title,
        author: book.author,
        cover_url: book.cover_url || "",
        open_library_id: book.open_library_id || "",
        genre: book.genre || "",
        page_count: book.page_count || 200,
      },
      status,
    );
  };

  return (
    <main className="min-h-screen bg-ink-950 text-parchment-100 px-4 py-8 md:py-16">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1 text-sm text-parchment-500 hover:text-amber-500 mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Discover
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-12">
          {/* Cover image (2:3 aspect ratio) */}
          <div className="md:col-span-1">
            <div className="relative aspect-[2/3] w-full max-w-[240px] mx-auto rounded-xl overflow-hidden shadow-2xl border border-ink-800 bg-ink-900">
              {book.cover_url ? (
                <Image
                  src={book.cover_url}
                  alt={`Cover of ${book.title}`}
                  fill
                  sizes="(max-w-768px) 240px, 300px"
                  priority
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-parchment-500 text-sm font-sans p-4 text-center">
                  {book.title}
                </div>
              )}
            </div>
          </div>

          {/* Book Info & Action Panel */}
          <div className="md:col-span-2 flex flex-col justify-center">
            <div className="mb-6">
              <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
                {book.genre}
              </span>
              <h1 className="font-sans text-3xl md:text-4xl font-bold tracking-wide text-parchment-100 mb-2">
                {book.title}
              </h1>
              <p className="text-lg text-parchment-300">
                by <span className="font-medium">{book.author}</span>
              </p>
              <p className="text-xs text-parchment-500 mt-1">
                {book.page_count} pages • Open Library ID:{" "}
                {book.open_library_id}
              </p>
            </div>

            {/* Rating summary */}
            <div className="flex items-center gap-2 mb-8">
              <div className="flex text-amber-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      averageRating &&
                      star <= Math.round(parseFloat(averageRating))
                        ? "fill-current"
                        : "opacity-30"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold">
                {averageRating ? `${averageRating} / 5.0` : "No ratings yet"}
              </span>
              <span className="text-xs text-parchment-500">
                ({reviewList.length}{" "}
                {reviewList.length === 1 ? "review" : "reviews"})
              </span>
            </div>

            {/* Shelf Actions */}
            <div className="p-6 rounded-xl bg-ink-900 border border-ink-800 max-w-md">
              {user ? (
                <div>
                  <h3 className="text-sm font-semibold mb-3">
                    Your Shelf Status
                  </h3>
                  {userShelfStatus ? (
                    <div className="space-y-3">
                      <p className="text-xs text-parchment-300">
                        This book is on your shelf under:{" "}
                        <span className="text-amber-500 font-semibold uppercase tracking-wider text-[10px]">
                          {userShelfStatus.replace(/_/g, " ")}
                        </span>
                      </p>
                      <Link
                        href={`/app/book/${book.slug}`}
                        className="inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-semibold underline underline-offset-4"
                      >
                        Update progress or review in your shelf
                      </Link>
                    </div>
                  ) : (
                    <form
                      action={handleAddToShelfAction}
                      className="flex flex-col gap-3"
                    >
                      <label
                        htmlFor="status-select"
                        className="text-xs text-parchment-500 uppercase font-semibold tracking-wider"
                      >
                        Add to Shelf
                      </label>
                      <div className="flex gap-2">
                        <select
                          id="status-select"
                          name="status"
                          defaultValue="want_to_read"
                          className="flex-1 bg-ink-950 border border-ink-800 rounded-lg px-3 py-2 text-sm text-parchment-100 focus:outline-none focus:border-amber-500/50"
                        >
                          <option value="want_to_read">Want to Read</option>
                          <option value="reading">Reading</option>
                          <option value="finished">Finished</option>
                        </select>
                        <button
                          type="submit"
                          className="bg-amber-500 hover:bg-amber-600 text-ink-950 font-semibold px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <Plus className="w-4 h-4" />
                          Add
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-parchment-500 mb-4">
                    Sign in to track your progress and write a review.
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 w-full bg-ink-850 hover:bg-ink-800 text-parchment-100 border border-ink-800 rounded-lg py-2.5 font-semibold text-sm transition-all focus:outline-none"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In to Account
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="border-t border-ink-800 pt-12">
          <h2 className="font-sans text-2xl font-bold mb-6 text-parchment-100">
            Community Reviews
          </h2>

          {reviewList.length === 0 ? (
            <div className="text-center py-12 rounded-xl bg-ink-900 border border-ink-800 border-dashed">
              <p className="text-parchment-500 text-sm">
                No reviews yet. Be the first to add a review!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviewList.map((review, i) => {
                const profile = review.profiles as unknown as {
                  display_name: string;
                  username: string;
                };
                return (
                  <div
                    key={i}
                    className="p-6 rounded-xl bg-ink-900 border border-ink-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-parchment-100 text-sm block">
                          {profile?.display_name || "Anonymous"}
                        </span>
                        <span className="text-xs text-parchment-500">
                          @{profile?.username}
                        </span>
                      </div>
                      <div className="flex text-amber-500">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= (review.rating || 0)
                                ? "fill-current"
                                : "opacity-20"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.body && (
                      <p className="text-sm text-parchment-300 font-light leading-relaxed whitespace-pre-line">
                        {review.body}
                      </p>
                    )}
                    <div className="text-[10px] text-parchment-500 pt-1">
                      Reviewed on{" "}
                      {new Date(review.created_at || "").toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
