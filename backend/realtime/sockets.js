// realtime/sockets.js

import { Server } from "socket.io";

// initialize socket.io with the HTTP server
// export helpers to emit lobby/game rooms from route handlers

let io = null;

export function initSockets(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173", // vite dev origin
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // logging for testing
    console.log("[ws] connected:", socket.id);

    // client asks to join a lobby room
    socket.on("lobby:join", ({ roomCode }) => {
      console.log("[ws] lobby:join", socket.id, roomCode);
      if (typeof roomCode !== "string" || !roomCode) return;
      socket.join(`lobby:${roomCode}`);
      socket.emit("lobby:joined", { roomCode });
    });

    socket.on("game:join", ({ gameId }) => {
      console.log("[ws] game:join", socket.id, gameId);
      if (typeof gameId !== "string" || !gameId.startsWith("g_")) return;
      socket.join(`game:${gameId}`);
      socket.emit("game:joined", { gameId });
    });

    // client asks to leave a lobby room
    socket.on("lobby:leave", ({ roomCode }) => {
      if (typeof roomCode !== "string" || !roomCode) return;
      socket.leave(`lobby:${roomCode}`);
      socket.emit("lobby:left", { roomCode });
    });

    // client asks to leave a game room
    socket.on("game:leave", ({ gameId }) => {
      if (typeof gameId !== "string" || !gameId.startsWith("g_")) return;
      socket.leave(`game:${gameId}`);
      socket.emit("game:left", { gameId });
    });

    socket.on("disconnect", (reason) => {
      console.log("[ws] disconnected:", socket.id, reason);
    });
  });

  console.log("[ws] socket.io initialized");
  return io;
}

// helpers routes can use to emit later
export function emitToLobby(roomCode, event, payload) {
  if (!io) return;
  io.to(`lobby:${roomCode}`).emit(event, payload);
}

export function emitToGame(gameId, event, payload) {
  if (!io) return;
  io.to(`game:${gameId}`).emit(event, payload);
}

// health check
export function getIO() {
  return io;
}
