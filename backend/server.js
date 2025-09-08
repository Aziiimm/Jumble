// Server startup
//Imports the app from app.js.
// Creates an HTTP server(sometimes used for Socket.io or HTTPS).
// Listens on a port and starts the backend.
// Contains startup logic(logging, environment checks, etc.).
// server.js

import http from "http";
import app from "./app.js";
import { initSockets } from "./realtime/sockets.js";

const port = process.env.PORT || 3000;
const server = http.createServer(app);

// attach socket.io to the http server
initSockets(server);

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
