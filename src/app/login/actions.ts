"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login authentication error:", error);
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }
  } catch (err) {
    const errorObject = err as Error & { digest?: string };
    if (errorObject?.digest?.startsWith("NEXT_REDIRECT") || errorObject?.message === "NEXT_REDIRECT") throw err;
    console.error("Login server action crashed:", err);
    redirect(`/login?error=${encodeURIComponent(errorObject?.message || "An unexpected error occurred")}`);
  }

  redirect("/app/shelf");
}

export async function signup(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const username = formData.get("username") as string;
    const display_name = formData.get("display_name") as string;
    
    if (!username || username.trim().length < 3) {
      redirect(`/signup?error=Username must be at least 3 characters`);
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim().toLowerCase(),
          display_name: display_name.trim(),
        },
      },
    });

    if (error) {
      console.error("Signup authentication error:", error);
      redirect(`/signup?error=${encodeURIComponent(error.message)}`);
    }
  } catch (err) {
    const errorObject = err as Error & { digest?: string };
    if (errorObject?.digest?.startsWith("NEXT_REDIRECT") || errorObject?.message === "NEXT_REDIRECT") throw err;
    console.error("Signup server action crashed:", err);
    redirect(`/signup?error=${encodeURIComponent(errorObject?.message || "An unexpected error occurred")}`);
  }

  redirect("/login?message=Check your email to confirm your account");
}

export async function loginDemo() {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: "demo@orbit.com",
      password: "orbitdemo123",
    });

    if (error) {
      console.error("Demo login authentication error:", error);
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }
  } catch (err) {
    const errorObject = err as Error & { digest?: string };
    if (errorObject?.digest?.startsWith("NEXT_REDIRECT") || errorObject?.message === "NEXT_REDIRECT") throw err;
    console.error("Demo login server action crashed:", err);
    redirect(`/login?error=${encodeURIComponent(errorObject?.message || "An unexpected error occurred")}`);
  }

  redirect("/app/shelf");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
