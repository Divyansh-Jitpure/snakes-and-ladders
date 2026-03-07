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
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
      <section className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Match History</h1>
          <p className="text-sm text-stone-600">Latest completed snakes and ladders matches.</p>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
        >
          Back to game
        </Link>
      </section>

      {matches.length === 0 ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm">
          No saved matches yet. Complete a game to see it here.
        </section>
      ) : (
        <section className="space-y-4">
          {matches.map((match) => {
            const playerNames = Array.isArray(match.playerNames) ? (match.playerNames as string[]) : [];
            return (
              <article key={match.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-stone-700">
                    Room <span className="font-semibold text-stone-900">{match.roomCode}</span>
                  </p>
                  <p className="text-xs text-stone-500">{new Date(match.createdAt).toLocaleString()}</p>
                </div>
                <p className="mt-2 text-sm text-stone-700">
                  Winner: <span className="font-semibold text-emerald-700">{match.winnerName}</span>
                </p>
                <p className="mt-1 text-sm text-stone-600">Players: {playerNames.join(", ") || "Unknown"}</p>
                <p className="mt-1 text-sm text-stone-600">Moves: {match.moves.length}</p>
                <div className="mt-3">
                  <Link
                    href={`/history/${match.id}`}
                    className="inline-flex rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100"
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
