// routes/lobbies.routes.js

import express from "express";
import crypto from "crypto";
import {
  createLobby,
  loadLobby,
  joinLobby,
  countLobbyMembers,
} from "../data/redisLobbyRepo.js";

const router = express.Router();

// helper to generate room code
function makeRoomCode() {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

// POST /lobbies -> create a lobby with a new room code
// body: { ownerId, ownerName }
router.post("/", async (req, res, next) => {
  try {
    const { ownerId, ownerName } = req.body || {};
    if (!ownerId || typeof ownerId !== "string") {
      return res.status(400).json({ message: "ownerId is required" });
    }

    // generate a unique room code (retry if collision)
    let attempts = 0;
    let roomCode = makeRoomCode();
    while (attempts < 5) {
      const created = await createLobby({ roomCode, ownerId, ownerName });
      if (created.ok) {
        const lobby = await loadLobby(roomCode);
        return res.status(201).json({
          roomCode,
          status: lobby.state.status,
          ownerId: lobby.state.ownerId,
          createdAt: lobby.state.createdAt,
          members: lobby.members,
          names: lobby.names,
        });
      }

      // collision, try another
      roomCode = makeRoomCode();
      attempts++;
    }
    return res.status(500).json({ message: "failed to allocate room code" });
  } catch (err) {
    next(err);
  }
});

// POST /lobbies/:code/join
// body: { playerId:, name: }
// lobby ttl is refreshed upon action (doesnt expire while ppl are still joining)
// if a player attempts to join twice, simply displays once (idempotent)
router.post("/:code/join", async (req, res, next) => {
  try {
    const roomCode = req.params.code;
    const { playerId, name } = req.body || {};

    if (!roomCode || typeof roomCode !== "string") {
      return res.status(400).json({ message: "invalid roomCode" });
    }
    if (!playerId || typeof playerId !== "string") {
      return res.status(400).json({ message: "playerId is required" });
    }

    // limit num of players to 8
    const current = await countLobbyMembers(roomCode).catch(() => 0);
    if (current && current >= 8) {
      // check if the lobby exists to prevent potential errors
      const lobby = await loadLobby(roomCode);
      if (!lobby)
        return res.status(404).json({ message: "lobby not found or expired" });
      return res.status(409).json({ message: "lobby is full (max 8 players)" });
    }

    const result = await joinLobby({ roomCode, playerId, displayName: name });
    if (!result.ok) {
      if (result.reason === "not_found")
        return res.status(404).json({ message: "lobby not found or expired" });
      if (result.reason === "closed")
        return res.status(404).json({ message: "lobby is closed" });
      return res.status(500).json({ message: "failed to join lobby" });
    }

    return res.status(200).json({
      roomCode,
      status: result.state.status, // open
      ownerId: result.state.createdAt,
      members: result.members, // list of ppl in the lobby (ids)
      names: result.names, // list of ppl in lobby (names)
      joined: playerId,
      name: name || null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
