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
  socketsByPlayerId: Record<string, string>;
  playerNameById: Record<string, string>;
  disconnectTimersByPlayerId: Record<string, ReturnType<typeof setTimeout>>;
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
const disconnectGraceMs = Number(process.env.DISCONNECT_GRACE_MS ?? 60_000);

const app = express();
app.use(cors());
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/rooms/:roomCode/exists", (req, res) => {
  const roomCode = String(req.params.roomCode ?? "").trim().toUpperCase();
  if (!roomCode) {
    res.status(400).json({ ok: false, message: "Room code is required." });
    return;
  }
  res.json({ ok: true, exists: rooms.has(roomCode) });
});

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

function attachPlayerToSocket(roomCode: string, playerId: string, socketId: string) {
  const room = rooms.get(roomCode);
  if (!room) {
    return;
  }

  const playerName = room.playerNameById[playerId];
  if (!playerName) {
    return;
  }

  const previousSocketId = room.socketsByPlayerId[playerId];
  if (previousSocketId && previousSocketId !== socketId) {
    io.sockets.sockets.get(previousSocketId)?.disconnect(true);
  }

  room.socketsByPlayerId[playerId] = socketId;
  room.online[playerName] = true;

  const pendingTimer = room.disconnectTimersByPlayerId[playerId];
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    delete room.disconnectTimersByPlayerId[playerId];
  }
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
      payload: { roomCode: string; playerName: string; playerId: string },
      callback: (result: { ok: boolean; message?: string; playerName?: string; state?: RoomPublicState }) => void
    ) => {
      const roomCode = payload.roomCode.trim().toUpperCase();
      const playerName = payload.playerName.trim();
      const playerId = payload.playerId.trim();
      if (!roomCode || !playerName || !playerId) {
        callback({ ok: false, message: "Room code, player name, and player id are required." });
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
        socketsByPlayerId: { [playerId]: socket.id },
        playerNameById: { [playerId]: playerName },
        disconnectTimersByPlayerId: {}
      };

      rooms.set(roomCode, room);
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.playerName = playerName;
      socket.data.playerId = playerId;
      const state = publicState(room);
      emitRoomState(roomCode, room);
      callback({ ok: true, playerName, state });
    }
  );

  socket.on(
    "room:join",
    (
      payload: { roomCode: string; playerName: string; playerId: string },
      callback: (result: { ok: boolean; message?: string; playerName?: string; state?: RoomPublicState }) => void
    ) => {
      const roomCode = payload.roomCode.trim().toUpperCase();
      const requestedName = payload.playerName.trim();
      const playerId = payload.playerId.trim();
      const room = rooms.get(roomCode);

      if (!room) {
        callback({ ok: false, message: "Room not found." });
        return;
      }
      if (!requestedName || !playerId) {
        callback({ ok: false, message: "Player name and player id are required." });
        return;
      }

      const existingNameForId = room.playerNameById[playerId];
      if (existingNameForId) {
        attachPlayerToSocket(roomCode, playerId, socket.id);
        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.playerName = existingNameForId;
        socket.data.playerId = playerId;
        const state = publicState(room);
        emitRoomState(roomCode, room);
        callback({ ok: true, message: "Reconnected to room.", playerName: existingNameForId, state });
        return;
      }

      if (room.players.includes(requestedName)) {
        callback({ ok: false, message: "Player name already taken in this room." });
        return;
      }

      if (room.players.length >= 4) {
        callback({ ok: false, message: "Room is full (max 4 players)." });
        return;
      }

      room.players.push(requestedName);
      room.positions[requestedName] = 1;
      room.online[requestedName] = true;
      room.socketsByPlayerId[playerId] = socket.id;
      room.playerNameById[playerId] = requestedName;

      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.playerName = requestedName;
      socket.data.playerId = playerId;
      const state = publicState(room);
      emitRoomState(roomCode, room);
      callback({ ok: true, playerName: requestedName, state });
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
    const playerId = socket.data.playerId as string | undefined;
    if (!roomCode || !playerId) {
      return;
    }

    const room = rooms.get(roomCode);
    if (!room) {
      return;
    }

    const playerName = room.playerNameById[playerId];
    if (!playerName) {
      return;
    }

    if (room.socketsByPlayerId[playerId] === socket.id) {
      delete room.socketsByPlayerId[playerId];
      room.online[playerName] = false;
      emitRoomState(roomCode, room);

      const existingTimer = room.disconnectTimersByPlayerId[playerId];
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      room.disconnectTimersByPlayerId[playerId] = setTimeout(() => {
        const latestRoom = rooms.get(roomCode);
        if (!latestRoom) {
          return;
        }

        const latestPlayerName = latestRoom.playerNameById[playerId];
        if (!latestPlayerName) {
          delete latestRoom.disconnectTimersByPlayerId[playerId];
          return;
        }
        if (latestRoom.socketsByPlayerId[playerId]) {
          delete latestRoom.disconnectTimersByPlayerId[playerId];
          return;
        }

        const removedIndex = latestRoom.players.indexOf(latestPlayerName);
        if (removedIndex !== -1) {
          latestRoom.players.splice(removedIndex, 1);
        }

        delete latestRoom.positions[latestPlayerName];
        delete latestRoom.online[latestPlayerName];
        delete latestRoom.playerNameById[playerId];
        delete latestRoom.disconnectTimersByPlayerId[playerId];

        if (latestRoom.winner === latestPlayerName) {
          latestRoom.winner = null;
        }

        if (latestRoom.players.length === 0) {
          rooms.delete(roomCode);
          return;
        }

        if (removedIndex !== -1) {
          if (latestRoom.turnIndex > removedIndex) {
            latestRoom.turnIndex -= 1;
          } else if (latestRoom.turnIndex === removedIndex && latestRoom.turnIndex >= latestRoom.players.length) {
            latestRoom.turnIndex = 0;
          }
        }

        if (latestRoom.turnIndex >= latestRoom.players.length) {
          latestRoom.turnIndex = 0;
        }

        emitRoomState(roomCode, latestRoom);
      }, disconnectGraceMs);
    }
  });
});

const port = Number(process.env.PORT ?? 4000);
httpServer.listen(port, () => {
  console.log(`Realtime server running on http://localhost:${port}`);
});
