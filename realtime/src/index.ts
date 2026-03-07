import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

type RoomPublicState = {
  players: string[];
  positions: Record<string, number>;
  turnIndex: number;
  winner: string | null;
  online: Record<string, boolean>;
};

type RoomInternalState = RoomPublicState & {
  socketsByPlayer: Record<string, string>;
};

const laddersAndSnakes: Record<number, number> = {
  2: 38,
  7: 14,
  8: 31,
  15: 26,
  16: 6,
  21: 42,
  28: 84,
  36: 44,
  46: 25,
  49: 11,
  51: 67,
  62: 19,
  64: 60,
  71: 91,
  74: 53,
  78: 98,
  87: 94,
  89: 68,
  92: 88,
  95: 75,
  99: 80
};

const rooms = new Map<string, RoomInternalState>();

const app = express();
app.use(cors());
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000"
  }
});

const roomEvent = (roomCode: string) => `room:state:${roomCode}`;
const diceEvent = (roomCode: string) => `dice:result:${roomCode}`;

function publicState(room: RoomInternalState): RoomPublicState {
  return {
    players: room.players,
    positions: room.positions,
    turnIndex: room.turnIndex,
    winner: room.winner,
    online: room.online
  };
}

function emitRoomState(roomCode: string, room: RoomInternalState) {
  io.to(roomCode).emit(roomEvent(roomCode), publicState(room));
}

function attachPlayerToSocket(roomCode: string, playerName: string, socketId: string) {
  const room = rooms.get(roomCode);
  if (!room) {
    return;
  }

  const previousSocketId = room.socketsByPlayer[playerName];
  if (previousSocketId && previousSocketId !== socketId) {
    io.sockets.sockets.get(previousSocketId)?.disconnect(true);
  }

  room.socketsByPlayer[playerName] = socketId;
  room.online[playerName] = true;
}

function resetRoom(room: RoomInternalState) {
  room.turnIndex = 0;
  room.winner = null;
  for (const playerName of room.players) {
    room.positions[playerName] = 1;
  }
}

io.on("connection", (socket) => {
  socket.on(
    "room:create",
    (
      payload: { roomCode: string; playerName: string },
      callback: (result: { ok: boolean; message?: string }) => void
    ) => {
      const roomCode = payload.roomCode.trim().toUpperCase();
      const playerName = payload.playerName.trim();
      if (!roomCode || !playerName) {
        callback({ ok: false, message: "Room code and player name are required." });
        return;
      }
      if (rooms.has(roomCode)) {
        callback({ ok: false, message: "Room already exists. Join instead." });
        return;
      }

      const room: RoomInternalState = {
        players: [playerName],
        positions: { [playerName]: 1 },
        turnIndex: 0,
        winner: null,
        online: { [playerName]: true },
        socketsByPlayer: { [playerName]: socket.id }
      };

      rooms.set(roomCode, room);
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.playerName = playerName;
      emitRoomState(roomCode, room);
      callback({ ok: true });
    }
  );

  socket.on(
    "room:join",
    (
      payload: { roomCode: string; playerName: string },
      callback: (result: { ok: boolean; message?: string }) => void
    ) => {
      const roomCode = payload.roomCode.trim().toUpperCase();
      const playerName = payload.playerName.trim();
      const room = rooms.get(roomCode);

      if (!room) {
        callback({ ok: false, message: "Room not found." });
        return;
      }
      if (!playerName) {
        callback({ ok: false, message: "Player name is required." });
        return;
      }

      if (room.players.includes(playerName)) {
        attachPlayerToSocket(roomCode, playerName, socket.id);
        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.playerName = playerName;
        emitRoomState(roomCode, room);
        callback({ ok: true, message: "Reconnected to room." });
        return;
      }

      if (room.players.length >= 4) {
        callback({ ok: false, message: "Room is full (max 4 players)." });
        return;
      }

      room.players.push(playerName);
      room.positions[playerName] = 1;
      room.online[playerName] = true;
      room.socketsByPlayer[playerName] = socket.id;

      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.playerName = playerName;
      emitRoomState(roomCode, room);
      callback({ ok: true });
    }
  );

  socket.on("game:roll", (_payload: unknown, callback: (result: { ok: boolean; message?: string }) => void) => {
    const roomCode = socket.data.roomCode as string | undefined;
    const playerName = socket.data.playerName as string | undefined;
    if (!roomCode || !playerName) {
      callback({ ok: false, message: "Join a room first." });
      return;
    }

    const room = rooms.get(roomCode);
    if (!room) {
      callback({ ok: false, message: "Room not found." });
      return;
    }
    if (room.winner) {
      callback({ ok: false, message: "Game is finished." });
      return;
    }

    const currentPlayer = room.players[room.turnIndex];
    if (currentPlayer !== playerName) {
      callback({ ok: false, message: `It's ${currentPlayer}'s turn.` });
      return;
    }

    const dice = Math.floor(Math.random() * 6) + 1;
    const startPosition = room.positions[playerName] ?? 1;
    let rawPosition = startPosition + dice;
    if (rawPosition > 100) {
      rawPosition = startPosition;
    }
    const nextPosition = laddersAndSnakes[rawPosition] ?? rawPosition;
    const jumpType = nextPosition === rawPosition ? null : nextPosition > rawPosition ? "ladder" : "snake";

    room.positions[playerName] = nextPosition;
    if (nextPosition === 100) {
      room.winner = playerName;
    } else {
      room.turnIndex = (room.turnIndex + 1) % room.players.length;
    }

    emitRoomState(roomCode, room);
    io.to(roomCode).emit(diceEvent(roomCode), {
      playerName,
      dice,
      startPosition,
      rawPosition,
      nextPosition,
      jumpType
    });
    callback({ ok: true });
  });

  socket.on("game:reset", (_payload: unknown, callback: (result: { ok: boolean; message?: string }) => void) => {
    const roomCode = socket.data.roomCode as string | undefined;
    const playerName = socket.data.playerName as string | undefined;
    if (!roomCode || !playerName) {
      callback({ ok: false, message: "Join a room first." });
      return;
    }

    const room = rooms.get(roomCode);
    if (!room) {
      callback({ ok: false, message: "Room not found." });
      return;
    }
    if (!room.players.includes(playerName)) {
      callback({ ok: false, message: "Only room players can reset the game." });
      return;
    }

    resetRoom(room);
    emitRoomState(roomCode, room);
    callback({ ok: true });
  });

  socket.on("disconnect", () => {
    const roomCode = socket.data.roomCode as string | undefined;
    const playerName = socket.data.playerName as string | undefined;
    if (!roomCode || !playerName) {
      return;
    }

    const room = rooms.get(roomCode);
    if (!room) {
      return;
    }

    if (room.socketsByPlayer[playerName] === socket.id) {
      delete room.socketsByPlayer[playerName];
      room.online[playerName] = false;
      emitRoomState(roomCode, room);
    }
  });
});

const port = Number(process.env.PORT ?? 4000);
httpServer.listen(port, () => {
  console.log(`Realtime server running on http://localhost:${port}`);
});
