import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type MovePayload = {
  playerName: string;
  dice: number;
  startPosition: number;
  rawPosition: number;
  nextPosition: number;
  jumpType: "snake" | "ladder" | null;
};

type HistoryPayload = {
  roomCode: string;
  winnerName: string;
  playerNames: string[];
  moves: MovePayload[];
};

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<HistoryPayload>;
  const roomCode = body.roomCode?.trim().toUpperCase();
  const winnerName = body.winnerName?.trim();
  const playerNames = Array.isArray(body.playerNames) ? body.playerNames.map((name) => name.trim()).filter(Boolean) : [];
  const moves = Array.isArray(body.moves) ? body.moves : [];

  if (!roomCode || !winnerName || playerNames.length === 0 || moves.length === 0) {
    return NextResponse.json({ ok: false, message: "Invalid history payload." }, { status: 400 });
  }

  await prisma.gameHistory.create({
    data: {
      roomCode,
      winnerName,
      playerNames,
      moves: {
        create: moves.map((move) => ({
          playerName: move.playerName,
          diceRoll: move.dice,
          startPosition: move.startPosition,
          rawPosition: move.rawPosition,
          endPosition: move.nextPosition,
          jumpType:
            move.jumpType === "snake"
              ? "SNAKE"
              : move.jumpType === "ladder"
                ? "LADDER"
                : null
        }))
      }
    }
  });

  return NextResponse.json({ ok: true });
}
