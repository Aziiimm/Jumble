// redis.js
import { createClient } from "redis";
import * as dotenv from "dotenv";

dotenv.config();

// Build Redis URL from individual components or use REDIS_URL
const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = process.env.REDIS_PORT || "6379";
const redisPassword = process.env.REDIS_PASSWORD;
const redisUrl = process.env.REDIS_URL || `redis://${redisHost}:${redisPort}`;

export const redis = createClient({
  url: redisUrl,
  password: redisPassword || undefined,
});

redis.on("error", (err) => {
  console.error("[redis] client error:", err);
});
redis.on("connect", () => {
  console.log("[redis] connecting...");
});
redis.on("ready", () => {
  console.log("[redis] ready");
});

// Lazy-connect helper: only connects if needed
export async function ensureRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

export async function redisOk() {
  try {
    await ensureRedis();
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}
