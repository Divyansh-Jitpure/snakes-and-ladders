export type RoomState = {
  players: string[];
  positions: Record<string, number>;
  turnIndex: number;
  winner: string | null;
  online: Record<string, boolean>;
};

export type JumpType = "snake" | "ladder";

export type Jump = {
  from: number;
  to: number;
  type: JumpType;
};

export type LastMove = {
  playerName: string;
  startPosition: number;
  endPosition: number;
  jumpType: JumpType | null;
  dice: number | null;
};

export type DicePayload = {
  playerName: string;
  dice: number;
  startPosition: number;
  rawPosition: number;
  nextPosition: number;
  jumpType: JumpType | null;
};

export type MoveLogEntry = {
  playerName: string;
  dice: number;
  startPosition: number;
  rawPosition: number;
  nextPosition: number;
  jumpType: JumpType | null;
};
