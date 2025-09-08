// /src/lib/socket.ts

import { io, Socket } from "socket.io-client";

const API_URL = "http://localhost:3000";

// Debug: log the API URL to make sure it's correct
console.log("[ws] connecting to:", API_URL);

// create one shared Socket.IO connection for the whole app
export const socket: Socket = io(API_URL, {
  withCredentials: true,
  autoConnect: true, // reconnects automatically
  transports: ["websocket"], // prefer WS
});

// useful logging for dev
if (import.meta.env.DEV) {
  socket.on("connect", () => console.log("[ws] connected", socket.id));
  socket.on("disconnect", (reason) => console.log("[ws] disconnected", reason));
  socket.on("connect_error", (err) => console.error("[ws] error", err.message));
}
