import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Fetch public profile details
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const username = profile?.username || user.email?.split("@")[0] || "user";
  const displayName = profile?.display_name || username;

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col">
      <Nav username={username} displayName={displayName} />
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {children}
      </div>
    </div>
  );
}
