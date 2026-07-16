"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

export async function addToShelf(
  bookData: {
    title: string;
    author: string;
    cover_url: string;
    open_library_id: string;
    genre?: string;
    page_count?: number;
  },
  status: "want_to_read" | "reading" | "finished"
) {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Authentication required" };
  }

  // 1. Resolve or create book
  let bookId: string;
  const { data: existingBook } = await supabase
    .from("books")
    .select("id")
    .eq("open_library_id", bookData.open_library_id)
    .maybeSingle();

  if (existingBook) {
    bookId = existingBook.id;
  } else {
    let slug = slugify(bookData.title);
    // Ensure slug uniqueness
    const { data: slugCheck } = await supabase
      .from("books")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (slugCheck) {
      slug = `${slug}-${bookData.open_library_id}`;
    }

    const { data: newBook, error: bookError } = await supabase
      .from("books")
      .insert({
        title: bookData.title,
        author: bookData.author,
        cover_url: bookData.cover_url,
        open_library_id: bookData.open_library_id,
        genre: bookData.genre || "Uncategorized",
        page_count: bookData.page_count || 200,
        slug,
      })
      .select("id")
      .single();

    if (bookError || !newBook) {
      return { success: false, error: bookError?.message || "Failed to insert book" };
    }
    bookId = newBook.id;
  }

  // 2. Add to shelf
  const startedAt = status === "reading" || status === "finished" ? new Date().toISOString() : null;
  const finishedAt = status === "finished" ? new Date().toISOString() : null;
  const currentPage = status === "finished" ? (bookData.page_count || 200) : 0;

  const { error: shelfError } = await supabase
    .from("shelves")
    .upsert({
      user_id: user.id,
      book_id: bookId,
      status,
      current_page: currentPage,
      started_at: startedAt,
      finished_at: finishedAt,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id,book_id"
    });

  if (shelfError) {
    return { success: false, error: shelfError.message };
  }

  revalidatePath("/app/shelf");
  revalidatePath("/discover");
  return { success: true };
}

export async function logProgress(shelfId: string, pagesRead: number) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Authentication required" };
  }

  // 1. Fetch current shelf state
  const { data: shelf, error: fetchError } = await supabase
    .from("shelves")
    .select(`
      id,
      user_id,
      current_page,
      status,
      started_at,
      books (
        page_count
      )
    `)
    .eq("id", shelfId)
    .single();

  if (fetchError || !shelf) {
    return { success: false, error: "Shelf record not found" };
  }

  if (shelf.user_id !== user.id) {
    return { success: false, error: "Unauthorized access to this shelf" };
  }

  const bookPageCount = (shelf.books as unknown as { page_count: number }).page_count;
  const newPage = Math.min(bookPageCount, shelf.current_page + pagesRead);
  const isFinishedNow = newPage >= bookPageCount;
  
  // 2. Insert reading log
  const { error: logError } = await supabase
    .from("reading_logs")
    .insert({
      shelf_id: shelfId,
      pages_read: pagesRead,
      logged_at: new Date().toISOString(),
    });

  if (logError) {
    return { success: false, error: logError.message };
  }

  // 3. Update shelf progress
  const updateData: {
    current_page: number;
    status: "want_to_read" | "reading" | "finished";
    started_at: string | null;
    finished_at: string | null;
    updated_at: string;
  } = {
    current_page: newPage,
    status: isFinishedNow ? "finished" : "reading",
    started_at: shelf.started_at || new Date().toISOString(),
    finished_at: isFinishedNow ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("shelves")
    .update(updateData)
    .eq("id", shelfId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/app/shelf");
  revalidatePath("/app/feed");
  return { success: true, finished: isFinishedNow };
}

export async function saveReview(bookId: string, rating: number, body: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Authentication required" };
  }

  const { error: reviewError } = await supabase
    .from("reviews")
    .upsert({
      user_id: user.id,
      book_id: bookId,
      rating,
      body: body.trim(),
      created_at: new Date().toISOString(),
    }, {
      onConflict: "user_id,book_id"
    });

  if (reviewError) {
    return { success: false, error: reviewError.message };
  }

  revalidatePath("/app/shelf");
  return { success: true };
}

export async function toggleFollow(followingId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Authentication required" };
  }

  if (user.id === followingId) {
    return { success: false, error: "You cannot follow yourself" };
  }

  // Check if following relationship exists
  const { data: existingFollow } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", followingId)
    .maybeSingle();

  if (existingFollow) {
    // Unfollow
    const { error: deleteError } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", followingId);

    if (deleteError) return { success: false, error: deleteError.message };
  } else {
    // Follow
    const { error: insertError } = await supabase
      .from("follows")
      .insert({
        follower_id: user.id,
        following_id: followingId,
        created_at: new Date().toISOString(),
      });

    if (insertError) return { success: false, error: insertError.message };
  }

  revalidatePath("/app/feed");
  return { success: true, followed: !existingFollow };
}

export async function removeFromShelf(shelfId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Authentication required" };
  }

  const { error: deleteError } = await supabase
    .from("shelves")
    .delete()
    .eq("id", shelfId)
    .eq("user_id", user.id);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath("/app/shelf");
  return { success: true };
}
