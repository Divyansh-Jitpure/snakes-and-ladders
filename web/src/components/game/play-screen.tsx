"use client";

import Board from "@/components/game/board";
import Sidebar from "@/components/game/sidebar";
import {
  identityNameKey,
  identityPlayerIdKey,
  persistIdentity,
  readStoredValue,
  resolvePlayerId
} from "@/components/game/identity";
import type { DicePayload, LastMove, MoveLogEntry, RoomState } from "@/components/game/types";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { io, type Socket } from "socket.io-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:4000";

type JoinMode = "create" | "join";

type PlayScreenProps = {
  initialRoomCode: string;
  mode: JoinMode;
  initialPlayerName?: string;
};

export default function PlayScreen({ initialRoomCode, mode, initialPlayerName = "" }: PlayScreenProps) {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const rollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jumpTimerByPlayerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const animatingPlayersRef = useRef<Record<string, boolean>>({});
  const autoJoinAttemptedRef = useRef(false);
  const roundNumberRef = useRef(0);
  const savedRoundKeysRef = useRef<Record<string, boolean>>({});

  const [connected, setConnected] = useState(false);
  const [playerName, setPlayerName] = useState(() => readStoredValue(identityNameKey) || initialPlayerName.trim());
  const [currentPlayerName, setCurrentPlayerName] = useState<string | null>(null);
  const [roomCode] = useState(() => initialRoomCode.trim().toUpperCase());
  const [playerId, setPlayerId] = useState(() => readStoredValue(identityPlayerIdKey));
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
  const [status, setStatus] = useState("Connecting to match server...");
  const [lastRoll, setLastRoll] = useState("No rolls yet.");
  const [diceFace, setDiceFace] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [displayedPositions, setDisplayedPositions] = useState<Record<string, number>>({});
  const [moveLog, setMoveLog] = useState<MoveLogEntry[]>([]);

  const activeTurn = useMemo(() => {
    if (!roomState) {
      return null;
    }
    return roomState.players[roomState.turnIndex] ?? null;
  }, [roomState]);

  const canRoll = Boolean(
    connected &&
      joinedRoom &&
      roomState &&
      activeTurn &&
      currentPlayerName &&
      activeTurn === currentPlayerName &&
      !roomState.winner &&
      !isRolling
  );

  const turnMessage = useMemo(() => {
    if (!roomState || !currentPlayerName || !activeTurn) {
      return "Waiting for room state...";
    }
    return activeTurn === currentPlayerName ? "Your turn." : `Waiting for ${activeTurn}.`;
  }, [activeTurn, currentPlayerName, roomState]);

  useEffect(() => {
    const socket = io(realtimeUrl, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    return () => {
      if (rollingTimerRef.current) {
        clearInterval(rollingTimerRef.current);
      }
      Object.values(jumpTimerByPlayerRef.current).forEach((timer) => clearTimeout(timer));
      jumpTimerByPlayerRef.current = {};
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const persistHistory = useCallback(
    async (winnerName: string, players: string[]) => {
      if (!joinedRoom || moveLog.length === 0) {
        return;
      }

      const moveFingerprint = moveLog
        .map(
          (move) =>
            `${move.playerName}:${move.dice}:${move.startPosition}:${move.rawPosition}:${move.nextPosition}:${move.jumpType ?? "none"}`
        )
        .join("|");
      const roundKey = `${joinedRoom}#${roundNumberRef.current}#${winnerName}#${moveLog.length}#${moveFingerprint}`;
      if (savedRoundKeysRef.current[roundKey]) {
        return;
      }
      savedRoundKeysRef.current[roundKey] = true;

      const response = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dedupeKey: roundKey,
          roomCode: joinedRoom,
          winnerName,
          playerNames: players,
          moves: moveLog
        })
      });

      if (!response.ok) {
        savedRoundKeysRef.current[roundKey] = false;
        throw new Error("Unable to save match history.");
      }
    },
    [joinedRoom, moveLog]
  );

  useEffect(() => {
    if (!joinedRoom || !socketRef.current) {
      return;
    }

    const stateEvent = `room:state:${joinedRoom}`;
    const currentDiceEvent = `dice:result:${joinedRoom}`;

    const handleState = (incomingState: RoomState) => {
      setRoomState((previousState) => {
        if (previousState) {
          const wasFinished = Boolean(previousState.winner);
          const resetToStart = incomingState.players.every((player) => (incomingState.positions[player] ?? 1) === 1);
          if (resetToStart && (wasFinished || !incomingState.winner)) {
            setLastMove(null);
            setLastRoll("No rolls yet.");
          }
        }
        return incomingState;
      });

      if (incomingState.winner) {
        const message = `${incomingState.winner} won the match.`;
        setStatus(message);
        toast.success(message);

        if (currentPlayerName === incomingState.winner) {
          persistHistory(incomingState.winner, incomingState.players)
            .then(() => {
              toast.success("Match saved to history.");
            })
            .catch(() => {
              toast.error("Could not save this match to history.");
            });
        }
      }

      setDisplayedPositions((previous) => {
        const next: Record<string, number> = {};
        incomingState.players.forEach((player) => {
          if (animatingPlayersRef.current[player]) {
            next[player] = previous[player] ?? incomingState.positions[player] ?? 1;
          } else {
            next[player] = incomingState.positions[player] ?? 1;
          }
        });
        return next;
      });
    };

    const handleDice = (payload: DicePayload) => {
      if (rollingTimerRef.current) {
        clearInterval(rollingTimerRef.current);
        rollingTimerRef.current = null;
      }

      setIsRolling(false);
      setDiceFace(payload.dice);
      setLastRoll(`${payload.playerName} rolled ${payload.dice} and moved to ${payload.nextPosition}.`);

      animatingPlayersRef.current[payload.playerName] = true;
      setDisplayedPositions((previous) => ({ ...previous, [payload.playerName]: payload.rawPosition }));

      const existingJumpTimer = jumpTimerByPlayerRef.current[payload.playerName];
      if (existingJumpTimer) {
        clearTimeout(existingJumpTimer);
      }

      if (payload.jumpType && payload.rawPosition !== payload.nextPosition) {
        jumpTimerByPlayerRef.current[payload.playerName] = setTimeout(() => {
          setDisplayedPositions((previous) => ({ ...previous, [payload.playerName]: payload.nextPosition }));
          animatingPlayersRef.current[payload.playerName] = false;
          delete jumpTimerByPlayerRef.current[payload.playerName];
        }, 520);
      } else {
        animatingPlayersRef.current[payload.playerName] = false;
      }

      setLastMove({
        playerName: payload.playerName,
        startPosition: payload.startPosition,
        endPosition: payload.nextPosition,
        jumpType: payload.jumpType,
        dice: payload.dice
      });
      setMoveLog((previous) => [...previous, payload]);
    };

    socketRef.current.on(stateEvent, handleState);
    socketRef.current.on(currentDiceEvent, handleDice);

    return () => {
      socketRef.current?.off(stateEvent, handleState);
      socketRef.current?.off(currentDiceEvent, handleDice);
    };
  }, [currentPlayerName, joinedRoom, persistHistory]);

  const joinRoom = useCallback(
    (options?: { silentError?: boolean; isReconnect?: boolean }) => {
      const socket = socketRef.current;
      if (!socket) {
        return;
      }

      const cleanRoom = roomCode.trim().toUpperCase();
      const cleanName = playerName.trim();
      const cleanPlayerId = resolvePlayerId(playerId, setPlayerId);
      if (!cleanRoom || !cleanName || !cleanPlayerId) {
        if (!options?.silentError) {
          const message = "Room code and player name are required.";
          setStatus(message);
          toast.error(message);
        }
        return;
      }

      socket.emit(
        "room:join",
        { roomCode: cleanRoom, playerName: cleanName, playerId: cleanPlayerId },
        (response: { ok: boolean; message?: string; playerName?: string }) => {
          if (!response.ok) {
            const message = response.message ?? "Unable to join room.";
            setStatus(message);
            if (!options?.silentError) {
              toast.error(message);
            }
            if (message.toLowerCase().includes("room not found")) {
              router.replace(`/?player=${encodeURIComponent(cleanName)}&room=${encodeURIComponent(cleanRoom)}`);
            }
            return;
          }

          const resolvedName = response.playerName ?? cleanName;
          setJoinedRoom(cleanRoom);
          setCurrentPlayerName(resolvedName);
          setPlayerName(resolvedName);
          persistIdentity(resolvedName, cleanRoom, cleanPlayerId);
          roundNumberRef.current = 0;
          setMoveLog([]);

          const message = options?.isReconnect
            ? `Reconnected as ${resolvedName} in room ${cleanRoom}.`
            : `Joined room ${cleanRoom}. Wait for your turn.`;

          setStatus(message);
          toast.success(message);
        }
      );
    },
    [playerId, playerName, roomCode, router]
  );

  const createRoom = useCallback(
    (options?: { fallbackToJoin?: boolean; silentError?: boolean }) => {
      const socket = socketRef.current;
      if (!socket) {
        return;
      }

      const cleanRoom = roomCode.trim().toUpperCase();
      const cleanName = playerName.trim();
      const cleanPlayerId = resolvePlayerId(playerId, setPlayerId);
      if (!cleanRoom || !cleanName || !cleanPlayerId) {
        if (!options?.silentError) {
          const message = "Room code and player name are required.";
          setStatus(message);
          toast.error(message);
        }
        return;
      }

      socket.emit(
        "room:create",
        { roomCode: cleanRoom, playerName: cleanName, playerId: cleanPlayerId },
        (response: { ok: boolean; message?: string; playerName?: string }) => {
          if (!response.ok) {
            if (options?.fallbackToJoin) {
              joinRoom({ silentError: true, isReconnect: true });
              return;
            }
            const message = response.message ?? "Unable to create room.";
            setStatus(message);
            if (!options?.silentError) {
              toast.error(message);
            }
            return;
          }

          const resolvedName = response.playerName ?? cleanName;
          setJoinedRoom(cleanRoom);
          setCurrentPlayerName(resolvedName);
          setPlayerName(resolvedName);
          persistIdentity(resolvedName, cleanRoom, cleanPlayerId);
          roundNumberRef.current = 0;
          setMoveLog([]);

          const message = `Room ${cleanRoom} created. Share this code with friends.`;
          setStatus(message);
          toast.success(message);
        }
      );
    },
    [joinRoom, playerId, playerName, roomCode]
  );

  useEffect(() => {
    if (!connected || joinedRoom || autoJoinAttemptedRef.current) {
      return;
    }
    autoJoinAttemptedRef.current = true;

    if (!playerName.trim()) {
      toast.error("No player profile found. Go back to menu.");
      return;
    }

    const timer = setTimeout(() => {
      if (mode === "create") {
        createRoom({ fallbackToJoin: true, silentError: true });
      } else {
        joinRoom({ silentError: true, isReconnect: true });
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [connected, createRoom, joinRoom, joinedRoom, mode, playerName]);

  const rollDice = () => {
    if (!canRoll) {
      toast.error("Wait for your turn before rolling.");
      return;
    }

    setIsRolling(true);
    rollingTimerRef.current = setInterval(() => {
      setDiceFace(Math.floor(Math.random() * 6) + 1);
    }, 90);

    socketRef.current?.emit("game:roll", {}, (response: { ok: boolean; message?: string }) => {
      if (!response.ok) {
        if (rollingTimerRef.current) {
          clearInterval(rollingTimerRef.current);
          rollingTimerRef.current = null;
        }

        setIsRolling(false);
        const message = response.message ?? "Unable to roll dice.";
        setStatus(message);
        toast.error(message);
        return;
      }

      toast.info("Dice rolled.");
    });
  };

  const resetGame = () => {
    setShowResetConfirm(false);
    socketRef.current?.emit("game:reset", {}, (response: { ok: boolean; message?: string }) => {
      if (!response.ok) {
        const message = response.message ?? "Unable to reset game.";
        setStatus(message);
        toast.error(message);
        return;
      }

      setLastMove(null);
      setLastRoll("No rolls yet.");
      setMoveLog([]);
      roundNumberRef.current += 1;
      setDisplayedPositions((previous) => {
        const resetPositions: Record<string, number> = {};
        Object.keys(previous).forEach((player) => {
          resetPositions[player] = 1;
          animatingPlayersRef.current[player] = false;
        });
        return resetPositions;
      });
      setStatus("Game reset. Starting from square 1.");
      toast.success("Game reset. Play again.");
    });
  };

  const leaveRoom = () => {
    router.push("/");
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-3 py-5 text-amber-50 sm:px-4 sm:py-8 md:gap-8 md:px-8">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="rounded-3xl border border-amber-700/60 bg-[linear-gradient(160deg,#3f1d0a_0%,#8a3f16_38%,#281205_100%)] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.45)] sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="rounded-full border border-amber-300/40 bg-black/25 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-100">
            Immersive Match
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex rounded-xl border border-amber-200/50 bg-amber-100/10 px-4 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-100/20"
            >
              Menu
            </Link>
            <Link
              href="/history"
              className="inline-flex rounded-xl border border-amber-200/50 bg-amber-100/10 px-4 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-100/20"
            >
              Match History
            </Link>
          </div>
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-amber-100 sm:text-5xl">Room {roomCode}</h1>
        <p className="mt-2 max-w-2xl text-sm text-amber-100/90 md:text-base">
          Keep focus on the board. Roll only on your turn and race to square 100.
        </p>
      </motion.section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
        <Board displayedPositions={displayedPositions} roomState={roomState} lastMove={lastMove} />
        <Sidebar
          connected={connected}
          turnMessage={turnMessage}
          roomCode={roomCode}
          onLeaveRoom={leaveRoom}
          rollDice={rollDice}
          canRoll={canRoll}
          isRolling={isRolling}
          diceFace={diceFace}
          showResetConfirm={showResetConfirm}
          setShowResetConfirm={setShowResetConfirm}
          resetGame={resetGame}
          joinedRoom={joinedRoom}
          status={status}
          lastRoll={lastRoll}
          roomState={roomState}
          currentPlayerName={currentPlayerName}
          activeTurn={activeTurn}
        />
      </section>
    </main>
  );
}
