// backend/db.js
import pg from "pg";
import * as dotenv from "dotenv";

// load .env
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // disable SSL for local Docker/Postgres
});

export async function dbOk() {
  const { rows } = await pool.query("SELECT 1 AS ok");
  return rows[0]?.ok === 1;
}
