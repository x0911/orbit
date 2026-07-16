import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ShelfView from "@/components/features/shelf-view";

export const dynamic = "force-dynamic";

export default async function ShelfPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  // Fetch user shelves data
  const { data: shelvesData, error: shelfFetchError } = await supabase
    .from("shelves")
    .select(`
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
    `)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (shelfFetchError) {
    console.error("Failed to fetch shelf data:", shelfFetchError);
  }

  // Cast shelves items
  const shelves = (shelvesData || []).map((item) => {
    const s = item as unknown as {
      id: string;
      status: string;
      current_page: number;
      books: {
        id: string;
        title: string;
        author: string;
        cover_url: string | null;
        page_count: number;
        genre: string;
        slug: string;
      } | Array<{
        id: string;
        title: string;
        author: string;
        cover_url: string | null;
        page_count: number;
        genre: string;
        slug: string;
      }>;
    };
    const book = Array.isArray(s.books) ? s.books[0] : s.books;
    return {
      id: s.id,
      status: s.status as "want_to_read" | "reading" | "finished",
      current_page: s.current_page,
      books: book,
    };
  });

  // Fetch user reviews for book ratings
  const { data: reviews } = await supabase
    .from("reviews")
    .select("book_id, rating")
    .eq("user_id", user.id);

  const reviewMap: Record<string, number> = {};
  if (reviews) {
    reviews.forEach((r) => {
      reviewMap[r.book_id] = r.rating;
    });
  }

  return (
    <div className="space-y-8">
      <div className="text-left">
        <h1 className="font-serif text-3xl font-bold tracking-wide text-parchment-100">
          My Library Shelf
        </h1>
        <p className="text-sm text-parchment-500 mt-1">
          Keep track of books you want to read, are currently reading, or have completed.
        </p>
      </div>
      <ShelfView initialShelves={shelves} initialReviewMap={reviewMap} />
    </div>
  );
}
