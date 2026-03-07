"use client";

import {
  ensureStoredPlayerId,
  identityNameKey,
  identityRoomKey,
  readStoredValue
} from "@/components/game/identity";
import InstallAppButton from "@/components/install-app-button";
import { motion } from "framer-motion";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { HiUser } from "react-icons/hi2";
import { toast } from "sonner";

const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:4000";

function sanitizeRoomCode(value: string) {
  return value.trim().toUpperCase();
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [guestName, setGuestName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [savedPlayerName, setSavedPlayerName] = useState("");
  const [savedRoomCode, setSavedRoomCode] = useState("");
  const isAuthenticated = status === "authenticated" && Boolean(session?.user);
  const sessionPlayerName = (session?.user?.name ?? "").trim();
  const effectivePlayerName = playerName.trim() || sessionPlayerName;

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
      const queryName = (params.get("player") ?? "").trim();
      const queryRoom = sanitizeRoomCode(params.get("room") ?? "");
      const storedName = readStoredValue(identityNameKey);
      const storedRoom = sanitizeRoomCode(readStoredValue(identityRoomKey));
      const activeName = queryName || storedName;
      const activeRoom = queryRoom || storedRoom;
      setSavedPlayerName(storedName);
      setSavedRoomCode(storedRoom);
      setPlayerName(activeName);
      setRoomCode(activeRoom);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const canStart = useMemo(() => {
    return Boolean(isAuthenticated && effectivePlayerName && sanitizeRoomCode(roomCode));
  }, [effectivePlayerName, isAuthenticated, roomCode]);
  const hasSavedSession = useMemo(() => {
    return Boolean(isAuthenticated && savedPlayerName.trim() && savedRoomCode);
  }, [isAuthenticated, savedPlayerName, savedRoomCode]);

  const goToGame = async (mode: "create" | "join", options?: { roomCode?: string; playerName?: string }) => {
    if (!isAuthenticated) {
      toast.error("Choose Google or Guest before starting a match.");
      return;
    }

    const cleanName = (options?.playerName ?? effectivePlayerName).trim();
    const cleanRoom = sanitizeRoomCode(options?.roomCode ?? roomCode);
    if (!cleanName || !cleanRoom) {
      toast.error("Player name and room code are required.");
      return;
    }

    if (mode === "join") {
      try {
        const response = await fetch(`${realtimeUrl}/rooms/${encodeURIComponent(cleanRoom)}/exists`);
        if (!response.ok) {
          throw new Error("Unable to verify room.");
        }
        const payload = (await response.json()) as { exists?: boolean };
        if (!payload.exists) {
          toast.error(`Room ${cleanRoom} does not exist.`);
          return;
        }
      } catch {
        toast.error("Could not verify room right now. Try again.");
        return;
      }
    }

    ensureStoredPlayerId();
    router.push(`/play/${cleanRoom}?mode=${mode}&player=${encodeURIComponent(cleanName)}`);
  };

  const continueAsGuest = async () => {
    const cleanName = guestName.trim();
    if (!cleanName) {
      toast.error("Enter a guest name to continue.");
      return;
    }

    const response = await signIn("guest", { redirect: false, name: cleanName });
    if (response?.error) {
      toast.error("Could not continue as guest.");
      return;
    }

    setPlayerName(cleanName);
    toast.success(`Signed in as ${cleanName}.`);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 text-amber-50 sm:px-6 sm:py-10">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="rounded-3xl border border-amber-700/60 bg-[linear-gradient(155deg,#3b1b0a_0%,#7e3815_46%,#251105_100%)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.42)] sm:p-10"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="rounded-full border border-amber-300/40 bg-black/25 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-100">
            Game Menu
          </p>
          <div className="flex items-center gap-2">
            <InstallAppButton />
          </div>
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-amber-100 sm:text-6xl">Snakes and Ladders</h1>
        <p className="mt-2 max-w-2xl text-sm text-amber-100/90 sm:text-base">
          Enter your identity once, jump into a room, and continue as the same player on refresh.
        </p>
      </motion.section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {!isAuthenticated && (
          <motion.article
            id="auth-gate"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="scroll-mt-28 rounded-3xl border border-amber-500/45 bg-[linear-gradient(180deg,#372015_0%,#1f120d_100%)] p-5 shadow-xl sm:scroll-mt-32 sm:p-7 lg:col-span-2"
          >
            <h2 className="text-xl font-bold text-amber-100">Choose Sign-In Method</h2>
            <p className="mt-1 text-sm text-amber-100/80">
              Pick one option to unlock room creation, join, and gameplay.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/60 bg-[linear-gradient(180deg,#6b3a1f_0%,#4a2615_100%)] px-4 py-2 font-semibold text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition hover:brightness-110"
                onClick={() => {
                  void signIn("google", { callbackUrl: "/" });
                }}
              >
                <FcGoogle className="text-lg" aria-hidden />
                Continue with Google
              </button>
              <div className="rounded-xl border border-amber-900/50 bg-[#3b2116] p-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-amber-200/70">Guest Name</label>
                <input
                  className="mt-2 w-full rounded-xl border border-amber-900/60 bg-[#2f1a12] px-4 py-2 text-amber-50 outline-none transition focus:border-amber-500"
                  placeholder="Enter guest name"
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                />
                <button
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-600 bg-[#5a2e1a] px-4 py-2 font-semibold text-amber-50 transition hover:bg-[#6b3820]"
                  onClick={() => {
                    void continueAsGuest();
                  }}
                >
                  <HiUser className="text-base" aria-hidden />
                  Continue as Guest
                </button>
              </div>
            </div>
          </motion.article>
        )}

        <motion.article
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="rounded-3xl border border-[#4f2b19] bg-[linear-gradient(180deg,#2f1a12_0%,#1b0f0b_100%)] p-5 shadow-xl sm:p-7"
        >
          <h2 className="text-xl font-bold text-amber-100">Start Match</h2>
          <p className="mt-1 text-sm text-amber-100/70">Create a new room or join an existing one.</p>

          <div className="mt-5 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-amber-200/70">Player Name</label>
            <input
              className="w-full rounded-xl border border-amber-900/50 bg-[#3b2116] px-4 py-2 text-amber-50 outline-none transition focus:border-amber-500"
              placeholder="Enter your name"
              value={effectivePlayerName}
              onChange={(event) => setPlayerName(event.target.value)}
              disabled={!isAuthenticated}
            />

            <label className="block text-xs font-semibold uppercase tracking-wide text-amber-200/70">Room Code</label>
            <input
              className="w-full rounded-xl border border-amber-900/50 bg-[#3b2116] px-4 py-2 uppercase text-amber-50 outline-none transition focus:border-amber-500"
              placeholder="ROOM1"
              value={roomCode}
              onChange={(event) => setRoomCode(sanitizeRoomCode(event.target.value))}
              disabled={!isAuthenticated}
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              className="rounded-xl bg-amber-600 px-4 py-2 font-semibold text-stone-950 transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-amber-800/70 disabled:text-amber-100/70"
              onClick={() => {
                void goToGame("create");
              }}
              disabled={!canStart}
            >
              Create Room
            </button>
            <button
              className="rounded-xl border border-amber-700 bg-[#2c1710] px-4 py-2 font-semibold text-amber-100 transition hover:bg-[#3d2117] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                void goToGame("join");
              }}
              disabled={!canStart}
            >
              Join Room
            </button>
          </div>
          {hasSavedSession && (
            <div className="mt-3 rounded-xl border border-emerald-400/35 bg-emerald-300/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">Active session found</p>
              <p className="mt-1 text-sm text-emerald-100/90">
                Rejoin <span className="font-semibold">{savedRoomCode}</span> as{" "}
                <span className="font-semibold">{savedPlayerName.trim()}</span>.
              </p>
              <button
                className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-500"
                onClick={() => {
                  void goToGame("join", { roomCode: savedRoomCode, playerName: savedPlayerName });
                }}
              >
                Back to Game
              </button>
            </div>
          )}
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-3xl border border-[#4f2b19] bg-[linear-gradient(180deg,#2f1a12_0%,#1b0f0b_100%)] p-5 shadow-xl sm:p-7"
        >
          <h2 className="text-xl font-bold text-amber-100">Quick Tips</h2>
          <ul className="mt-3 space-y-2 text-sm text-amber-100/80">
            <li>Use the same browser profile to reconnect as the same player.</li>
            <li>Share room code with friends to start multiplayer.</li>
            <li>Disconnected players are removed automatically after a short grace period.</li>
          </ul>
          <div className="mt-5 rounded-xl border border-amber-900/50 bg-[#3b2116] p-3 text-xs text-amber-100/70">
            You can always return to menu from the match screen without losing your stored identity.
          </div>
        </motion.article>
      </section>
    </main>
  );
}
