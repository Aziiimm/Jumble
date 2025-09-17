// data/redisGameRepo.js
import { redis, ensureRedis } from "../redis.js";

const DEFAULT_TTL = Number(7200); // 2 hours WILL CHANGE LATER TO 3 MINUTES

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

// prevent duplicate scoring of the same word by a single player
export async function hasSubmittedWord(gameId, playerId, word) {
  await ensureRedis();
  const key = `game:${gameId}:submissions:${playerId}`;

  // if set not exists, sIsMember return 0
  const exists = await redis.sIsMember(key, word.toLowerCase());
  return exists === 1 || exists === true;
}

export async function addSubmittedWord(gameId, playerId, word) {
  await ensureRedis();
  const key = `game:${gameId}:submissions:${playerId}`;
  await redis.sAdd(key, word.toLowerCase());
  await redis.expire(key, DEFAULT_TTL);
}

export async function incrementPlayerScore(gameId, playerId, score) {
  await ensureRedis();
  const key = `game:${gameId}:scores`;

  // Debug: incrementPlayerScore called
  // console.log("=== incrementPlayerScore ===");
  // console.log("GameId:", gameId);
  // console.log("PlayerId:", playerId);
  // console.log("Score to add:", score);

  // make sure the field exists, init if not
  const exists = await redis.hExists(key, playerId);
  // console.log("Player exists in scores:", exists);

  if (!exists) {
    await redis.hSet(key, { [playerId]: 0 });
    await redis.expire(key, DEFAULT_TTL);
    // console.log("Initialized player score to 0");
  }

  const newScore = await redis.hIncrBy(key, playerId, Number(score) || 0);
  // console.log("New score after increment:", newScore);

  // Get all scores to verify
  // const allScores = await redis.hGetAll(key);
  // console.log("All scores after increment:", allScores);

  return Number(newScore);
}

// finish a game
export async function finishGame(gameId) {
  await ensureRedis();
  const stateKey = `game:${gameId}:state`;

  const raw = await redis.get(stateKey);
  if (!raw) return { ok: false, reason: "not_found" };

  const state = JSON.parse(raw); // { status, startTs, durationSec }
  if (state.status === "ended") return { ok: false, reason: "already_ended" };

  state.status = "ended";
  state.endTs = Date.now();

  // keep existing TTL
  let ttl = await redis.ttl(stateKey);
  if (ttl < 0) ttl = DEFAULT_TTL;

  await redis.set(stateKey, JSON.stringify(state), { EX: ttl });

  return { ok: true, state };
}
