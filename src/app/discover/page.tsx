import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, Compass, Plus, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addToShelf } from "@/app/app/shelf/actions";

interface OpenLibraryBook {
  title: string;
  author: string;
  open_library_id: string;
  cover_url: string | null;
  page_count: number;
  genre: string;
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; message?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const message = params.message || "";

  // 1. Fetch current user session to determine if logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Fetch books from Open Library if query is provided
  let searchResults: OpenLibraryBook[] = [];
  let loadingError = "";

  if (query.trim().length > 0) {
    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=9`,
        { next: { revalidate: 3600 } } // cache search query results for 1 hour
      );
      if (!res.ok) {
        throw new Error("Failed to fetch from Open Library API");
      }
      const data = await res.json() as { docs?: Array<{
        title: string;
        author_name?: string[];
        key: string;
        edition_key?: string[];
        cover_i?: number;
        number_of_pages_median?: number;
        subject?: string[];
      }> };
      searchResults = (data.docs || []).map((doc) => {
        const coverId = doc.cover_i;
        const openLibraryId = doc.key ? doc.key.replace("/works/", "") : doc.edition_key?.[0] || "";
        return {
          title: doc.title,
          author: doc.author_name?.[0] || "Unknown Author",
          open_library_id: openLibraryId,
          cover_url: coverId
            ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
            : null,
          page_count: doc.number_of_pages_median || 200,
          genre: doc.subject?.[0] || "Fiction",
        };
      });
    } catch (err: unknown) {
      loadingError = (err as Error).message || "An error occurred while searching.";
    }
  }

  // 3. Handle Add to Shelf action inside Server Action
  const handleAddToShelf = async (formData: FormData) => {
    "use server";
    const openLibraryId = formData.get("open_library_id") as string;
    const title = formData.get("title") as string;
    const author = formData.get("author") as string;
    const coverUrl = formData.get("cover_url") as string;
    const pageCount = parseInt(formData.get("page_count") as string, 10);
    const genre = formData.get("genre") as string;
    const status = formData.get("status") as "want_to_read" | "reading" | "finished";

    const res = await addToShelf(
      {
        title,
        author,
        cover_url: coverUrl || "",
        open_library_id: openLibraryId,
        page_count: pageCount || 200,
        genre: genre || "Fiction",
      },
      status
    );

    if (res.success) {
      // Redirect with a success notification param
      const encodedQuery = encodeURIComponent(query);
      const successMsg = encodeURIComponent(`"${title}" added to your shelf!`);
      return redirect(`/discover?q=${encodedQuery}&message=${successMsg}`);
    }
  };

  return (
    <main className="text-parchment-100 min-h-screen pb-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-ink-900 border border-ink-800 text-amber-500 flex items-center justify-center shadow-[0_0_15px_rgba(230,166,46,0.05)]">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-wide">
              Discover Books
            </h1>
            <p className="text-sm text-parchment-500">
              Search the Open Library catalog and add books to your shelf
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {message && (
          <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-900/50 flex items-center gap-2 text-emerald-200 text-sm">
            <CheckCircle className="w-5 h-5 shrink-0" />
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

        {/* Search Results Grid */}
        {query && (
          <div className="space-y-6">
            <h2 className="text-xs font-semibold text-parchment-500 uppercase tracking-widest">
              Search Results for &ldquo;{query}&rdquo;
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {searchResults.map((book, i) => (
                  <div
                    key={i}
                    className="bg-ink-900 border border-ink-800 rounded-xl p-5 flex flex-col justify-between shadow-lg hover:border-ink-700 transition-all hover:translate-y-[-2px] duration-300"
                  >
                    <div className="space-y-4">
                      {/* Cover Preview (2:3 aspect) */}
                      <div className="relative aspect-[2/3] w-32 mx-auto rounded-lg overflow-hidden border border-ink-800 bg-ink-950 shadow-md">
                        {book.cover_url ? (
                          <Image
                            src={book.cover_url}
                            alt={`Cover of ${book.title}`}
                            fill
                            sizes="128px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-parchment-500 text-[10px] p-2 text-center font-serif leading-tight">
                            {book.title}
                          </div>
                        )}
                      </div>

                      <div className="text-center space-y-1">
                        <h3 className="font-serif font-bold text-parchment-100 text-sm line-clamp-1">
                          {book.title}
                        </h3>
                        <p className="text-xs text-parchment-300 line-clamp-1">
                          {book.author}
                        </p>
                        <p className="text-[10px] text-parchment-500">
                          {book.page_count} pages • {book.genre}
                        </p>
                      </div>
                    </div>

                    {/* Shelf Controls */}
                    <div className="mt-5 pt-4 border-t border-ink-850">
                      {user ? (
                        <form action={handleAddToShelf} className="flex flex-col gap-2">
                          <input type="hidden" name="open_library_id" value={book.open_library_id} />
                          <input type="hidden" name="title" value={book.title} />
                          <input type="hidden" name="author" value={book.author} />
                          <input type="hidden" name="cover_url" value={book.cover_url || ""} />
                          <input type="hidden" name="page_count" value={book.page_count} />
                          <input type="hidden" name="genre" value={book.genre} />

                          <select
                            name="status"
                            defaultValue="want_to_read"
                            className="w-full bg-ink-950 border border-ink-800 rounded-lg px-2 py-1.5 text-xs text-parchment-300 focus:outline-none focus:border-amber-500/50"
                          >
                            <option value="want_to_read">Want to Read</option>
                            <option value="reading">Reading</option>
                            <option value="finished">Finished</option>
                          </select>
                          <button
                            type="submit"
                            className="w-full bg-ink-800 hover:bg-amber-500 hover:text-ink-950 text-parchment-100 border border-ink-850 hover:border-transparent py-1.5 rounded-lg text-xs font-semibold transition-all focus:outline-none flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add to Shelf
                          </button>
                        </form>
                      ) : (
                        <Link
                          href="/login"
                          className="w-full bg-ink-800 hover:bg-ink-750 text-parchment-300 hover:text-parchment-100 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 border border-ink-850"
                        >
                          Sign In to Add
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
