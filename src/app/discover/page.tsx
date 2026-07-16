import Link from "next/link";
import { Compass, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/nav";
import ThemeToggle from "@/components/theme-toggle";
import DiscoverClient from "@/components/features/discover-client";

interface OpenLibraryBook {
  title: string;
  author: string;
  open_library_id: string;
  cover_url: string | null;
  page_count: number;
  genre: string;
  slug?: string;
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; genre?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const selectedGenre = params.genre || "";
  const page = parseInt(params.page || "1", 10);
  const limit = 9;

  // 1. Auth & profile
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  const userBookStatusMap: Record<string, string> = {};

  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .maybeSingle();
    profile = p;

    // Build map of which books are already on the user's shelf
    const { data: userShelves } = await supabase
      .from("shelves")
      .select(
        `
        status,
        books (
          open_library_id
        )
      `,
      )
      .eq("user_id", user.id);

    if (userShelves) {
      (
        userShelves as unknown as Array<{
          status: string;
          books: { open_library_id: string } | null;
        }>
      ).forEach((s) => {
        const olId = s.books?.open_library_id;
        if (olId) {
          userBookStatusMap[olId] = s.status;
        }
      });
    }
  }

  // 2. Fetch books — Open Library if query present, DB otherwise
  let searchResults: OpenLibraryBook[] = [];
  let loadingError = "";
  let totalItems = 0;

  if (query.trim().length > 0 || selectedGenre.trim().length > 0) {
    try {
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}${
        selectedGenre ? `&subject=${encodeURIComponent(selectedGenre)}` : ""
      }&page=${page}&limit=${limit}`;

      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) throw new Error("Failed to fetch from Open Library API");

      const data = (await res.json()) as {
        numFound?: number;
        docs?: Array<{
          title: string;
          author_name?: string[];
          key: string;
          edition_key?: string[];
          cover_i?: number;
          number_of_pages_median?: number;
          subject?: string[];
        }>;
      };

      totalItems = data.numFound || 0;
      searchResults = (data.docs || []).map((doc) => {
        const coverId = doc.cover_i;
        const openLibraryId = doc.key
          ? doc.key.replace("/works/", "")
          : doc.edition_key?.[0] || "";
        return {
          title: doc.title,
          author: doc.author_name?.[0] || "Unknown Author",
          open_library_id: openLibraryId,
          cover_url: coverId
            ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
            : null,
          page_count: doc.number_of_pages_median || 200,
          genre: doc.subject?.[0] || "Fiction",
          slug: openLibraryId,
        };
      });
    } catch (err: unknown) {
      loadingError =
        (err as Error).message || "An error occurred while searching.";
    }
  } else {
    // Show seeded DB books with pagination
    let dbQuery = supabase.from("books").select("*", { count: "exact" });

    if (selectedGenre) {
      dbQuery = dbQuery.ilike("genre", `%${selectedGenre}%`);
    }

    const {
      data: dbBooks,
      count,
      error: dbError,
    } = await dbQuery.range((page - 1) * limit, page * limit - 1);

    if (dbError) {
      loadingError = dbError.message;
    } else if (dbBooks) {
      totalItems = count || 0;
      searchResults = dbBooks.map((b) => ({
        title: b.title,
        author: b.author,
        open_library_id: b.open_library_id,
        cover_url: b.cover_url,
        page_count: b.page_count,
        genre: b.genre,
        slug: b.slug,
      }));
    }
  }

  const totalPages = Math.ceil(totalItems / limit);
  const username = profile?.username || user?.email?.split("@")[0] || "";
  const displayName = profile?.display_name || username;

  return (
    <div className="min-h-screen bg-ink-950 text-parchment-100 flex flex-col">
      {/* Header */}
      {user && profile ? (
        <Nav username={username} displayName={displayName} />
      ) : (
        <nav className="sticky top-0 z-50 bg-ink-900/85 backdrop-blur-md border-b border-ink-800 px-4 md:px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-full bg-ink-950 border border-ink-800 text-amber-500 flex items-center justify-center shadow-md">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-sans text-xl font-bold tracking-wide text-parchment-100">
                Orbit
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link
                href="/login"
                className="bg-amber-500 hover:bg-amber-600 text-ink-950 font-bold px-4 py-1.5 rounded-lg text-xs tracking-wide transition-all shadow"
              >
                Sign In
              </Link>
            </div>
          </div>
        </nav>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8">
        {/* Page title */}
        <div className="flex items-center gap-3 text-left">
          <div className="w-12 h-12 rounded-xl bg-ink-900 border border-ink-800 text-amber-500 flex items-center justify-center shadow-md">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-sans text-3xl font-bold tracking-wide">
              Discover Books
            </h1>
            <p className="text-sm text-parchment-500">
              {query
                ? "Explore Open Library matches"
                : "Trending volumes and community favorites"}
            </p>
          </div>
        </div>

        {/* Interactive client section — search, filters, books, pagination */}
        <DiscoverClient
          initialResults={searchResults}
          initialQuery={query}
          initialGenre={selectedGenre}
          initialPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          loadingError={loadingError}
          initialStatusMap={userBookStatusMap}
          isLoggedIn={!!user}
        />
      </main>
    </div>
  );
}
