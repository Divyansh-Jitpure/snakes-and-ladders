import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function HistoryDetailPage({ params }: Props) {
  const { id } = await params;
  const match = await prisma.gameHistory.findUnique({
    where: { id },
    include: { moves: { orderBy: { createdAt: "asc" } } }
  });

  if (!match) {
    notFound();
  }

  const playerNames = Array.isArray(match.playerNames) ? (match.playerNames as string[]) : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">Match details</p>
            <h1 className="text-2xl font-semibold text-stone-900">Room {match.roomCode}</h1>
          </div>
          <Link
            href="/history"
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Back to history
          </Link>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
          <p>
            Winner: <span className="font-semibold text-emerald-700">{match.winnerName}</span>
          </p>
          <p>Date: {new Date(match.createdAt).toLocaleString()}</p>
          <p className="sm:col-span-2">Players: {playerNames.join(", ") || "Unknown"}</p>
          <p>Total moves: {match.moves.length}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Move Timeline</h2>
        {match.moves.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">No moves recorded for this match.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {match.moves.map((move, index) => (
              <div
                key={move.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm"
              >
                <p className="font-medium text-stone-800">
                  #{index + 1} {move.playerName}
                </p>
                <p className="text-stone-600">Dice: {move.diceRoll}</p>
                <p className="text-stone-600">
                  {move.startPosition} to {move.endPosition}
                </p>
                <p className="text-stone-600">
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
