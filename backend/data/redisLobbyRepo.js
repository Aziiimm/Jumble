// data/redisLobbyRepo.js

import { redis, ensureRedis } from "../redis.js";

const LOBBY_TTL = Number(process.env.LOBBY_TTL_SECONDS || 1800); // 30 minutes

function lobbyKeys(roomCode) {
  return {
    state: `lobby:${roomCode}:state`,
    members: `lobby:${roomCode}:members`,
    names: `lobby:${roomCode}:names`,
    icons: `lobby:${roomCode}:icons`,
  };
}

export async function createLobby({ roomCode, ownerId, ownerName, ownerIcon }) {
  await ensureRedis();
  const { state, members, names, icons } = lobbyKeys(roomCode);

  // fail if the lobby already exists
  const exists = await redis.exists(state);
  if (exists) return { ok: false, reason: "exists" };

  const now = Date.now();
  const stateDoc = { status: "open", ownerId, createdAt: now };

  // create state
  await redis.set(state, JSON.stringify(stateDoc), { EX: LOBBY_TTL });

  // create members set and add owner
  await redis.sAdd(members, ownerId);
  await redis.expire(members, LOBBY_TTL);

  // create names hash
  if (ownerName) {
    await redis.hSet(names, { [ownerId]: ownerName });
  }
  await redis.expire(names, LOBBY_TTL);

  // create icons hash
  if (
    ownerIcon &&
    typeof ownerIcon === "number" &&
    ownerIcon >= 1 &&
    ownerIcon <= 8
  ) {
    await redis.hSet(icons, { [ownerId]: ownerIcon });
  }
  await redis.expire(icons, LOBBY_TTL);

  return { ok: true, state: stateDoc };
}

export async function loadLobby(roomCode) {
  await ensureRedis();
  const { state, members, names, icons } = lobbyKeys(roomCode);
  const raw = await redis.get(state);
  if (!raw) return null;

  const stateDoc = JSON.parse(raw);
  const memberIds = await redis.sMembers(members);
  const nameMap = await redis.hGetAll(names);
  const iconMap = await redis.hGetAll(icons);

  // Convert icon values from strings to numbers
  const convertedIconMap = {};
  for (const [playerId, iconValue] of Object.entries(iconMap || {})) {
    const iconNumber = parseInt(iconValue, 10);
    if (!isNaN(iconNumber) && iconNumber >= 1 && iconNumber <= 8) {
      convertedIconMap[playerId] = iconNumber;
    }
  }

  return {
    state: stateDoc,
    members: memberIds || [],
    names: nameMap || {},
    icons: convertedIconMap,
  };
}

// player join a lobby ( add their id, name, icon, and refreshes the TTL )
export async function joinLobby({
  roomCode,
  playerId,
  displayName,
  profileIcon,
}) {
  await ensureRedis();
  const { state, members, names, icons } = lobbyKeys(roomCode);

  const raw = await redis.get(state);
  if (!raw) return { ok: false, reason: "not_found" };

  const stateDoc = JSON.parse(raw); // { status, ownerId, createdAt }
  if (stateDoc.status !== "open") return { ok: false, reason: "closed" };

  // add member
  await redis.sAdd(members, playerId);
  await redis.expire(members, LOBBY_TTL);

  // store/refresh ttl on name (we trim to avoid nulls)
  if (typeof displayName === "string" && displayName.trim()) {
    await redis.hSet(names, { [playerId]: displayName.trim() });
  }
  await redis.expire(names, LOBBY_TTL);

  // store/refresh ttl on icon
  if (typeof profileIcon === "number" && profileIcon >= 1 && profileIcon <= 8) {
    await redis.hSet(icons, { [playerId]: profileIcon });
  }
  await redis.expire(icons, LOBBY_TTL);

  // bump state TTL too so the lobby stays alive
  await redis.expire(state, LOBBY_TTL);

  // return current snapshot
  const memberIds = await redis.sMembers(members);
  const nameMap = await redis.hGetAll(names);
  const iconMap = await redis.hGetAll(icons);

  return {
    ok: true,
    state: stateDoc,
    members: memberIds || [],
    names: nameMap || {},
    icons: iconMap || {},
  };
}

// count members for max cap
export async function countLobbyMembers(roomCode) {
  await ensureRedis();
  const { members } = lobbyKeys(roomCode);
  return await redis.sCard(members);
}

export async function closeLobby(roomCode) {
  await ensureRedis();
  const { state } = lobbyKeys(roomCode);
  const raw = await redis.get(state);
  if (!raw) return { ok: false, reason: "not_found" };
  const doc = JSON.parse(raw);
  if (doc.status === "closed") return { ok: true, state: doc };

  doc.status = "closed";
  let ttl = await redis.ttl(state);
  if (ttl < 0) ttl = LOBBY_TTL;
  await redis.set(state, JSON.stringify(doc), { EX: ttl });
  return { ok: true, state: doc };
}

export async function setLobbyGame(roomCode, gameId) {
  await ensureRedis();
  const key = `lobby:${roomCode}:gameId`;
  await redis.set(key, gameId, { EX: LOBBY_TTL });
}

export async function getLobbyGame(roomCode) {
  await ensureRedis();
  const key = `lobby:${roomCode}:gameId`;
  return await redis.get(key);
}

// remap game to room code so lobby can restart postgame
export async function setGameLobby(gameId, roomCode) {
  await ensureRedis();
  const key = `game:${gameId}:roomCode`;
  await redis.set(key, roomCode, { EX: LOBBY_TTL });
}

// reopens lobby postgame so players can just rejoin
export async function openLobby(roomCode) {
  await ensureRedis();
  const { state } = lobbyKeys(roomCode);
  const raw = await redis.get(state);
  if (!raw) return { ok: false, reason: "not_found" };
  const doc = JSON.parse(raw);

  if (doc.status === "open") return { ok: true, state: doc };

  doc.status = "open";
  let ttl = await redis.ttl(state);
  if (ttl < 0) ttl = LOBBY_TTL;
  await redis.set(state, JSON.stringify(doc), { EX: ttl });

  return { ok: true, state: doc };
}
