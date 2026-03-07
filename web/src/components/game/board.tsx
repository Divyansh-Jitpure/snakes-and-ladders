"use client";

import { motion } from "framer-motion";
import { boardSize, jumps, snakePalette, tokenColors, tokenSlots } from "./constants";
import type { Jump, LastMove, RoomState } from "./types";

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
  const c1x = from.left + (to.left - from.left) * 0.28 + ((from.top - to.top) / 4.6) * bend;
  const c1y = from.top + (to.top - from.top) * 0.24 + ((to.left - from.left) / 6.2) * bend;
  const c2x = from.left + (to.left - from.left) * 0.72 - ((from.top - to.top) / 4.2) * bend;
  const c2y = from.top + (to.top - from.top) * 0.8 - ((to.left - from.left) / 6) * bend;
  const headX = from.left;
  const headY = from.top;
  const eyeOffsetX = bend * 0.85;
  const colors = snakePalette[index % snakePalette.length];
  return {
    d: `M ${from.left} ${from.top} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.left} ${to.top}`,
    headX,
    headY,
    eyeOffsetX,
    body: colors.body,
    belly: colors.belly
  };
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

type BoardProps = {
  displayedPositions: Record<string, number>;
  roomState: RoomState | null;
  lastMove: LastMove | null;
};

export default function Board({ displayedPositions, roomState, lastMove }: BoardProps) {
  const activeSnakeTarget = lastMove?.jumpType === "snake" ? lastMove.endPosition : null;

  return (
      <article className="rounded-2xl border border-amber-500/30 bg-[linear-gradient(180deg,#7a3212_0%,#3c1a0c_100%)] p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-100">Game Board</p>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-300/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
              Ladders
            </span>
            <span className="rounded-full bg-rose-300/20 px-2 py-0.5 text-[11px] font-semibold text-rose-200">
              Snakes
            </span>
          </div>
        </div>
        <div className="relative aspect-square overflow-hidden rounded-xl border border-amber-400/40 bg-[#1f1008]">
          <div className="grid h-full w-full grid-cols-10 grid-rows-10">
            {Array.from({ length: 100 }).map((_, index) => {
              const visualRow = Math.floor(index / boardSize);
              const visualColumn = index % boardSize;
              const number = cellNumberFromVisualCoordinates(visualRow, visualColumn);
              const isLightCell = (visualRow + visualColumn) % 2 === 0;
              const isMoveEndpoint = lastMove?.endPosition === number;

              return (
                <div
                  key={number}
                  className={`relative border border-amber-900/60 p-0.5 text-[8px] sm:p-1 sm:text-[10px] md:text-xs ${
                    isLightCell ? "bg-[#9b4a21]" : "bg-[#6f3417]"
                  } ${isMoveEndpoint ? "ring-2 ring-yellow-300 ring-inset" : ""}`}
                >
                  <span className={`font-bold ${isMoveEndpoint ? "text-yellow-200" : "text-amber-100"}`}>{number}</span>
                </div>
              );
            })}
          </div>

          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-1">
            {jumps
              .filter((jump) => jump.type === "snake")
              .map((jump, index) => {
                const snake = snakePath(jump, index);
                const isActiveSnake = activeSnakeTarget === jump.to;
                return (
                  <g key={`snake-${jump.from}-${jump.to}`} className="snake-group" style={{ animationDelay: `${index * 0.5}s` }}>
                    <path d={snake.d} fill="none" stroke="#1f2937" strokeWidth="2.2" strokeLinecap="round" />
                    <path d={snake.d} fill="none" stroke={snake.body} strokeWidth="1.75" strokeLinecap="round" />
                    <path d={snake.d} fill="none" stroke={snake.belly} strokeWidth="0.7" strokeLinecap="round" />
                    <circle
                      className="snake-head"
                      cx={snake.headX}
                      cy={snake.headY}
                      r="1.08"
                      fill={snake.body}
                      stroke="#1f2937"
                      strokeWidth="0.18"
                      style={{ animationDelay: `${index * 0.45}s` }}
                    />
                    <circle
                      className="snake-eye"
                      cx={snake.headX - snake.eyeOffsetX}
                      cy={snake.headY - 0.35}
                      r="0.26"
                      fill="#ffffff"
                      style={{ animationDelay: `${index * 0.3}s` }}
                    />
                    <circle
                      className="snake-eye"
                      cx={snake.headX + snake.eyeOffsetX}
                      cy={snake.headY - 0.35}
                      r="0.26"
                      fill="#ffffff"
                      style={{ animationDelay: `${index * 0.3}s` }}
                    />
                    <circle cx={snake.headX - snake.eyeOffsetX} cy={snake.headY - 0.35} r="0.11" fill="#0f172a" />
                    <circle cx={snake.headX + snake.eyeOffsetX} cy={snake.headY - 0.35} r="0.11" fill="#0f172a" />
                    {isActiveSnake && (
                      <path
                        className="snake-tongue"
                        d={`M ${snake.headX} ${snake.headY + 0.55} l -0.18 0.42 m 0.18 -0.42 l 0.18 0.42`}
                        stroke="#ef4444"
                        strokeWidth="0.12"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </g>
                );
              })}

            {jumps
              .filter((jump) => jump.type === "ladder")
              .map((jump) => {
                const { railA, railB, rungs } = ladderSegments(jump);
                return (
                  <g key={`ladder-${jump.from}-${jump.to}`} strokeLinecap="round">
                    <line {...railA} stroke="#3f1f0f" strokeWidth="1.25" />
                    <line {...railB} stroke="#3f1f0f" strokeWidth="1.25" />
                    <line {...railA} stroke="#f59e0b" strokeWidth="0.8" />
                    <line {...railB} stroke="#f59e0b" strokeWidth="0.8" />
                    {rungs.map((rung, rungIndex) => (
                      <g key={`${jump.from}-${jump.to}-rung-${rungIndex}`}>
                        <line {...rung} stroke="#3f1f0f" strokeWidth="1.05" />
                        <line {...rung} stroke="#facc15" strokeWidth="0.6" />
                      </g>
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
                className="absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_8px_rgba(255,255,255,0.65)] sm:h-5 sm:w-5"
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
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-amber-100/90">
          {lastMove && (
            <span className="rounded-full bg-amber-700/50 px-2 py-1 font-medium text-amber-50">
              {lastMove.playerName}: {lastMove.startPosition} to {lastMove.endPosition}
              {lastMove.jumpType ? ` (${lastMove.jumpType})` : ""}
              {lastMove.dice ? `, dice ${lastMove.dice}` : ""}
            </span>
          )}
        </div>
      </article>
  );
}
