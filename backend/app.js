// Application setup - config
// - Creates the Express app instance(const app = express()).
// - Configures middleware (CORS, body parsers, logging, etc.).
// - Defines routes and attaches route handlers.
// - Exports the configured app so other files(like server.js) can use it.
// - Does NOT start listening on a port.

import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import { pool, dbOk } from "./db.js";
import { redisOk } from "./redis.js";
import gamesRouter from "./routes/games.routes.js";
import { dictStats, initDictionary } from "./services/dictionary.service.js";
import lobbiesRouter from "./routes/lobbies.routes.js";
import { getIO } from "./realtime/sockets.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Example route
app.get("/", (req, res) => {
  res.send("Welcome to jumble");
});

//test db connection: health check that pings Postgres
app.get("/health", async (_req, res) => {
  try {
    res.json({ ok: await dbOk(), service: "jumble-backend" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/health/redis", async (_req, res) => {
  res.json({ ok: await redisOk(), service: "redis " });
});

// load dictionary once during app boot
initDictionary().catch((e) => {
  console.error("[dict] init failed:", e);
});

// test dict connection: health check that dict is loaded
app.get("/health/dictionary", async (_req, res) => {
  try {
    const stats = await dictStats();
    res.json({ ok: stats.loaded, ...stats });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// test WS connection: confirms the server started without opening client
app.get("/health/ws", (_req, res) => {
  const io = getIO();
  res.json({ ok: Boolean(io), service: "socket.io" });
});

//test db for inital setup
app.get("/users", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, email, created_at FROM users ORDER BY id LIMIT 50"
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

app.use("/games", gamesRouter);
app.use("/lobbies", lobbiesRouter);

// Global error handler — for consistent error responses
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;
