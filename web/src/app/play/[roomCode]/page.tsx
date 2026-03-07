"use client";

import PlayScreen from "@/components/game/play-screen";
import { useParams, useSearchParams } from "next/navigation";

export default function PlayRoomPage() {
  const params = useParams<{ roomCode: string }>();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "create" ? "create" : "join";
  const playerName = searchParams.get("player") ?? "";
  const roomCode = String(params.roomCode ?? "").toUpperCase();

  return <PlayScreen initialRoomCode={roomCode} mode={mode} initialPlayerName={playerName} />;
}
