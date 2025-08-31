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

export async function setPlayerName(gameId, playerId, displayName) {
  await ensureRedis();
  const key = `game:${gameId}:playerNames`;
  if (typeof displayName === "string" && displayName.trim().length > 0) {
    await redis.hSet(key, { [playerId]: displayName.trim() });
    await redis.expire(key, DEFAULT_TTL);
  }
}

export async function getPlayerNames(gameId) {
  await ensureRedis();
  const key = `game:${gameId}:playerNames`;
  const hash = await redis.hGetAll(key); // return {} if missing
  return hash;
}

export async function startGame(gameId) {
  await ensureRedis();

  const stateKey = `game:${gameId}:state`;

  // ensure the game exists
  const stateRaw = await redis.get(stateKey);
  if (!stateRaw) return { ok: false, reason: "not_found" };

  const state = JSON.parse(stateRaw); // { status, startTs, durationSec }

  if (state.status === "running")
    return { ok: false, reason: "already_running" };
  if (state.status === "ending") return { ok: false, reason: "already_ended" };

  // set start time and status
  const now = Date.now();
  state.status = "running";
  state.startTs = now;

  // preserve the remaining TTL if present, otherwise apply the default
  let ttl = await redis.ttl(stateKey);
  if (ttl < 0) ttl = DEFAULT_TTL; // -1/-2 means no ttl or missing, fallback

  await redis.set(stateKey, JSON.stringify(state), { EX: ttl });

  return { ok: true, state };
}
