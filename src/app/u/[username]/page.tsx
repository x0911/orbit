import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, Users, UserCheck, UserPlus, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { toggleFollow } from "@/app/app/shelf/actions";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  // 1. Fetch profile details
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  // 2. Fetch follow counts
  const { count: followersCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profile.id);

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", profile.id);

  // 3. Fetch shelf items
  const { data: shelvesData } = await supabase
    .from("shelves")
    .select(
      `
      id,
      status,
      current_page,
      books (
        id,
        title,
        author,
        cover_url,
        page_count,
        genre,
        slug
      )
    `,
    )
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false });

  const shelves = (shelvesData || []).map((item) => {
    const s = item as unknown as {
      id: string;
      status: string;
      current_page: number;
      books:
        | {
            id: string;
            title: string;
            author: string;
            cover_url: string | null;
            page_count: number;
            slug: string;
          }
        | Array<{
            id: string;
            title: string;
            author: string;
            cover_url: string | null;
            page_count: number;
            slug: string;
          }>;
    };
    const book = Array.isArray(s.books) ? s.books[0] : s.books;
    return {
      id: s.id,
      status: s.status,
      current_page: s.current_page,
      books: book,
    };
  });

  const reading = shelves.filter((s) => s.status === "reading");
  const wantToRead = shelves.filter((s) => s.status === "want_to_read");
  const finished = shelves.filter((s) => s.status === "finished");

  // 4. Fetch public reviews for ratings
  const { data: reviews } = await supabase
    .from("reviews")
    .select("book_id, rating")
    .eq("user_id", profile.id);

  const reviewMap: Record<string, number> = {};
  if (reviews) {
    reviews.forEach((r) => {
      reviewMap[r.book_id] = r.rating;
    });
  }

  // 5. Fetch current user session to show follow button
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  const isOwnProfile = currentUser?.id === profile.id;

  let isFollowing = false;
  if (currentUser && !isOwnProfile) {
    const { data: followRecord } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", currentUser.id)
      .eq("following_id", profile.id)
      .maybeSingle();
    isFollowing = !!followRecord;
  }

  // Server action follow toggle wrapper
  const handleFollowAction = async () => {
    "use server";
    await toggleFollow(profile.id);
  };

  const renderBookItem = (item: {
    id: string;
    current_page: number;
    status: string;
    books: {
      id: string;
      title: string;
      author: string;
      cover_url: string | null;
      page_count: number;
      slug: string;
    } | null;
  }) => {
    const book = item.books;
    if (!book) return null;
    const progressPct = Math.round((item.current_page / book.page_count) * 100);
    const userRating = reviewMap[book.id];

    return (
      <div
        key={item.id}
        className="bg-ink-900 border border-ink-800 rounded-xl p-4 flex gap-4 items-center"
      >
        <Link
          href={`/book/${book.slug}`}
          className="relative aspect-[2/3] w-16 shrink-0 rounded-lg overflow-hidden border border-ink-850 bg-ink-950 shadow"
        >
          {book.cover_url ? (
            <Image
              src={book.cover_url}
              alt={`Cover of ${book.title}`}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 p-1 flex items-center justify-center text-center font-sans text-[8px] text-parchment-500">
              {book.title}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <Link
            href={`/book/${book.slug}`}
            className="font-sans font-bold text-sm text-parchment-100 hover:text-amber-500 transition-colors line-clamp-1 block"
          >
            {book.title}
          </Link>
          <p className="text-xs text-parchment-500 line-clamp-1">
            by {book.author}
          </p>

          {item.status === "reading" && (
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[10px] text-parchment-500">
                <span>
                  Page {item.current_page} of {book.page_count}
                </span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full bg-ink-950 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-amber-500 h-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {item.status === "finished" && userRating && (
            <div className="mt-2 flex text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${star <= userRating ? "fill-current" : "opacity-20"}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="text-parchment-100 min-h-screen pb-12 px-4 py-8 md:py-16">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Profile Card */}
        <div className="bg-ink-900 border border-ink-800 rounded-2xl p-8 flex flex-col md:flex-row gap-6 items-center md:items-start shadow-xl relative overflow-hidden">
          {/* Glowing backdrops */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Avatar circle (no emojis) */}
          <div className="w-24 h-24 rounded-full bg-ink-950 border border-ink-800 text-amber-500 flex items-center justify-center text-4xl uppercase font-bold tracking-wider shrink-0 shadow-lg">
            {profile.display_name
              ? profile.display_name.charAt(0)
              : profile.username.charAt(0)}
          </div>

          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <h1 className="font-sans text-3xl font-bold tracking-wide text-parchment-100">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-sm text-parchment-500">@{profile.username}</p>
            </div>

            {profile.bio && (
              <p className="text-sm text-parchment-300 font-light leading-relaxed max-w-xl">
                {profile.bio}
              </p>
            )}

            {/* Follow counts */}
            <div className="flex items-center justify-center md:justify-start gap-6 text-sm text-parchment-300">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-parchment-100">
                  {followersCount}
                </span>{" "}
                followers
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-parchment-100">
                  {followingCount}
                </span>{" "}
                following
              </div>
            </div>
          </div>

          {/* Follow Button */}
          {currentUser && !isOwnProfile && (
            <form action={handleFollowAction} className="shrink-0 mt-4 md:mt-0">
              <button
                type="submit"
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer ${
                  isFollowing
                    ? "bg-ink-950 border border-ink-800 text-parchment-300 hover:text-red-400 hover:border-red-900/30 hover:bg-red-950/10"
                    : "bg-amber-500 hover:bg-amber-600 text-ink-950 shadow-md hover:shadow-lg"
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Public Book Shelf */}
        <div className="space-y-8">
          <h2 className="font-sans text-2xl font-bold tracking-wide text-parchment-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-500" />
            Library Shelf
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Reading Column */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-parchment-500 uppercase tracking-widest border-b border-ink-850 pb-2 flex justify-between">
                <span>Reading</span>
                <span>{reading.length}</span>
              </h3>
              {reading.length === 0 ? (
                <p className="text-xs text-parchment-500 py-4">
                  Not reading anything currently.
                </p>
              ) : (
                <div className="space-y-3">{reading.map(renderBookItem)}</div>
              )}
            </div>

            {/* Finished Column */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-parchment-500 uppercase tracking-widest border-b border-ink-850 pb-2 flex justify-between">
                <span>Finished</span>
                <span>{finished.length}</span>
              </h3>
              {finished.length === 0 ? (
                <p className="text-xs text-parchment-500 py-4">
                  No books finished yet.
                </p>
              ) : (
                <div className="space-y-3">{finished.map(renderBookItem)}</div>
              )}
            </div>

            {/* Want to Read Column */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-parchment-500 uppercase tracking-widest border-b border-ink-850 pb-2 flex justify-between">
                <span>Want to Read</span>
                <span>{wantToRead.length}</span>
              </h3>
              {wantToRead.length === 0 ? (
                <p className="text-xs text-parchment-500 py-4">
                  No books on wishlist.
                </p>
              ) : (
                <div className="space-y-3">
                  {wantToRead.map(renderBookItem)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
