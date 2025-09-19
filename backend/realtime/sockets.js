// realtime/sockets.js

import { Server } from "socket.io";

// initialize socket.io with the HTTP server
// export helpers to emit lobby/game rooms from route handlers

let io = null;

export function initSockets(httpServer) {
  io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: [
        process.env.FRONTEND_URL || "http://localhost:5173",
        "https://jumble-nine.vercel.app",
        "https://3-88-157-186.sslip.io",
      ],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // 🔎 log mobile vs desktop behavior
    try {
      const ua = socket.handshake.headers["user-agent"] || "unknown-ua";
      const t0 = socket.conn.transport.name; // initial transport
      console.log(
        `🔌 socket connected id=${socket.id} transport=${t0} ua="${ua}"`
      );
      socket.conn.on("upgrade", (t) => {
        console.log(`⬆️  transport upgraded id=${socket.id} -> ${t.name}`);
      });
      socket.on("disconnect", (reason) => {
        console.log(`❌ socket disconnected id=${socket.id} reason=${reason}`);
      });
    } catch (e) {
      console.error("socket log error", e);
    }

    // client asks to join a lobby room
    socket.on("lobby:join", ({ roomCode }) => {
      if (typeof roomCode !== "string" || !roomCode) return;
      socket.join(`lobby:${roomCode}`);
      socket.emit("lobby:joined", { roomCode });
    });

    socket.on("game:join", ({ gameId }, ack) => {
      const ua = socket.handshake.headers["user-agent"] || "ua?";
      if (typeof gameId !== "string" || !gameId.startsWith("g_")) {
        console.log(
          `❌ game:join invalid from ${socket.id} ua=${ua} payload=`,
          gameId
        );
        return (
          typeof ack === "function" && ack({ ok: false, error: "bad-gameId" })
        );
      }

      socket.join(`game:${gameId}`);
      console.log(`✅ ${socket.id} joined game:${gameId} ua=${ua}`);

      // keep your event, but also ack so client knows server processed it
      socket.emit("game:joined", { gameId });
      if (typeof ack === "function") ack({ ok: true, gameId });
    });

    socket.on("lobby:leave", ({ roomCode }) => {
      if (typeof roomCode !== "string" || !roomCode) return;
      socket.leave(`lobby:${roomCode}`);
      socket.emit("lobby:left", { roomCode });
    });

    socket.on("game:leave", ({ gameId }) => {
      if (typeof gameId !== "string" || !gameId.startsWith("g_")) return;
      socket.leave(`game:${gameId}`);
      socket.emit("game:left", { gameId });
    });
  });

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
