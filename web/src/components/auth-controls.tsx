"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { HiArrowLeftOnRectangle, HiArrowRightOnRectangle } from "react-icons/hi2";

export default function AuthControls() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <span className="inline-flex rounded-xl border border-amber-300/30 bg-amber-100/10 px-3 py-1.5 text-xs font-semibold text-amber-100/70">
        Checking auth...
      </span>
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/#auth-gate"
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/45 bg-amber-100/10 px-3 py-2 text-xs font-semibold text-amber-50 transition hover:bg-amber-100/20"
      >
        <HiArrowRightOnRectangle className="text-sm" aria-hidden />
        Sign In
      </Link>
    );
  }

  const label = session.user.name || session.user.email || "Signed in";
  return (
    <div className="flex items-center gap-2">
      <span className="hidden rounded-xl border border-amber-300/30 bg-amber-100/10 px-3 py-1.5 text-xs font-semibold text-amber-100/80 sm:inline-flex">
        {label}
      </span>
      <button
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/45 bg-amber-100/10 px-3 py-2 text-xs font-semibold text-amber-50 transition hover:bg-amber-100/20"
        onClick={() => {
          void signOut({ callbackUrl: "/" });
        }}
      >
        <HiArrowLeftOnRectangle className="text-sm" aria-hidden />
        Sign Out
      </button>
    </div>
  );
}
