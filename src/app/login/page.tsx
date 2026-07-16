import Link from "next/link";
import { BookOpen, Key, Mail, Lock, ShieldAlert, CheckCircle } from "lucide-react";
import { login, loginDemo } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const message = typeof params.message === "string" ? params.message : undefined;

  return (
    <main className="min-h-screen flex items-center justify-center bg-ink-950 px-4 py-12 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-ink-900 border border-ink-800 text-amber-500 mb-4 shadow-[0_0_15px_rgba(230,166,46,0.1)]">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-parchment-100 font-bold tracking-wide">
            Orbit
          </h1>
          <p className="text-parchment-500 mt-2 text-sm max-w-xs mx-auto">
            Your animated reading companion & book discovery tracker
          </p>
        </div>

        <div className="bg-ink-900 border border-ink-800 rounded-xl p-8 shadow-2xl relative backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-parchment-100 mb-6">
            Sign In
          </h2>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-950/40 border border-red-900/50 flex items-start gap-3 text-red-200 text-sm">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 rounded-lg bg-emerald-950/40 border border-emerald-900/50 flex items-start gap-3 text-emerald-200 text-sm">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {/* Email / Password Sign In Form */}
          <form action={login} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-parchment-500 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-parchment-500" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full bg-ink-950 border border-ink-800 rounded-lg py-2.5 pl-10 pr-4 text-parchment-100 placeholder-parchment-500/40 text-sm focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="block text-xs font-semibold text-parchment-500 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-parchment-500" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-ink-950 border border-ink-800 rounded-lg py-2.5 pl-10 pr-4 text-parchment-100 placeholder-parchment-500/40 text-sm focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-ink-800 hover:bg-ink-800/80 text-parchment-100 border border-ink-800 hover:border-amber-500/30 rounded-lg py-2.5 font-semibold text-sm transition-all focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            >
              Sign In
            </button>
          </form>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-ink-800" />
            </div>
            <span className="relative bg-ink-900 px-3 text-xs text-parchment-500 uppercase tracking-widest">
              Or explore instantly
            </span>
          </div>

          {/* Guest login action */}
          <form action={loginDemo}>
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-ink-950 font-semibold py-3 px-4 rounded-lg text-sm transition-all duration-300 shadow-[0_0_15px_rgba(230,166,46,0.1)] hover:shadow-[0_0_25px_rgba(230,166,46,0.3)] flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <Key className="w-4 h-4" />
              Try Guest Demo
            </button>
          </form>

          <p className="text-center text-xs text-parchment-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-amber-500 hover:text-amber-400 font-medium transition-colors underline underline-offset-4"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
