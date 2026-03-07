import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const matches = await prisma.gameHistory.findMany({
    orderBy: { createdAt: "desc" },
    include: { moves: { orderBy: { createdAt: "asc" } } },
    take: 30
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 text-amber-50">
      <section className="flex items-center justify-between rounded-2xl border border-amber-700/50 bg-[linear-gradient(180deg,#3a1b0f_0%,#1e0f0a_100%)] p-5 shadow-xl">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-amber-200/70">Adventure Log</p>
          <h1 className="text-3xl font-black tracking-tight text-amber-100">Match History</h1>
          <p className="text-sm text-amber-100/80">Latest completed snakes and ladders matches.</p>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-amber-300/40 bg-amber-100/10 px-4 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-100/20"
        >
          Back to game
        </Link>
      </section>

      {matches.length === 0 ? (
        <section className="rounded-2xl border border-amber-700/50 bg-[linear-gradient(180deg,#2b160f_0%,#180d08_100%)] p-6 text-sm text-amber-100/80 shadow-xl">
          No saved matches yet. Complete a game to see it here.
        </section>
      ) : (
        <section className="space-y-4">
          {matches.map((match) => {
            const playerNames = Array.isArray(match.playerNames) ? (match.playerNames as string[]) : [];
            return (
              <article
                key={match.id}
                className="rounded-2xl border border-amber-700/50 bg-[linear-gradient(180deg,#2b160f_0%,#180d08_100%)] p-5 shadow-xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-amber-100/90">
                    Room <span className="font-bold text-amber-100">{match.roomCode}</span>
                  </p>
                  <p className="text-xs text-amber-100/60">{new Date(match.createdAt).toLocaleString()}</p>
                </div>
                <p className="mt-2 text-sm text-amber-100/90">
                  Winner: <span className="font-semibold text-emerald-300">{match.winnerName}</span>
                </p>
                <p className="mt-1 text-sm text-amber-100/75">Players: {playerNames.join(", ") || "Unknown"}</p>
                <p className="mt-1 text-sm text-amber-100/75">Moves: {match.moves.length}</p>
                <div className="mt-3">
                  <Link
                    href={`/history/${match.id}`}
                    className="inline-flex rounded-lg border border-amber-300/40 bg-amber-100/10 px-3 py-1.5 text-xs font-semibold text-amber-50 transition hover:bg-amber-100/20"
                  >
                    View details
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
