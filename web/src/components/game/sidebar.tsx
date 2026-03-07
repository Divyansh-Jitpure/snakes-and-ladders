"use client";

import { motion } from "framer-motion";
import { tokenColors } from "./constants";
import type { RoomState } from "./types";

type SidebarProps = {
  connected: boolean;
  turnMessage: string;
  playerName: string;
  roomCode: string;
  setPlayerName: (value: string) => void;
  setRoomCode: (value: string) => void;
  createRoom: () => void;
  joinRoom: () => void;
  rollDice: () => void;
  canRoll: boolean;
  isRolling: boolean;
  diceFace: number;
  showResetConfirm: boolean;
  setShowResetConfirm: (value: boolean) => void;
  resetGame: () => void;
  joinedRoom: string | null;
  status: string;
  lastRoll: string;
  roomState: RoomState | null;
  currentPlayerName: string | null;
  activeTurn: string | null;
};

export default function Sidebar({
  connected,
  turnMessage,
  playerName,
  roomCode,
  setPlayerName,
  setRoomCode,
  createRoom,
  joinRoom,
  rollDice,
  canRoll,
  isRolling,
  diceFace,
  showResetConfirm,
  setShowResetConfirm,
  resetGame,
  joinedRoom,
  status,
  lastRoll,
  roomState,
  currentPlayerName
}: SidebarProps) {
  return (
    <aside className="space-y-4">
      <section className="rounded-2xl border border-[#4f2b19] bg-[linear-gradient(180deg,#2f1a12_0%,#1b0f0b_100%)] p-4 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/70">Connection</p>
        <p className={`mt-1 text-lg font-bold ${connected ? "text-emerald-300" : "text-rose-300"}`}>
          {connected ? "Connected" : "Disconnected"}
        </p>
        <p className="mt-2 text-xs text-amber-100/60">{turnMessage}</p>
      </section>

      <section className="space-y-4 rounded-2xl border border-[#4f2b19] bg-[linear-gradient(180deg,#2f1a12_0%,#1b0f0b_100%)] p-4 shadow-xl">
        <h2 className="text-lg font-bold text-amber-100">Control Panel</h2>
        <input
          className="w-full rounded-xl border border-amber-900/50 bg-[#3b2116] px-4 py-2 text-amber-50 outline-none transition focus:border-amber-500"
          placeholder="Player name"
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
        />
        <input
          className="w-full rounded-xl border border-amber-900/50 bg-[#3b2116] px-4 py-2 uppercase text-amber-50 outline-none transition focus:border-amber-500"
          placeholder="Room code"
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value)}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            className="rounded-xl bg-amber-600 px-4 py-2 font-semibold text-stone-950 transition hover:bg-amber-500"
            onClick={createRoom}
          >
            Create
          </button>
          <button
            className="rounded-xl border border-amber-700 bg-[#2c1710] px-4 py-2 font-semibold text-amber-100 transition hover:bg-[#3d2117]"
            onClick={joinRoom}
          >
            Join
          </button>
          <button
            className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-900"
            onClick={rollDice}
            disabled={!canRoll}
          >
            {isRolling ? "Rolling..." : "Roll"}
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-amber-900/50 bg-[#3b2116] px-3 py-2">
          <span className="text-sm font-semibold text-amber-100">Dice</span>
          <motion.div
            key={diceFace}
            animate={isRolling ? { rotate: 360 } : { rotate: 0 }}
            transition={isRolling ? { repeat: Infinity, duration: 0.35, ease: "linear" } : { duration: 0.2 }}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/40 bg-[#2b1710] text-lg font-black text-amber-100"
          >
            {diceFace}
          </motion.div>
        </div>

        <div className="rounded-xl border border-amber-900/50 bg-[#3b2116] p-3">
          {!showResetConfirm ? (
            <button
              className="w-full rounded-xl border border-amber-700/70 bg-[#2b1710] px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-[#3d2117] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setShowResetConfirm(true)}
              disabled={!joinedRoom || isRolling}
            >
              Reset Match
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-amber-100/80">Reset this room for everyone and start from square 1?</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={resetGame}
                  disabled={!joinedRoom || isRolling}
                >
                  Yes, reset
                </button>
                <button
                  className="rounded-xl border border-amber-700/70 bg-[#2b1710] px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-[#3d2117]"
                  onClick={() => setShowResetConfirm(false)}
                >
                  Keep playing
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-amber-900/50 bg-[#3b2116] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/70">Live Status</p>
          <p className="mt-1 text-sm text-amber-100/90">{status}</p>
          <p className="mt-1 text-xs text-amber-100/70">{lastRoll}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#4f2b19] bg-[linear-gradient(180deg,#2f1a12_0%,#1b0f0b_100%)] p-4 shadow-xl">
        <h2 className="text-lg font-bold text-amber-100">Players</h2>
        <p className="mt-1 text-xs text-amber-100/70">Room: {joinedRoom ?? "None"}</p>
        <p className="mt-1 text-xs text-amber-100/70">You: {currentPlayerName ?? "Not joined"}</p>
        <p className="mt-1 text-xs font-semibold text-amber-200">Winner: {roomState?.winner ?? "No winner yet"}</p>
        <div className="mt-3 space-y-2">
          {roomState?.players.map((player, index) => {
            const online = roomState.online[player] ?? false;
            return (
              <div
                key={player}
                className="flex items-center justify-between rounded-xl border border-amber-900/50 bg-[#3b2116] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: tokenColors[index % tokenColors.length] }}
                  />
                  <span className="text-sm font-semibold text-amber-100">{player}</span>
                  <span className={`text-[11px] font-semibold ${online ? "text-emerald-300" : "text-amber-300/60"}`}>
                    {online ? "Online" : "Offline"}
                  </span>
                </div>
                <span className="text-xs text-amber-100/80">Pos: {roomState.positions[player] ?? 1}</span>
              </div>
            );
          })}
          {!roomState?.players.length && <p className="text-sm text-amber-100/60">No players in room yet.</p>}
        </div>
      </section>
    </aside>
  );
}
