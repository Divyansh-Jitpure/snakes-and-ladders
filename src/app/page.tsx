"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import { io, type Socket } from "socket.io-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RoomState = {
  players: string[];
  positions: Record<string, number>;
  turnIndex: number;
  winner: string | null;
  online: Record<string, boolean>;
};

type JumpType = "snake" | "ladder";

type Jump = {
  from: number;
  to: number;
  type: JumpType;
};

type LastMove = {
  playerName: string;
  startPosition: number;
  endPosition: number;
  jumpType: JumpType | null;
  dice: number | null;
};

type DicePayload = {
  playerName: string;
  dice: number;
  startPosition: number;
  rawPosition: number;
  nextPosition: number;
  jumpType: JumpType | null;
};

type MoveLogEntry = {
  playerName: string;
  dice: number;
  startPosition: number;
  rawPosition: number;
  nextPosition: number;
  jumpType: JumpType | null;
};

const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:4000";
const boardSize = 10;
const identityNameKey = "snl_player_name";
const identityRoomKey = "snl_room_code";
const jumps: Jump[] = [
  { from: 2, to: 38, type: "ladder" },
  { from: 7, to: 14, type: "ladder" },
  { from: 8, to: 31, type: "ladder" },
  { from: 15, to: 26, type: "ladder" },
  { from: 16, to: 6, type: "snake" },
  { from: 21, to: 42, type: "ladder" },
  { from: 28, to: 84, type: "ladder" },
  { from: 36, to: 44, type: "ladder" },
  { from: 46, to: 25, type: "snake" },
  { from: 49, to: 11, type: "snake" },
  { from: 51, to: 67, type: "ladder" },
  { from: 62, to: 19, type: "snake" },
  { from: 64, to: 60, type: "snake" },
  { from: 71, to: 91, type: "ladder" },
  { from: 74, to: 53, type: "snake" },
  { from: 78, to: 98, type: "ladder" },
  { from: 87, to: 94, type: "ladder" },
  { from: 89, to: 68, type: "snake" },
  { from: 92, to: 88, type: "snake" },
  { from: 95, to: 75, type: "snake" },
  { from: 99, to: 80, type: "snake" }
];

const tokenColors = ["#ea580c", "#0284c7", "#16a34a", "#7c3aed"];
const tokenSlots = [
  { x: -1.8, y: -1.8 },
  { x: 1.8, y: -1.8 },
  { x: -1.8, y: 1.8 },
  { x: 1.8, y: 1.8 }
];

function cellNumberFromVisualCoordinates(visualRow: number, visualColumn: number) {
  const rowFromBottom = boardSize - 1 - visualRow;
  const isForward = rowFromBottom % 2 === 0;
  const base = rowFromBottom * boardSize;
  return isForward ? base + visualColumn + 1 : base + (boardSize - visualColumn);
}

function positionToBoardPoint(position: number) {
  const safePosition = Math.min(100, Math.max(1, position));
  const rowFromBottom = Math.floor((safePosition - 1) / boardSize);
  const rowIndex = boardSize - 1 - rowFromBottom;
  const colInRow = (safePosition - 1) % boardSize;
  const colIndex = rowFromBottom % 2 === 0 ? colInRow : boardSize - 1 - colInRow;
  return {
    left: ((colIndex + 0.5) / boardSize) * 100,
    top: ((rowIndex + 0.5) / boardSize) * 100
  };
}

function snakePath(jump: Jump, index: number) {
  const from = positionToBoardPoint(jump.from);
  const to = positionToBoardPoint(jump.to);
  const bend = index % 2 === 0 ? 1 : -1;
  const cx = (from.left + to.left) / 2 + ((from.top - to.top) / 3) * bend;
  const cy = (from.top + to.top) / 2 + ((to.left - from.left) / 4) * bend;
  return `M ${from.left} ${from.top} Q ${cx} ${cy}, ${to.left} ${to.top}`;
}

function ladderSegments(jump: Jump) {
  const from = positionToBoardPoint(jump.from);
  const to = positionToBoardPoint(jump.to);
  const dx = to.left - from.left;
  const dy = to.top - from.top;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const px = (-dy / length) * 1.2;
  const py = (dx / length) * 1.2;

  const railA = {
    x1: from.left + px,
    y1: from.top + py,
    x2: to.left + px,
    y2: to.top + py
  };
  const railB = {
    x1: from.left - px,
    y1: from.top - py,
    x2: to.left - px,
    y2: to.top - py
  };

  const rungs = Array.from({ length: 4 }).map((_, rungIndex) => {
    const t = (rungIndex + 1) / 5;
    const cx = from.left + dx * t;
    const cy = from.top + dy * t;
    return {
      x1: cx + px,
      y1: cy + py,
      x2: cx - px,
      y2: cy - py
    };
  });

  return { railA, railB, rungs };
}

function persistIdentity(playerName: string, roomCode: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(identityNameKey, playerName);
  window.localStorage.setItem(identityRoomKey, roomCode);
}

function readStoredValue(key: string) {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(key) ?? "";
}

export default function Home() {
  const socketRef = useRef<Socket | null>(null);
  const rollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jumpTimerByPlayerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const animatingPlayersRef = useRef<Record<string, boolean>>({});
  const autoJoinAttemptedRef = useRef(false);
  const roundNumberRef = useRef(0);
  const savedRoundKeysRef = useRef<Record<string, boolean>>({});

  const [connected, setConnected] = useState(false);
  const [playerName, setPlayerName] = useState(() => readStoredValue(identityNameKey));
  const [currentPlayerName, setCurrentPlayerName] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState(() => readStoredValue(identityRoomKey));
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
  const [status, setStatus] = useState("Enter your name and room code.");
  const [lastRoll, setLastRoll] = useState("No rolls yet.");
  const [diceFace, setDiceFace] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [displayedPositions, setDisplayedPositions] = useState<Record<string, number>>({});
  const [moveLog, setMoveLog] = useState<MoveLogEntry[]>([]);

  const jumpMap = useMemo(() => new Map(jumps.map((jump) => [jump.from, jump])), []);

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
      return "Join a room to start playing.";
    }
    return activeTurn === currentPlayerName ? "Your turn." : `Waiting for ${activeTurn}.`;
  }, [activeTurn, currentPlayerName, roomState]);

  useEffect(() => {
    const socket = io(realtimeUrl, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      toast.success("Connected to realtime server.");
    });

    socket.on("disconnect", () => {
      setConnected(false);
      toast.error("Disconnected from realtime server.");
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
      if (!cleanRoom || !cleanName) {
        if (!options?.silentError) {
          const message = "Room code and player name are required.";
          setStatus(message);
          toast.error(message);
        }
        return;
      }

      socket.emit("room:join", { roomCode: cleanRoom, playerName: cleanName }, (response: { ok: boolean; message?: string }) => {
        if (!response.ok) {
          const message = response.message ?? "Unable to join room.";
          setStatus(message);
          if (!options?.silentError) {
            toast.error(message);
          }
          return;
        }

        setJoinedRoom(cleanRoom);
        setCurrentPlayerName(cleanName);
        persistIdentity(cleanName, cleanRoom);
        roundNumberRef.current = 0;
        setMoveLog([]);

        const message = options?.isReconnect
          ? `Reconnected as ${cleanName} in room ${cleanRoom}.`
          : `Joined room ${cleanRoom}. Wait for your turn.`;

        setStatus(message);
        toast.success(message);
      });
    },
    [playerName, roomCode]
  );

  useEffect(() => {
    if (!connected || joinedRoom || autoJoinAttemptedRef.current) {
      return;
    }
    autoJoinAttemptedRef.current = true;
    if (!playerName.trim() || !roomCode.trim()) {
      return;
    }

    const timer = setTimeout(() => {
      joinRoom({ silentError: true, isReconnect: true });
    }, 0);

    return () => clearTimeout(timer);
  }, [connected, joinRoom, joinedRoom, playerName, roomCode]);

  const createRoom = () => {
    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    const cleanRoom = roomCode.trim().toUpperCase();
    const cleanName = playerName.trim();
    if (!cleanRoom || !cleanName) {
      const message = "Room code and player name are required.";
      setStatus(message);
      toast.error(message);
      return;
    }

    socket.emit(
      "room:create",
      { roomCode: cleanRoom, playerName: cleanName },
      (response: { ok: boolean; message?: string }) => {
        if (!response.ok) {
          const message = response.message ?? "Unable to create room.";
          setStatus(message);
          toast.error(message);
          return;
        }

        setJoinedRoom(cleanRoom);
        setCurrentPlayerName(cleanName);
        autoJoinAttemptedRef.current = true;
        persistIdentity(cleanName, cleanRoom);
        roundNumberRef.current = 0;
        setMoveLog([]);

        const message = `Room ${cleanRoom} created. Share this code with friends.`;
        setStatus(message);
        toast.success(message);
      }
    );
  };

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

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-3 py-5 sm:px-4 sm:py-8 md:gap-8 md:px-8">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="rounded-3xl border border-stone-300/70 bg-[radial-gradient(circle_at_20%_20%,#fde68a_0,#f97316_32%,#9a3412_100%)] p-5 text-white shadow-xl sm:p-8"
      >
        <p className="text-xs uppercase tracking-[0.25em] text-amber-100">Online Multiplayer</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl md:text-5xl">Snakes and Ladders</h1>
        <p className="mt-3 max-w-2xl text-sm text-amber-100 md:text-base">
          Create or join a room, roll in turn, and continue the same player session even after page refresh.
        </p>
        <div className="mt-4">
          <Link
            href="/history"
            className="inline-flex rounded-xl border border-amber-100/60 bg-amber-50/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-50/30"
          >
            View match history
          </Link>
        </div>
      </motion.section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-stone-700">Connection</p>
          <p className={`mt-1 text-lg font-semibold ${connected ? "text-emerald-600" : "text-red-600"}`}>
            {connected ? "Connected" : "Disconnected"}
          </p>
          <p className="mt-2 text-sm text-stone-500">Realtime URL: {realtimeUrl}</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-stone-700">Status</p>
          <p className="mt-1 text-sm text-stone-600">{status}</p>
          <p className="mt-2 text-sm text-stone-600">{lastRoll}</p>
          <p className="mt-2 text-sm font-medium text-stone-700">{turnMessage}</p>
        </div>
      </section>

      <section className="grid gap-8 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6 md:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-stone-900">Lobby</h2>
          <input
            className="w-full rounded-xl border border-stone-300 px-4 py-2 outline-none transition focus:border-orange-400"
            placeholder="Player name"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
          />
          <input
            className="w-full rounded-xl border border-stone-300 px-4 py-2 uppercase outline-none transition focus:border-orange-400"
            placeholder="Room code (example: ROOM1)"
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value)}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              className="rounded-xl bg-orange-500 px-4 py-2 font-medium text-white transition hover:bg-orange-600"
              onClick={createRoom}
            >
              Create room
            </button>
            <button
              className="rounded-xl border border-stone-300 px-4 py-2 font-medium text-stone-700 transition hover:bg-stone-100"
              onClick={() => joinRoom()}
            >
              Join room
            </button>
            <button
              className="rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              onClick={rollDice}
              disabled={!canRoll}
            >
              {isRolling ? "Rolling..." : "Roll dice"}
            </button>
          </div>
          <div className="mt-2 flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
            <span className="text-sm font-medium text-stone-700">Dice</span>
            <motion.div
              key={diceFace}
              animate={isRolling ? { rotate: 360 } : { rotate: 0 }}
              transition={isRolling ? { repeat: Infinity, duration: 0.35, ease: "linear" } : { duration: 0.2 }}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 bg-white text-lg font-semibold text-stone-800"
            >
              {diceFace}
            </motion.div>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Danger Zone</p>
            <p className="mt-1 text-xs text-rose-700/90">Resetting will restart this room from square 1 for everyone.</p>
            {!showResetConfirm ? (
              <button
                className="mt-3 w-full rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setShowResetConfirm(true)}
                disabled={!joinedRoom || isRolling}
              >
                Play again
              </button>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={resetGame}
                  disabled={!joinedRoom || isRolling}
                >
                  Confirm reset
                </button>
                <button
                  className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
                  onClick={() => setShowResetConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-stone-900">Board</h2>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-2">
            <div className="relative aspect-square overflow-hidden rounded-xl border border-stone-300 bg-white">
              <div className="grid h-full w-full grid-cols-10 grid-rows-10">
                {Array.from({ length: 100 }).map((_, index) => {
                  const visualRow = Math.floor(index / boardSize);
                  const visualColumn = index % boardSize;
                  const number = cellNumberFromVisualCoordinates(visualRow, visualColumn);
                  const jump = jumpMap.get(number);
                  const isLightCell = (visualRow + visualColumn) % 2 === 0;
                  const isMoveEndpoint = lastMove?.endPosition === number;

                  return (
                    <div
                      key={number}
                      className={`relative border border-stone-200 p-0.5 text-[8px] sm:p-1 sm:text-[10px] md:text-xs ${
                        isLightCell ? "bg-amber-50" : "bg-emerald-50"
                      } ${isMoveEndpoint ? "ring-2 ring-orange-400 ring-inset" : ""}`}
                    >
                      <span className={`font-semibold ${isMoveEndpoint ? "text-orange-700" : "text-stone-600"}`}>
                        {number}
                      </span>
                      {jump && (
                        <span
                          className={`absolute right-0.5 bottom-0.5 rounded px-1 py-0.5 text-[8px] font-semibold text-white sm:right-1 sm:bottom-1 sm:text-[9px] ${
                            jump.type === "ladder" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        >
                          {jump.type === "ladder" ? "L" : "S"}:{jump.to}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 z-[1]"
              >
                {jumps
                  .filter((jump) => jump.type === "snake")
                  .map((jump, index) => (
                    <path
                      key={`snake-${jump.from}-${jump.to}`}
                      d={snakePath(jump, index)}
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  ))}

                {jumps
                  .filter((jump) => jump.type === "ladder")
                  .map((jump) => {
                    const { railA, railB, rungs } = ladderSegments(jump);
                    return (
                      <g key={`ladder-${jump.from}-${jump.to}`} stroke="#047857" strokeWidth="0.7" strokeLinecap="round">
                        <line {...railA} />
                        <line {...railB} />
                        {rungs.map((rung, rungIndex) => (
                          <line key={`${jump.from}-${jump.to}-rung-${rungIndex}`} {...rung} />
                        ))}
                      </g>
                    );
                  })}
              </svg>

              {roomState?.players.map((player, index) => {
                const position = displayedPositions[player] ?? roomState.positions[player] ?? 1;
                const point = positionToBoardPoint(position);
                const slot = tokenSlots[index % tokenSlots.length];
                const isLastMover = player === lastMove?.playerName;

                return (
                  <motion.div
                    key={player}
                    className="absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow sm:h-5 sm:w-5"
                    style={{ backgroundColor: tokenColors[index % tokenColors.length] }}
                    animate={{
                      left: `${point.left + slot.x}%`,
                      top: `${point.top + slot.y}%`,
                      scale: isLastMover ? 1.2 : 1
                    }}
                    transition={{ type: "spring", stiffness: 180, damping: 20 }}
                    title={`${player}: ${position}`}
                  />
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-stone-600">
            <span className="rounded-full bg-emerald-100 px-2 py-1 font-medium">L = Ladder</span>
            <span className="rounded-full bg-rose-100 px-2 py-1 font-medium">S = Snake</span>
            {lastMove && (
              <span className="rounded-full bg-orange-100 px-2 py-1 font-medium text-orange-800">
                {lastMove.playerName}: {lastMove.startPosition} to {lastMove.endPosition}
                {lastMove.jumpType ? ` (${lastMove.jumpType})` : ""}
                {lastMove.dice ? `, dice ${lastMove.dice}` : ""}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-xl font-semibold text-stone-900">Live Room State</h2>
        <p className="text-sm text-stone-600">Joined room: {joinedRoom ?? "None"}</p>
        <p className="text-sm text-stone-600">Current turn: {activeTurn ?? "N/A"}</p>
        <p className="text-sm text-stone-600">You are: {currentPlayerName ?? "Not joined"}</p>
        <p className="text-sm font-semibold text-stone-700">Winner: {roomState?.winner ?? "No winner yet"}</p>
        <div className="mt-4 space-y-2">
          {roomState?.players.map((player, index) => {
            const online = roomState.online[player] ?? false;
            return (
              <div
                key={player}
                className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: tokenColors[index % tokenColors.length] }}
                  />
                  <span className="font-medium text-stone-800">{player}</span>
                  <span className={`text-xs font-medium ${online ? "text-emerald-600" : "text-stone-400"}`}>
                    {online ? "Online" : "Offline"}
                  </span>
                </div>
                <span className="text-sm text-stone-600">Position: {roomState.positions[player] ?? 1}</span>
              </div>
            );
          })}
          {!roomState?.players.length && <p className="text-sm text-stone-500">No players in room yet.</p>}
        </div>
      </section>
    </main>
  );
}
