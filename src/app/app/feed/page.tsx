import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FeedView from "@/components/features/feed-view";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  // 1. Fetch followed users list
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const followedIds = follows?.map((f) => f.following_id) || [];

  if (followedIds.length === 0) {
    return (
      <div className="space-y-8 max-w-xl mx-auto text-left">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-wide text-parchment-100">
            Friend Feed
          </h1>
          <p className="text-sm text-parchment-500 mt-1">
            See what books your friends are exploring and how their reading journeys are progressing.
          </p>
        </div>
        <FeedView initialActivities={[]} />
      </div>
    );
  }

  // 2. Fetch shelves changes for followed users
  const { data: shelvesUpdates } = await supabase
    .from("shelves")
    .select(`
      id,
      status,
      user_id,
      updated_at,
      profiles (
        username,
        display_name
      ),
      books (
        id,
        title,
        author,
        cover_url,
        slug
      )
    `)
    .in("user_id", followedIds)
    .order("updated_at", { ascending: false })
    .limit(20);

  // 3. Fetch reading logs for followed users
  const { data: logsUpdates } = await supabase
    .from("reading_logs")
    .select(`
      id,
      pages_read,
      logged_at,
      shelves!inner (
        user_id,
        profiles (
          username,
          display_name
        ),
        books (
          title,
          author,
          cover_url,
          slug
        )
      )
    `)
    .in("shelves.user_id", followedIds)
    .order("logged_at", { ascending: false })
    .limit(20);

  // 4. Fetch followed users finished ratings to attach
  const { data: reviews } = await supabase
    .from("reviews")
    .select("user_id, book_id, rating")
    .in("user_id", followedIds);

  const reviewRatingMap: Record<string, number> = {};
  if (reviews) {
    reviews.forEach((rev) => {
      reviewRatingMap[`${rev.user_id}-${rev.book_id}`] = rev.rating;
    });
  }

  interface FeedItem {
    id: string;
    type: "status_update" | "pages_logged";
    username: string;
    displayName: string;
    bookTitle: string;
    bookAuthor: string;
    bookCover: string | null;
    bookSlug: string;
    timestamp: string;
    statusValue?: string;
    ratingValue?: number;
    pagesRead?: number;
  }

  // Compile combined chronological feed
  const feedItems: FeedItem[] = [];

  if (shelvesUpdates) {
    (shelvesUpdates as unknown as Array<{
      id: string;
      status: string;
      user_id: string;
      updated_at: string;
      profiles: { username: string; display_name: string | null } | null;
      books: { id: string; title: string; author: string; cover_url: string | null; slug: string } | null;
    }>).forEach((item) => {
      const profile = item.profiles;
      const book = item.books;
      if (!profile || !book) return;

      const ratingKey = `${item.user_id}-${book.id}`;
      const ratingValue = reviewRatingMap[ratingKey];

      feedItems.push({
        id: item.id,
        type: "status_update",
        username: profile.username,
        displayName: profile.display_name || profile.username,
        bookTitle: book.title,
        bookAuthor: book.author,
        bookCover: book.cover_url,
        bookSlug: book.slug,
        timestamp: item.updated_at,
        statusValue: item.status,
        ratingValue,
      });
    });
  }

  if (logsUpdates) {
    (logsUpdates as unknown as Array<{
      id: string;
      pages_read: number;
      logged_at: string;
      shelves: {
        user_id: string;
        profiles: { username: string; display_name: string | null } | null;
        books: { title: string; author: string; cover_url: string | null; slug: string } | null;
      } | null;
    }>).forEach((item) => {
      const shelf = item.shelves;
      if (!shelf) return;
      const profile = shelf.profiles;
      const book = shelf.books;
      if (!profile || !book) return;

      feedItems.push({
        id: item.id,
        type: "pages_logged",
        username: profile.username,
        displayName: profile.display_name || profile.username,
        bookTitle: book.title,
        bookAuthor: book.author,
        bookCover: book.cover_url,
        bookSlug: book.slug,
        timestamp: item.logged_at,
        pagesRead: item.pages_read,
      });
    });
  }

  // Sort feed descending
  feedItems.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const finalFeed = feedItems.slice(0, 25);

  return (
    <div className="space-y-8 max-w-xl mx-auto text-left">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-wide text-parchment-100">
          Friend Feed
        </h1>
        <p className="text-sm text-parchment-500 mt-1">
          See what books your friends are exploring and how their reading journeys are progressing.
        </p>
      </div>
      <FeedView initialActivities={finalFeed} />
    </div>
  );
}
