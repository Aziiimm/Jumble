// data/redisGameRepo.js
import { redis, ensureRedis } from "../redis.js";

const DEFAULT_TTL = Number(180); // 3 minutes

export async function saveNewGame({ gameId, board, durationSec }) {
  await ensureRedis();

  const now = Date.now();

  const boardKey = `game:${gameId}:board`;
  const stateKey = `game:${gameId}:state`;

  // store board as JSON
  await redis.set(boardKey, JSON.stringify({ board, generatedAt: now }), {
    EX: DEFAULT_TTL,
  });

  // store state as JSON
  const state = { status: "waiting", startTs: null, durationSec };
  await redis.set(stateKey, JSON.stringify(state), { EX: DEFAULT_TTL });

  return state;
}

// functions to load board and game state
export async function loadBoard(gameId) {
  await ensureRedis();
  const data = await redis.get(`game:${gameId}:board`);
  return data ? JSON.parse(data) : null; // returns { board, generatedAt }
}

export async function loadState(gameId) {
  await ensureRedis();
  const data = await redis.get(`game:${gameId}:state`);
  return data ? JSON.parse(data) : null; // returns { status, startTs, durationSec }
}

export async function addPlayer(gameId, playerId) {
  await ensureRedis();
  const key = `game:${gameId}:players`;

  await redis.sAdd(key, playerId);
  await redis.expire(key, DEFAULT_TTL);
}

export async function initPlayerScore(gameId, playerId) {
  await ensureRedis();
  const key = `game:${gameId}:scores`;

  // initalize score to 0 only if not present
  const exists = await redis.hExists(key, playerId); // need to check if exists otherwise fails, cant have it empty
  if (!exists) {
    await redis.hSet(key, { [playerId]: 0 });
  }
  await redis.expire(key, DEFAULT_TTL);
}

export async function listPlayers(gameId) {
  await ensureRedis();
  const key = `game:${gameId}:players`;
  const members = await redis.sMembers(key);
  return members || []; // returns [] if key is missing
}

export async function getScores(gameId) {
  await ensureRedis();
  const key = `game:${gameId}:scores`;
  const hash = await redis.hGetAll(key); // returns {} if missing

  // convert the string values to numbers
  const out = {};
  for (const [pid, val] of Object.entries(hash)) {
    out[pid] = Number(val);
  }

  return out;
}
