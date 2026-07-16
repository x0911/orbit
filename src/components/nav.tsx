"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, Compass, Users, LogOut, Menu, X } from "lucide-react";
import { logout } from "@/app/login/actions";
import ThemeToggle from "@/components/theme-toggle";

export default function Nav({
  username,
  displayName,
}: {
  username: string;
  displayName: string;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { href: "/app/shelf", label: "My Shelf", icon: BookOpen },
    { href: "/app/feed", label: "Friend Feed", icon: Users },
    { href: "/discover", label: "Discover", icon: Compass },
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="sticky top-0 z-50 bg-ink-900/85 backdrop-blur-md border-b border-ink-800 px-4 md:px-8 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/app/shelf" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-full bg-ink-950 border border-ink-800 text-amber-500 flex items-center justify-center shadow-[0_0_10px_rgba(230,166,46,0.05)] group-hover:shadow-[0_0_15px_rgba(230,166,46,0.2)] transition-all">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="font-serif text-xl font-bold tracking-wide text-parchment-100 group-hover:text-amber-400 transition-colors">
            Orbit
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 text-sm font-medium transition-all py-1.5 px-3 rounded-lg border border-transparent ${
                  isActive
                    ? "text-amber-500 bg-amber-500/5 border-amber-500/10"
                    : "text-parchment-500 hover:text-parchment-100 hover:bg-ink-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* User Actions */}
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <div className="flex items-center gap-2 border-r border-ink-800 pr-4">
            <div className="w-8 h-8 rounded-full bg-ink-800 border border-ink-800 text-amber-500 flex items-center justify-center uppercase font-bold text-xs">
              {displayName ? displayName.charAt(0) : username.charAt(0)}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-parchment-100">
                {displayName || username}
              </span>
              <span className="text-[10px] text-parchment-500">
                @{username}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sign Out"
            className="flex items-center justify-center p-2 rounded-lg bg-ink-950 border border-ink-800 hover:border-red-900/30 text-parchment-500 hover:text-red-400 hover:bg-red-950/10 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Menu"
          className="md:hidden p-2 rounded-lg text-parchment-500 hover:text-parchment-100 bg-ink-950 border border-ink-800 focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-ink-800 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-2">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 text-sm font-medium py-3 px-4 rounded-lg transition-all ${
                    isActive
                      ? "text-amber-500 bg-amber-500/5"
                      : "text-parchment-500 hover:text-parchment-100 hover:bg-ink-850"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-ink-800 pt-4 flex items-center justify-between px-4 pb-2">
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-full bg-ink-800 border border-ink-800 text-amber-500 flex items-center justify-center uppercase font-bold text-sm">
                {displayName ? displayName.charAt(0) : username.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-parchment-100">
                  {displayName || username}
                </span>
                <span className="text-xs text-parchment-500">
                  @{username}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 py-2 px-3 rounded-lg border border-red-950/20 bg-red-950/10 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
