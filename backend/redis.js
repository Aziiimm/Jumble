// redis.js
import { createClient } from "redis";
import * as dotenv from "dotenv";

dotenv.config();

const url = process.env.REDIS_URL || "redis://localhost:6379";
export const redis = createClient({ url });

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
