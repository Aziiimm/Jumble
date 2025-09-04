// data/redisLobbyRepo.js

import { redis, ensureRedis } from "../redis.js";

const LOBBY_TTL = Number(process.env.LOBBY_TTL_SECONDS || 1800); // 30 minutes

function lobbyKeys(roomCode) {
  return {
    state: `lobby:${roomCode}:state`,
    members: `lobby:${roomCode}:members`,
    names: `lobby:${roomCode}:names`,
  };
}

export async function createLobby({ roomCode, ownerId, ownerName }) {
  await ensureRedis();
  const { state, members, names } = lobbyKeys(roomCode);

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

  return { ok: true, state: stateDoc };
}

export async function loadLobby(roomCode) {
  await ensureRedis();
  const { state, members, names } = lobbyKeys(roomCode);
  const raw = await redis.get(state);
  if (!raw) return null;

  const stateDoc = JSON.parse(raw);
  const memberIds = await redis.sMembers(members);
  const nameMap = await redis.hGetAll(names);
  return { state: stateDoc, members: memberIds || [], names: nameMap || {} };
}

// player join a lobby ( add their id, name, and refreshes the TTL )
export async function joinLobby({ roomCode, playerId, displayName }) {
  await ensureRedis();
  const { state, members, names } = lobbyKeys(roomCode);

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

  // bump state TTL too so the lobby stays alive
  await redis.expire(state, LOBBY_TTL);

  // return current snapshot
  const memberIds = await redis.sMembers(members);
  const nameMap = await redis.hGetAll(names);

  return {
    ok: true,
    state: stateDoc,
    members: memberIds || [],
    names: nameMap || {},
  };
}

// count members for max cap
export async function countLobbyMembers(roomCode) {
  await ensureRedis();
  const { members } = lobbyKeys(roomCode);
  return await redis.sCard(members);
}
