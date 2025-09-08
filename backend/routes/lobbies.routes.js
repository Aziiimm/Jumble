// routes/lobbies.routes.js

import express from "express";
import crypto from "crypto";
import { redis } from "../redis.js";
import {
  createLobby,
  loadLobby,
  joinLobby,
  countLobbyMembers,
  setLobbyGame,
  getLobbyGame,
  closeLobby,
  setGameLobby,
  openLobby,
} from "../data/redisLobbyRepo.js";
import { generateBoard5x5 } from "../services/board.service.js";
import {
  saveNewGame,
  startGame,
  addPlayer,
  initPlayerScore,
  setPlayerName,
  getPlayerNames,
  getScores,
  loadState,
  finishGame,
} from "../data/redisGameRepo.js";
import { emitToLobby, emitToGame } from "../realtime/sockets.js";

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

    // broadcast updated lobby snapshot to everyone in the lobby room
    emitToLobby(roomCode, "lobby:update", {
      roomCode,
      status: result.state.status, // open
      ownerId: result.state.ownerId,
      members: result.members,
      names: result.names,
    });

    return res.status(200).json({
      roomCode,
      status: result.state.status, // open
      ownerId: result.state.ownerId,
      createdAt: result.state.createdAt,
      members: result.members, // list of ppl in the lobby (ids)
      names: result.names, // list of ppl in lobby (names)
      joined: playerId,
      name: name || null,
    });
  } catch (err) {
    next(err);
  }
});

// GET /lobbies/:code -> get the current lobby snapshot
router.get("/:code", async (req, res, next) => {
  try {
    const roomCode = req.params.code;
    if (!roomCode || typeof roomCode !== "string") {
      return res.status(400).json({ message: "invalid roomCode" });
    }

    const lobby = await loadLobby(roomCode);
    if (!lobby) {
      return res.status(404).json({ message: "lobby not found or expired" });
    }

    return res.status(200).json({
      roomCode,
      status: lobby.state.status, // "open" | "closed" (later)
      ownerId: lobby.state.ownerId,
      createdAt: lobby.state.createdAt,
      members: lobby.members, // list of player ids in the game
      names: lobby.names, // list of player names in the game
    });
  } catch (err) {
    next(err);
  }
});

// POST /lobbies/:code/start -> owner starts the game now (creates + closes lobby + starts timer)
router.post("/:code/start", async (req, res, next) => {
  try {
    const roomCode = req.params.code;
    const { ownerId } = req.body || {};

    if (!roomCode || typeof roomCode !== "string") {
      return res.status(400).json({ message: "invalid roomCode" });
    }
    if (!ownerId || typeof ownerId !== "string") {
      return res.status(400).json({ message: "ownerId is required" });
    }

    const lobby = await loadLobby(roomCode);
    if (!lobby) {
      return res.status(404).json({ message: "lobby not found or expired" });
    }
    if (lobby.state.ownerId !== ownerId) {
      return res
        .status(403)
        .json({ message: "only the owner can start the lobby" });
    }

    // Debug: Log lobby state after reopening
    console.log("Lobby after reopening:", {
      roomCode,
      status: lobby.state.status,
      members: lobby.members,
      names: lobby.names,
      ownerId: lobby.state.ownerId,
    });
    if (lobby.state.status !== "open") {
      return res
        .status(409)
        .json({ message: `lobby not open (status=${lobby.status})` });
    }
    if (!Array.isArray(lobby.members) || lobby.members.length === 0) {
      return res.status(409).json({ message: "cannot start with no members" });
    }

    // 1) create a new game
    const gameId = "g_" + crypto.randomBytes(3).toString("hex");
    const board = generateBoard5x5();
    const duration = 80;

    await saveNewGame({ gameId, board, durationSec: duration });

    // 2) copy lobby members into the game
    console.log("Lobby members:", lobby.members);
    console.log("Lobby names:", lobby.names);
    for (const pid of lobby.members) {
      console.log("Adding player to game:", pid);
      await addPlayer(gameId, pid);
      const displayName = lobby.names?.[pid] ?? null;
      if (displayName) await setPlayerName(gameId, pid, displayName);
      await initPlayerScore(gameId, pid);
    }

    // 3) map lobby <-> game and close lobby
    await setLobbyGame(roomCode, gameId);
    await setGameLobby(gameId, roomCode);
    await closeLobby(roomCode);

    // 4) start the game immediately (including timer)
    await startGame(gameId);

    const scores = await getScores(gameId);
    const names = await getPlayerNames(gameId);
    console.log("Game scores:", scores);
    console.log("Game names:", names);

    // notify the game room that game has started (clients will join game:<id>)
    const stateDoc = await loadState(gameId); // to get startTs/duration
    const startPayload = {
      gameId,
      board,
      players: lobby.members,
      names,
      scores,
      startTs: stateDoc?.startTs ?? Date.now(),
      durationSec: stateDoc?.durationSec ?? 80,
    };
    console.log("Start payload:", startPayload);

    // notify lobby that its closing & which game to navigate to
    emitToLobby(roomCode, "lobby:closed", { roomCode, gameId });
    // also send game:started to lobby so they can see start info immediately
    emitToLobby(roomCode, "game:started", startPayload);
    // notify anyone already in the game room
    emitToGame(gameId, "game:started", startPayload);

    // Set up auto-finish timer
    const durationMs = startPayload.durationSec * 1000;
    setTimeout(async () => {
      try {
        console.log(
          `Auto-finishing game ${gameId} after ${startPayload.durationSec}s`
        );

        // Finish the game
        await finishGame(gameId);

        // Reopen the lobby so players can start a new game
        try {
          const roomCode = await redis.get(`game:${gameId}:roomCode`);
          if (roomCode) {
            console.log("Reopening lobby after auto-finish:", roomCode);
            const result = await openLobby(roomCode);
            console.log("openLobby result:", result);

            // Don't notify players yet - they'll be redirected when owner clicks "Back to Lobby"
          }
        } catch (e) {
          console.error("Error reopening lobby after auto-finish:", e);
        }

        // Notify all players that the game has ended
        emitToGame(gameId, "game:ended", { gameId });

        console.log(`Game ${gameId} auto-finished successfully`);
      } catch (error) {
        console.error(`Error auto-finishing game ${gameId}:`, error);
      }
    }, durationMs);

    return res.status(201).json({
      roomCode,
      gameId,
      board,
      status: "running",
      durationSec: duration,
      players: lobby.members,
      names,
      scores,
    });
  } catch (err) {
    next(err);
  }
});

// POST /lobbies/:code/reopen -> owner reopens lobby and notifies all players
router.post("/:code/reopen", async (req, res, next) => {
  try {
    const roomCode = req.params.code;
    const { ownerId } = req.body || {};

    if (!roomCode || typeof roomCode !== "string") {
      return res.status(400).json({ message: "invalid roomCode" });
    }
    if (!ownerId || typeof ownerId !== "string") {
      return res.status(400).json({ message: "ownerId is required" });
    }

    const lobby = await loadLobby(roomCode);
    if (!lobby) {
      return res.status(404).json({ message: "lobby not found or expired" });
    }
    if (lobby.state.ownerId !== ownerId) {
      return res
        .status(403)
        .json({ message: "only the owner can reopen the lobby" });
    }

    // Notify all players that the lobby is reopened
    emitToLobby(roomCode, "lobby:reopened", { roomCode });

    return res.status(200).json({ message: "lobby reopened", roomCode });
  } catch (err) {
    next(err);
  }
});

export default router;
