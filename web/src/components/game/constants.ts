import type { Jump } from "./types";

export const boardSize = 10;

export const jumps: Jump[] = [
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

export const tokenColors = ["#ea580c", "#0284c7", "#16a34a", "#7c3aed", "#e11d48", "#f59e0b"];
export const tokenSlots = [
  { x: -2.4, y: -2.2 },
  { x: 0, y: -2.2 },
  { x: 2.4, y: -2.2 },
  { x: -2.4, y: 2.2 },
  { x: 0, y: 2.2 },
  { x: 2.4, y: 2.2 }
];

export const snakePalette = [
  { body: "#84cc16", belly: "#d9f99d" },
  { body: "#eab308", belly: "#fde68a" },
  { body: "#22d3ee", belly: "#a5f3fc" },
  { body: "#f43f5e", belly: "#fda4af" }
];
