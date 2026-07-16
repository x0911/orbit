import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Shelf3DToggle from "@/components/features/shelf-3d-toggle";

export const dynamic = "force-dynamic";

export default async function ShelfPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  // Fetch user shelves data
  const { data: shelvesData, error: shelfFetchError } = await supabase
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
      books:
        | {
            id: string;
            title: string;
            author: string;
            cover_url: string | null;
            page_count: number;
            genre: string;
            slug: string;
          }
        | Array<{
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

  return <Shelf3DToggle initialShelves={shelves} initialReviewMap={reviewMap} />;
}
