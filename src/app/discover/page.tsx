import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, Compass, Plus, CheckCircle, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addToShelf } from "@/app/app/shelf/actions";
import Nav from "@/components/nav";
import ThemeToggle from "@/components/theme-toggle";

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
  searchParams: Promise<{ q?: string; message?: string; genre?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const message = params.message || "";
  const selectedGenre = params.genre || "";
  const page = parseInt(params.page || "1", 10);
  const limit = 9;

  // 1. Fetch current user session to determine if logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Fetch profile info if logged in
  let profile = null;
  const userBookStatusMap: Record<string, string> = {};

  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .maybeSingle();
    profile = p;

    // Fetch user shelves to know status of books
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

  // 3. Fetch books from database (if query is empty) or Open Library (if searched)
  let searchResults: OpenLibraryBook[] = [];
  let loadingError = "";
  let totalItems = 0;

  if (query.trim().length > 0) {
    try {
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}${
        selectedGenre ? `&subject=${encodeURIComponent(selectedGenre)}` : ""
      }&page=${page}&limit=${limit}`;

      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) {
        throw new Error("Failed to fetch from Open Library API");
      }
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
    // Show seeded books from the database with pagination when search query is empty
    let dbQuery = supabase
      .from("books")
      .select("*", { count: "exact" });

    if (selectedGenre) {
      dbQuery = dbQuery.ilike("genre", `%${selectedGenre}%`);
    }

    const { data: dbBooks, count, error: dbError } = await dbQuery
      .range((page - 1) * limit, page * limit - 1);

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

  // 4. Handle Add/Update Status Action
  const handleAddToShelf = async (formData: FormData) => {
    "use server";
    const openLibraryId = formData.get("open_library_id") as string;
    const title = formData.get("title") as string;
    const author = formData.get("author") as string;
    const coverUrl = formData.get("cover_url") as string;
    const pageCount = parseInt(formData.get("page_count") as string, 10);
    const genre = formData.get("genre") as string;
    const status = formData.get("status") as
      | "want_to_read"
      | "reading"
      | "finished";

    const res = await addToShelf(
      {
        title,
        author,
        cover_url: coverUrl || "",
        open_library_id: openLibraryId,
        page_count: pageCount || 200,
        genre: genre || "Fiction",
      },
      status,
    );

    if (res.success) {
      const encodedQuery = encodeURIComponent(query);
      const successMsg = encodeURIComponent(`"${title}" shelf status updated!`);
      return redirect(`/discover?q=${encodedQuery}&message=${successMsg}`);
    }
  };

  const totalPages = Math.ceil(totalItems / limit);
  const username = profile?.username || user?.email?.split("@")[0] || "";
  const displayName = profile?.display_name || username;

  return (
    <div className="min-h-screen bg-ink-950 text-parchment-100 flex flex-col">
      {/* Dynamic Header */}
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

      {/* Main Discover Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8">
        {/* Title */}
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

        {/* Success Alert */}
        {message && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-250 text-emerald-850 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-200 flex items-center gap-2 text-sm text-left shadow-sm">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{message}</span>
          </div>
        )}

        {/* Search Bar */}
        <form method="GET" action="/discover" className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-parchment-500" />
            <input
              name="q"
              type="text"
              defaultValue={query}
              placeholder="Search by title, author, or keyword..."
              className="w-full bg-ink-900 border border-ink-800 rounded-xl py-3 pl-12 pr-4 text-parchment-100 placeholder-parchment-500/40 text-sm focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner"
            />
          </div>
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-600 text-ink-950 font-semibold px-6 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Genre Filters Row */}
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-850 pb-4 text-left">
          <span className="text-xs font-semibold text-parchment-500 uppercase tracking-widest mr-2">
            Filter Genre:
          </span>
          {[
            { label: "All Genres", value: "" },
            { label: "Fiction", value: "Fiction" },
            { label: "Science Fiction", value: "Science Fiction" },
            { label: "Fantasy", value: "Fantasy" },
            { label: "Romance", value: "Romance" },
            { label: "History", value: "History" },
            { label: "Biography", value: "Biography" },
          ].map((g) => {
            const isActive = selectedGenre === g.value;
            const linkUrl = `/discover?q=${encodeURIComponent(query)}&genre=${encodeURIComponent(g.value)}&page=1`;
            return (
              <Link
                key={g.label}
                href={linkUrl}
                className={`text-xs px-3.5 py-1.5 rounded-full border transition-all duration-200 ${
                  isActive
                    ? "bg-amber-500/10 border-amber-500/50 text-amber-500 font-bold"
                    : "bg-ink-900 border-ink-850 text-parchment-500 hover:text-parchment-100 hover:border-ink-800"
                }`}
              >
                {g.label}
              </Link>
            );
          })}
        </div>

        {/* Books Grid */}
        <div className="space-y-6 text-left">
          <h2 className="text-xs font-semibold text-parchment-500 uppercase tracking-widest">
            {query
              ? `Search Results for "${query}"`
              : "Featured Reading Selections"}
          </h2>

          {loadingError && (
            <p className="text-red-400 text-sm py-4">{loadingError}</p>
          )}

          {searchResults.length === 0 && !loadingError && (
            <div className="text-center py-12 rounded-xl bg-ink-900 border border-ink-800 border-dashed">
              <p className="text-parchment-500 text-sm">
                No books found matching your query. Try another search.
              </p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((book, i) => {
                const currentStatus = userBookStatusMap[book.open_library_id];
                const cleanStatusLabel = currentStatus
                  ? currentStatus.replace(/_/g, " ")
                  : null;

                const bookDetailUrl = `/book/${book.slug || book.open_library_id}`;

                return (
                  <div
                    key={i}
                    className="bg-ink-900 border border-ink-800 rounded-xl p-5 flex flex-col justify-between shadow-lg hover:border-ink-700 transition-all hover:translate-y-[-2px] duration-300"
                  >
                    <div className="space-y-4">
                      {/* Cover & Info Link */}
                      <Link href={bookDetailUrl} className="block group/cover space-y-4">
                        {/* Cover Preview (2:3 aspect) */}
                        <div className="relative aspect-[2/3] w-32 mx-auto rounded-lg overflow-hidden border border-ink-800 bg-ink-950 shadow-md group-hover/cover:border-amber-500/50 transition-all">
                          {book.cover_url ? (
                            <Image
                              src={book.cover_url}
                              alt={`Cover of ${book.title}`}
                              fill
                              sizes="128px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-parchment-500 text-[10px] p-2 text-center font-sans leading-tight">
                              {book.title}
                            </div>
                          )}
                        </div>

                        <div className="text-center space-y-1">
                          <h3 className="font-sans font-bold text-parchment-100 text-sm line-clamp-1 group-hover/cover:text-amber-500 transition-colors">
                            {book.title}
                          </h3>
                          <p className="text-xs text-parchment-300 line-clamp-1">
                            {book.author}
                          </p>
                        </div>
                      </Link>

                      <div className="text-center space-y-1">
                        <p className="text-[10px] text-parchment-500">
                          {book.page_count} pages • {book.genre}
                        </p>

                        {/* Shelf status indicator badge */}
                        {cleanStatusLabel && (
                          <div className="inline-flex mt-1 text-[9px] font-semibold bg-amber-500/10 border border-amber-500/25 text-amber-500 px-2 py-0.5 rounded uppercase tracking-wider">
                            On Shelf: {cleanStatusLabel}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Shelf Controls */}
                    <div className="mt-5 pt-4 border-t border-ink-850">
                      {user ? (
                        <form
                          action={handleAddToShelf}
                          className="flex flex-col gap-3"
                        >
                          <input
                            type="hidden"
                            name="open_library_id"
                            value={book.open_library_id}
                          />
                          <input
                            type="hidden"
                            name="title"
                            value={book.title}
                          />
                          <input
                            type="hidden"
                            name="author"
                            value={book.author}
                          />
                          <input
                            type="hidden"
                            name="cover_url"
                            value={book.cover_url || ""}
                          />
                          <input
                            type="hidden"
                            name="page_count"
                            value={book.page_count}
                          />
                          <input
                            type="hidden"
                            name="genre"
                            value={book.genre}
                          />

                          {/* Horizontal Radio Button Row */}
                          <div
                            className="flex gap-1.5"
                            role="radiogroup"
                            aria-label="Shelf status selector"
                          >
                            {[
                              { value: "want_to_read", label: "Wishlist" },
                              { value: "reading", label: "Reading" },
                              { value: "finished", label: "Finished" },
                            ].map((opt) => (
                              <label
                                key={opt.value}
                                className="flex-1 text-center py-1.5 rounded-lg text-[9px] font-semibold border cursor-pointer select-none transition-all
                                  has-[:checked]:bg-amber-500/10 has-[:checked]:border-amber-500/40 has-[:checked]:text-amber-500
                                  bg-ink-950 border-ink-850 text-parchment-500 hover:text-parchment-300"
                              >
                                <input
                                  type="radio"
                                  name="status"
                                  value={opt.value}
                                  defaultChecked={
                                    currentStatus
                                      ? currentStatus === opt.value
                                      : opt.value === "want_to_read"
                                  }
                                  className="sr-only"
                                />
                                {opt.label}
                              </label>
                            ))}
                          </div>

                          <button
                            type="submit"
                            className="w-full bg-ink-800 hover:bg-amber-500 hover:text-ink-950 text-parchment-100 border border-ink-850 hover:border-transparent py-2 rounded-lg text-xs font-semibold transition-all focus:outline-none flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {currentStatus ? "Update Status" : "Add to Shelf"}
                          </button>
                        </form>
                      ) : (
                        <Link
                          href="/login"
                          className="w-full bg-ink-800 hover:bg-ink-750 text-parchment-300 hover:text-parchment-100 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 border border-ink-850"
                        >
                          Sign In to Add
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-6 border-t border-ink-850">
              <Link
                href={page > 1 ? `/discover?q=${encodeURIComponent(query)}&genre=${encodeURIComponent(selectedGenre)}&page=${page - 1}` : "#"}
                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                  page > 1
                    ? "bg-ink-900 border-ink-800 text-parchment-100 hover:bg-ink-800 cursor-pointer"
                    : "opacity-40 pointer-events-none text-parchment-500 border-ink-850"
                }`}
                aria-disabled={page <= 1}
              >
                Previous
              </Link>
              <span className="text-xs text-parchment-500 font-semibold uppercase tracking-wider">
                Page {page} of {totalPages}
              </span>
              <Link
                href={page < totalPages ? `/discover?q=${encodeURIComponent(query)}&genre=${encodeURIComponent(selectedGenre)}&page=${page + 1}` : "#"}
                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                  page < totalPages
                    ? "bg-ink-900 border-ink-800 text-parchment-100 hover:bg-ink-800 cursor-pointer"
                    : "opacity-40 pointer-events-none text-parchment-500 border-ink-850"
                }`}
                aria-disabled={page >= totalPages}
              >
                Next
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
