import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function HistoryDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const id = resolvedParams?.id;
  if (!id) {
    notFound();
  }

  const match = await prisma.gameHistory.findUnique({
    where: { id },
    include: { moves: { orderBy: { createdAt: "asc" } } }
  });

  if (!match) {
    notFound();
  }

  const playerNames = Array.isArray(match.playerNames) ? (match.playerNames as string[]) : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 text-amber-50">
      <section className="rounded-2xl border border-amber-700/50 bg-[linear-gradient(180deg,#2b160f_0%,#180d08_100%)] p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-amber-200/70">Match details</p>
            <h1 className="text-3xl font-black tracking-tight text-amber-100">Room {match.roomCode}</h1>
          </div>
          <Link
            href="/history"
            className="rounded-xl border border-amber-300/40 bg-amber-100/10 px-4 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-100/20"
          >
            Back to history
          </Link>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-amber-100/80 sm:grid-cols-2">
          <p>
            Winner: <span className="font-semibold text-emerald-300">{match.winnerName}</span>
          </p>
          <p>Date: {new Date(match.createdAt).toLocaleString()}</p>
          <p className="sm:col-span-2">Players: {playerNames.join(", ") || "Unknown"}</p>
          <p>Total moves: {match.moves.length}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-700/50 bg-[linear-gradient(180deg,#2b160f_0%,#180d08_100%)] p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-amber-100">Move Timeline</h2>
        {match.moves.length === 0 ? (
          <p className="mt-3 text-sm text-amber-100/70">No moves recorded for this match.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {match.moves.map((move, index) => (
              <div
                key={move.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-800/50 bg-[#3a1f14] px-3 py-2 text-sm"
              >
                <p className="font-semibold text-amber-100">
                  #{index + 1} {move.playerName}
                </p>
                <p className="text-amber-100/80">Dice: {move.diceRoll}</p>
                <p className="text-amber-100/80">
                  {move.startPosition} to {move.endPosition}
                </p>
                <p className="text-amber-100/80">
                  {move.jumpType ? move.jumpType.toLowerCase() : "normal"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
