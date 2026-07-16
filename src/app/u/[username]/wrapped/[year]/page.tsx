import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WrappedView from "@/components/features/wrapped-view";

export const dynamic = "force-dynamic";

export default async function PublicWrappedPage({
  params,
}: {
  params: Promise<{ username: string; year: string }>;
}) {
  const { username, year } = await params;
  const supabase = await createClient();

  // 1. Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  // Define date thresholds for the specified year
  const startDate = `${year}-01-01T00:00:00.000Z`;
  const endDate = `${year}-12-31T23:59:59.999Z`;

  // 2. Fetch completed books list for this year
  const { data: completedShelves } = await supabase
    .from("shelves")
    .select(`
      id,
      book_id,
      finished_at,
      books (
        id,
        genre
      )
    `)
    .eq("user_id", profile.id)
    .eq("status", "finished")
    .gte("finished_at", startDate)
    .lte("finished_at", endDate);

  const completed = completedShelves || [];
  const booksCount = completed.length;

  // 3. Fetch pages logged in this year
  const { data: logsData } = await supabase
    .from("reading_logs")
    .select(`
      pages_read,
      logged_at,
      shelves!inner (
        user_id
      )
    `)
    .eq("shelves.user_id", profile.id)
    .gte("logged_at", startDate)
    .lte("logged_at", endDate);

  const pagesCount = (logsData || []).reduce((acc, log) => acc + (log.pages_read || 0), 0);

  // 4. Fetch average rating for books completed this year
  let averageRating: number | null = null;
  const completedBookIds = completed.map((s) => s.book_id);

  if (completedBookIds.length > 0) {
    const { data: reviewsData } = await supabase
      .from("reviews")
      .select("rating")
      .eq("user_id", profile.id)
      .in("book_id", completedBookIds);

    if (reviewsData && reviewsData.length > 0) {
      const sum = reviewsData.reduce((acc, r) => acc + (r.rating || 0), 0);
      averageRating = sum / reviewsData.length;
    }
  }

  // 5. Compile genre counts
  const genreMap: Record<string, number> = {};
  (completed as unknown as Array<{
    id: string;
    book_id: string;
    finished_at: string;
    books: { id: string; genre: string | null } | null;
  }>).forEach((item) => {
    const book = item.books;
    if (book) {
      const genre = book.genre || "Uncategorized";
      genreMap[genre] = (genreMap[genre] || 0) + 1;
    }
  });

  const genres = Object.entries(genreMap)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);

  // 6. Check if viewer is the owner
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const isOwnWrapped = currentUser?.id === profile.id;

  const displayName = profile.display_name || profile.username;

  return (
    <main className="min-h-screen bg-ink-950 flex flex-col justify-center items-center py-12">
      <WrappedView
        username={profile.username}
        displayName={displayName}
        year={year}
        booksCount={booksCount}
        pagesCount={pagesCount}
        genres={genres}
        averageRating={averageRating}
        isOwnWrapped={isOwnWrapped}
      />
    </main>
  );
}
