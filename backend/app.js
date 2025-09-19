// Application setup - config
// - Creates the Express app instance(const app = express()).
// - Configures middleware (CORS, body parsers, logging, etc.).
// - Defines routes and attaches route handlers.
// - Exports the configured app so other files(like server.js) can use it.
// - Does NOT start listening on a port.

import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { pool, dbOk } from "./db.js";
import { redisOk } from "./redis.js";
import gamesRouter from "./routes/games.routes.js";
import { dictStats, initDictionary } from "./services/dictionary.service.js";
import lobbiesRouter from "./routes/lobbies.routes.js";
import usersRouter from "./routes/users.routes.js";
import { getIO } from "./realtime/sockets.js";
import { checkJwt, extractUser, requireAuth } from "./auth.js";

const app = express();

// Trust proxy for accurate client IPs
app.set("trust proxy", 1);

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "https://jumble-nine.vercel.app",
      "https://jumble-nine.vercel.app/", // Handle both with and without trailing slash
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" })); // Limit request size
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Stricter rate limiting for game submissions
const gameSubmissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 game submissions per minute
  message: "Too many game submissions, please slow down.",
  skipSuccessfulRequests: true,
});

// Request logging middleware
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`${req.method} ${req.originalUrl}`);
  } else {
    // Production logging - log errors and important events
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} - IP: ${
        req.ip
      }`
    );
  }
  next();
});

// No global authentication middleware - apply auth only to specific routes that need it

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

// Removed conflicting /users/me endpoint - now handled by users.routes.js

// Admin route - get all users (for testing)
app.get(
  "/users",
  checkJwt,
  extractUser,
  requireAuth,
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        "SELECT sub, email, display_name, created_at FROM users ORDER BY created_at DESC LIMIT 50"
      );
      res.json(rows);
    } catch (e) {
      next(e);
    }
  }
);

app.use("/games", gamesRouter);
app.use("/lobbies", lobbiesRouter);
app.use("/users", usersRouter);

// Global error handler — for consistent error responses
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;
