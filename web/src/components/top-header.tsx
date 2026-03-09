"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import AuthControls from "@/components/auth-controls";
import { HiClock, HiHome, HiSparkles } from "react-icons/hi2";
import { toast } from "sonner";

export default function TopHeader() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isAuthenticated = status === "authenticated" && Boolean(session?.user);

  const onHistory = pathname.startsWith("/history");
  const onPlay = pathname.startsWith("/play/");

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-amber-500/30 bg-[#120a06]/80 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex items-center gap-1.5">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300/35 bg-amber-100/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-100 transition hover:bg-amber-100/20"
            >
              <HiSparkles className="text-sm" aria-hidden />
              <span className="hidden sm:inline">Snakes & Ladders</span>
              <span className="sm:hidden">S&L</span>
            </Link>
            {!isHome && (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/20 px-2.5 py-2 text-xs font-semibold text-amber-100/85 transition hover:border-amber-300/35 hover:bg-amber-100/10"
              >
                <HiHome className="text-sm" aria-hidden />
                <span className="hidden sm:inline">Menu</span>
              </Link>
            )}
            {!onHistory && (
              isAuthenticated ? (
                <Link
                  href="/history"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/20 px-2.5 py-2 text-xs font-semibold text-amber-100/85 transition hover:border-amber-300/35 hover:bg-amber-100/10"
                >
                  <HiClock className="text-sm" aria-hidden />
                  <span className="hidden sm:inline">History</span>
                </Link>
              ) : (
                <Link
                  href="/#auth-gate"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/20 px-2.5 py-2 text-xs font-semibold text-amber-100/85 transition hover:border-amber-300/35 hover:bg-amber-100/10"
                  onClick={() => {
                    toast.info("Sign in to view your match history.");
                  }}
                >
                  <HiClock className="text-sm" aria-hidden />
                  <span className="hidden sm:inline">History</span>
                </Link>
              )
            )}
            {onPlay && isAuthenticated && (
              <span className="hidden rounded-lg border border-emerald-400/35 bg-emerald-300/10 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-200/90 md:inline-flex">
                In Match
              </span>
            )}
          </div>
          <div className="shrink-0">
          <AuthControls />
          </div>
        </div>
      </div>
    </header>
  );
}
