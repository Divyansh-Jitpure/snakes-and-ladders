import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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
  dedupeKey: string;
  roomCode: string;
  winnerName: string;
  playerNames: string[];
  moves: MovePayload[];
};

export async function POST(request: Request) {
  const session = await auth();
  const rawUserId = session?.user?.id ?? null;
  const createdByUserId = rawUserId?.startsWith("guest:") ? null : rawUserId;
  const body = (await request.json()) as Partial<HistoryPayload>;
  const dedupeKey = body.dedupeKey?.trim();
  const roomCode = body.roomCode?.trim().toUpperCase();
  const winnerName = body.winnerName?.trim();
  const playerNames = Array.isArray(body.playerNames) ? body.playerNames.map((name) => name.trim()).filter(Boolean) : [];
  const moves = Array.isArray(body.moves) ? body.moves : [];

  if (!dedupeKey || !roomCode || !winnerName || playerNames.length === 0 || moves.length === 0) {
    return NextResponse.json({ ok: false, message: "Invalid history payload." }, { status: 400 });
  }

  try {
    await prisma.gameHistory.create({
      data: {
        dedupeKey,
        roomCode,
        winnerName,
        playerNames,
        createdByUserId,
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ ok: false, message: "Unable to save match history." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
