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
  setPlayerIcon,
  getPlayerNames,
  getPlayerIcons,
  getScores,
  loadState,
  finishGame,
  listPlayers,
} from "../data/redisGameRepo.js";
import { emitToLobby, emitToGame } from "../realtime/sockets.js";
import { requireAuth, debugJwt, checkJwt, extractUser } from "../auth.js";
import {
  updateUserGamesPlayed,
  updateUserWinCount,
} from "../services/user.service.js";

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
// Requires authentication - uses authenticated user as owner
router.post("/", checkJwt, extractUser, requireAuth, async (req, res, next) => {
  try {
    console.log(`🏠 POST /lobbies - Creating lobby for user: ${req.user.sub}`);
    const ownerId = req.user.sub;
    const ownerName = req.user.display_name;
    const ownerIcon = req.user.profile_icon;

    // generate a unique room code (retry if collision)
    let attempts = 0;
    let roomCode = makeRoomCode();
    while (attempts < 5) {
      const created = await createLobby({
        roomCode,
        ownerId,
        ownerName,
        ownerIcon,
      });
      if (created.ok) {
        const lobby = await loadLobby(roomCode);
        return res.status(201).json({
          roomCode,
          status: lobby.state.status,
          ownerId: lobby.state.ownerId,
          createdAt: lobby.state.createdAt,
          members: lobby.members,
          names: lobby.names,
          icons: lobby.icons,
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
// Requires authentication - uses authenticated user data
// lobby ttl is refreshed upon action (doesnt expire while ppl are still joining)
// if a player attempts to join twice, simply displays once (idempotent)
router.post(
  "/:code/join",
  checkJwt,
  extractUser,
  requireAuth,
  async (req, res, next) => {
    try {
      const roomCode = req.params.code;
      const playerId = req.user.sub;
      const name = req.user.display_name;
      const icon = req.user.profile_icon;

      console.log(
        `🚪 POST /lobbies/${roomCode}/join - User: ${playerId} joining lobby`
      );

      if (!roomCode || typeof roomCode !== "string") {
        return res.status(400).json({ message: "invalid roomCode" });
      }

      // limit num of players to 8
      const current = await countLobbyMembers(roomCode).catch(() => 0);
      if (current && current >= 8) {
        // check if the lobby exists to prevent potential errors
        const lobby = await loadLobby(roomCode);
        if (!lobby)
          return res
            .status(404)
            .json({ message: "lobby not found or expired" });
        return res
          .status(409)
          .json({ message: "lobby is full (max 8 players)" });
      }

      const result = await joinLobby({
        roomCode,
        playerId,
        displayName: name,
        profileIcon: icon,
      });
      if (!result.ok) {
        if (result.reason === "not_found")
          return res
            .status(404)
            .json({ message: "lobby not found or expired" });
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
        icons: result.icons,
      });

      return res.status(200).json({
        roomCode,
        status: result.state.status, // open
        ownerId: result.state.ownerId,
        createdAt: result.state.createdAt,
        members: result.members, // list of ppl in the lobby (ids)
        names: result.names, // list of ppl in lobby (names)
        icons: result.icons, // list of ppl in lobby (icons)
        joined: playerId,
        name: name || null,
      });
    } catch (err) {
      next(err);
    }
  }
);

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
      icons: lobby.icons, // list of player icons in the game
    });
  } catch (err) {
    next(err);
  }
});

// POST /lobbies/:code/start -> owner starts the game now (creates + closes lobby + starts timer)
router.post(
  "/:code/start",
  checkJwt,
  extractUser,
  requireAuth,
  async (req, res, next) => {
    try {
      const roomCode = req.params.code;
      const ownerId = req.user.sub;

      console.log(
        `🎮 POST /lobbies/${roomCode}/start - Starting game for user: ${ownerId}`
      );

      if (!roomCode || typeof roomCode !== "string") {
        return res.status(400).json({ message: "invalid roomCode" });
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

      if (lobby.state.status !== "open") {
        return res
          .status(409)
          .json({ message: `lobby not open (status=${lobby.status})` });
      }
      if (!Array.isArray(lobby.members) || lobby.members.length === 0) {
        return res
          .status(409)
          .json({ message: "cannot start with no members" });
      }

      // 1) create a new game
      const gameId = "g_" + crypto.randomBytes(3).toString("hex");
      const board = generateBoard5x5();
      const duration = 80;

      await saveNewGame({ gameId, board, durationSec: duration });

      // 2) copy lobby members into the game
      for (const pid of lobby.members) {
        await addPlayer(gameId, pid);
        const displayName = lobby.names?.[pid] ?? null;
        if (displayName) await setPlayerName(gameId, pid, displayName);
        const profileIcon = lobby.icons?.[pid] ?? null;
        if (profileIcon) await setPlayerIcon(gameId, pid, profileIcon);
        await initPlayerScore(gameId, pid);

        // Track that this user played a game (for statistics)
        try {
          await updateUserGamesPlayed(pid, "wordhunt"); // Assuming wordhunt for now
        } catch (error) {
          console.error("Error updating user games played:", error);
          // Don't fail the game start if user tracking fails
        }
      }

      // 3) map lobby <-> game and close lobby
      await setLobbyGame(roomCode, gameId);
      await setGameLobby(gameId, roomCode);
      await closeLobby(roomCode);

      // 4) start the game immediately (including timer)
      await startGame(gameId);

      const scores = await getScores(gameId);
      const names = await getPlayerNames(gameId);
      const icons = await getPlayerIcons(gameId);

      // notify the game room that game has started (clients will join game:<id>)
      const stateDoc = await loadState(gameId); // to get startTs/duration
      const startPayload = {
        gameId,
        board,
        players: lobby.members,
        names,
        icons,
        scores,
        startTs: stateDoc?.startTs ?? Date.now(),
        durationSec: stateDoc?.durationSec ?? 80,
      };

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
          // Finish the game
          await finishGame(gameId);

          // Reopen the lobby so players can start a new game
          try {
            const roomCode = await redis.get(`game:${gameId}:roomCode`);
            if (roomCode) {
              const result = await openLobby(roomCode);
              // Don't notify players yet - they'll be redirected when owner clicks "Back to Lobby"
            }
          } catch (e) {
            console.error("Error reopening lobby after auto-finish:", e);
          }

          // Get final scores, names, and icons for the ended event
          const [players, scores, names, icons] = await Promise.all([
            listPlayers(gameId),
            getScores(gameId),
            getPlayerNames(gameId),
            getPlayerIcons(gameId),
          ]);

          // Update games played count for all players and determine winner
          try {
            // Update games played count for all players who participated
            for (const playerId of Object.keys(scores)) {
              await updateUserGamesPlayed(playerId, "wordhunt");
            }

            // Determine winner and update win count
            const winnerId = Object.keys(scores).reduce((a, b) =>
              scores[a] > scores[b] ? a : b
            );
            if (winnerId && scores[winnerId] > 0) {
              await updateUserWinCount(winnerId, "wordhunt");
            }
          } catch (error) {
            console.error("Auto-finish: Error updating user stats:", error);
            // Don't fail the game finish if stats tracking fails
          }

          // Notify all players that the game has ended
          emitToGame(gameId, "game:ended", {
            gameId,
            endTs: Date.now(),
            scores,
            names,
            icons,
          });
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
  }
);

// POST /lobbies/:code/reopen -> owner reopens lobby and notifies all players
router.post(
  "/:code/reopen",
  checkJwt,
  extractUser,
  requireAuth,
  async (req, res, next) => {
    try {
      const roomCode = req.params.code;
      const ownerId = req.user.sub;

      if (!roomCode || typeof roomCode !== "string") {
        return res.status(400).json({ message: "invalid roomCode" });
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
  }
);

export default router;
