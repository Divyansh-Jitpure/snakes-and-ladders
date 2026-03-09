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
  guestOwnerKey?: string;
};

export async function POST(request: Request) {
  const session = await auth();
  const rawUserId = session?.user?.id?.trim() ?? "";
  if (!rawUserId) {
    return NextResponse.json({ ok: false, message: "Sign in required." }, { status: 401 });
  }

  const isGuestUser = rawUserId.startsWith("guest:");
  const createdByUserId = isGuestUser ? null : rawUserId;
  const body = (await request.json()) as Partial<HistoryPayload>;
  const dedupeKey = body.dedupeKey?.trim();
  const roomCode = body.roomCode?.trim().toUpperCase();
  const winnerName = body.winnerName?.trim();
  const guestOwnerKey = body.guestOwnerKey?.trim() ?? "";
  const playerNames = Array.isArray(body.playerNames) ? body.playerNames.map((name) => name.trim()).filter(Boolean) : [];
  const moves = Array.isArray(body.moves) ? body.moves : [];

  const createdByGuestKey = isGuestUser ? guestOwnerKey : null;

  if (!dedupeKey || !roomCode || !winnerName || playerNames.length === 0 || moves.length === 0 || (isGuestUser && !createdByGuestKey)) {
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
        createdByGuestKey,
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
      const duplicateResponse = NextResponse.json({ ok: true, duplicate: true });
      if (isGuestUser && createdByGuestKey) {
        duplicateResponse.cookies.set("snl_guest_history_key", createdByGuestKey, {
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 30
        });
      }
      return duplicateResponse;
    }
    return NextResponse.json({ ok: false, message: "Unable to save match history." }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  if (isGuestUser && createdByGuestKey) {
    response.cookies.set("snl_guest_history_key", createdByGuestKey, {
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }
  return response;
}
