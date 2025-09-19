// /src/lib/socket.ts

import { io, Socket } from "socket.io-client";
import { config } from "../config/api";

// create one shared Socket.IO connection for the whole app
export const socket: Socket = io(config.socket.url, {
  path: "/api/socket.io",
  withCredentials: true,
  autoConnect: true, // reconnects automatically
  transports: ["websocket", "polling"], // prefer WS, fallback to polling if WS fails
});

if (import.meta.env.DEV) {
  socket.on("connect_error", (err) => console.error("[ws] error", err.message));
}
