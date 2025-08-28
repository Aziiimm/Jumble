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
const app = express();

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json());

// Example route
app.get("/", (req, res) => {
    res.send("Hello from the app");
});

//test db connection: health check that pings Postgres
app.get("/health", async (_req, res) => {
    try {
        res.json({ ok: await dbOk(), service: "jumble-backend" });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

//test db for inital setup
app.get("/users", async (_req, res, next) => {
    try {
        const { rows } = await pool.query(
            "SELECT id, email, created_at FROM users ORDER BY id LIMIT 50"
        );
        res.json(rows);
    } catch (e) { next(e); }
});




//------- register user -----
app.post("/api/register", async (req, res, next) => {
    try {
        const { email, password } = req.body ?? {};
        if (!email || !password) {
            return res.status(400).json({ ok: false, message: "Email and password are required" });
        }

        const existing = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email]);
        if (existing.rowCount > 0) {
            return res.status(409).json({ ok: false, message: "Email already registered." });
        }

        const hash = await bcrypt.hash(password, 10);
        const { rows } = await pool.query(
            `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
            [email, hash]
        );

        return res.status(201).json({ ok: true, user: rows[0] });
    } catch (e) {
        next(e);
    }

});


// Global error handler — for consistent error responses
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});





export default app;