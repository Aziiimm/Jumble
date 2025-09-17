// routes/games.routes.js
import express from "express";
import crypto from "crypto";
import { redis } from "../redis.js";
import { generateBoard5x5 } from "../services/board.service.js";
import { isValidPath, buildWord } from "../services/path.service.js";
import { isValidWord as dictIsValid } from "../services/dictionary.service.js";
import { scoreWordByLength } from "../services/scoring.service.js";
import { saveFinishedGame } from "../data/pgGameRepo.js";
import {
  saveNewGame,
  loadBoard,
  loadState,
  addPlayer,
  initPlayerScore,
  listPlayers,
  getScores,
  setPlayerName,
  getPlayerNames,
  startGame,
  hasSubmittedWord,
  addSubmittedWord,
  incrementPlayerScore,
  finishGame,
} from "../data/redisGameRepo.js";
import { openLobby } from "../data/redisLobbyRepo.js";
import { emitToLobby, emitToGame } from "../realtime/sockets.js";
import { requireAuth, checkJwt, extractUser } from "../auth.js";
import {
  updateUserWinCount,
  updateUserGamesPlayed,
} from "../services/user.service.js";

const router = express.Router();

// GET /:id/state -> returns game data
router.get("/:id/state", async (req, res, next) => {
  try {
    const gameId = req.params.id;

    console.log(`🎯 GET /games/${gameId}/state - Getting game state`);

    // basic check for game id (shouldn't be necessary)
    if (!gameId || !gameId.startsWith("g_")) {
      return res.status(400).json({ message: "invalid gameId" });
    }

    const boardDoc = await loadBoard(gameId);
    const stateDoc = await loadState(gameId);

    const now = Date.now();
    const endTs = (stateDoc.startTs ?? 0) + (stateDoc.durationSec ?? 80) * 1000;
    if (stateDoc.status === "running" && stateDoc.startTs && now >= endTs) {
      try {
        const fin = await finishGame(gameId);
        if (fin && fin.ok) {
          // Get final scores and names for the ended event
          const [players, scores, names] = await Promise.all([
            listPlayers(gameId),
            getScores(gameId),
            getPlayerNames(gameId),
          ]);

          // Emit game ended event when timer runs out
          emitToGame(gameId, "game:ended", {
            gameId,
            endTs: fin.state.endTs ?? Date.now(),
            scores,
            names,
          });
        }
      } catch {}
      const s2 = await loadState(gameId);
      if (s2) (stateDoc.status = s2.status), (stateDoc.endTs = s2.endTs);
    }

    if (!boardDoc || !stateDoc) {
      return res
        .status(404)
        .json({ message: "game not found or game has expired" });
    }

    res.json({
      gameId,
      board: boardDoc.board,
      status: stateDoc.status,
      durationSec: stateDoc.durationSec,
      startTs: stateDoc.startTs,
    });
  } catch (err) {
    next(err);
  }
});

// POST /games/:id/submit (path->word, check dictionary, dedupe, update score)
router.post(
  "/:id/submit",
  checkJwt,
  extractUser,
  requireAuth,
  async (req, res, next) => {
    try {
      const gameId = req.params.id;
      const { path } = req.body || {};
      const playerId = req.user.sub;

      console.log(
        `📝 POST /games/${gameId}/submit - User: ${playerId} submitting word`
      );

      if (!gameId || !gameId.startsWith("g_")) {
        return res.status(400).json({ message: "invalid gameId" });
      }
      if (!Array.isArray(path) || path.length < 3) {
        return res.status(400).json({
          message: "path must be an array of [row,col] with length >= 3",
        });
      }

      const [boardDoc, stateDoc] = await Promise.all([
        loadBoard(gameId),
        loadState(gameId),
      ]);
      if (!boardDoc || !stateDoc) {
        return res.status(404).json({ message: "game not found or expired" });
      }

      // game must be running then
      if (stateDoc.status !== "running") {
        return res.status(409).json({
          message: `cannot submit; game status is '${stateDoc.status}'`,
        });
      }

      // check the timer
      const now = Date.now();
      const endTs =
        (stateDoc.startTs ?? 0) + (stateDoc.durationSec ?? 80) * 1000;
      if (!stateDoc.startTs || now > endTs) {
        return res.status(409).json({ message: "round is already over " });
      }

      // validate the path
      const pathValid = isValidPath(boardDoc.board, path);
      if (!pathValid) {
        return res.status(200).json({
          gameId,
          playerId,
          accepted: false,
          reason: "invalid_path",
          word: "",
          points: 0,
          timeLeftMs: Math.max(0, endTs - now),
        });
      }
      const word = buildWord(boardDoc.board, path);

      // dictionary check
      if (!(await dictIsValid(word))) {
        return res.status(200).json({
          gameId,
          playerId,
          accepted: false,
          reason: "not_in_dictionary",
          word,
          points: 0,
          timeLeftMs: Math.max(0, endTs - now),
        });
      }

      // dedupe check
      const already = await hasSubmittedWord(gameId, playerId, word);
      if (already) {
        const scores = await getScores(gameId);
        return res.status(200).json({
          gameId,
          playerId,
          accepted: false,
          reason: "duplicate_word",
          word,
          points: 0,
          scores,
          timeLeftMs: Math.max(0, endTs - now),
        });
      }

      // score update
      const points = scoreWordByLength(word);
      if (points <= 0) {
        return res.status(200).json({
          gameId,
          playerId,
          accepted: false,
          reason: "too_short",
          word,
          points: 0,
          timeLeftMs: Math.max(0, endTs - now),
        });
      }

      await addSubmittedWord(gameId, playerId, word);
      const newScore = await incrementPlayerScore(gameId, playerId, points);
      const scores = await getScores(gameId);

      emitToGame(gameId, "game:score", {
        gameId,
        playerId,
        word,
        points,
        scores, // full scoreboard after the increment
      });

      return res.status(200).json({
        gameId,
        playerId,
        accepted: true,
        word,
        points,
        newScore,
        scores,
        timeLeftMs: Math.max(0, endTs - now),
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /games/:id/finish -> set game state to finished and return final stats
router.post(
  "/:id/finish",
  checkJwt,
  extractUser,
  requireAuth,
  async (req, res, next) => {
    try {
      const gameId = req.params.id;

      console.log(`🏁 POST /games/${gameId}/finish - Finishing game`);

      if (!gameId || !gameId.startsWith("g_")) {
        return res.status(400).json({ message: "invalid gameId " });
      }

      // load current board to check state
      const [boardDoc, stateDoc] = await Promise.all([
        loadBoard(gameId),
        loadState(gameId),
      ]);
      if (!boardDoc || !stateDoc) {
        return res.status(404).json({ message: "game not found or expired" });
      }

      // game already ended
      if (stateDoc.status === "ended") {
        return res.status(409).json({ message: "game already ended" });
      }

      // game must have started
      if (!stateDoc.startTs || stateDoc.status !== "running") {
        return res.status(409).json({
          message: `cannot finish; game status is '${stateDoc.status}'`,
        });
      }

      // time check
      const now = Date.now();
      const endTs =
        (stateDoc.startTs ?? 0) + (stateDoc.durationSec ?? 80) * 1000;

      if (now < endTs) {
        return res.status(409).json({
          message: "too early to finish",
          msUntilEnd: endTs - now,
        });
      }

      const fin = await finishGame(gameId);
      if (!fin.ok) {
        if (fin.reason === "not_found")
          return res.status(404).json({ message: "game not found" });
        if (fin.reason === "already_ended")
          return res.status(409).json({ message: "game already ended" });
        return res.status(500).json({ message: "failed to finish game" });
      }

      const [players, scores, names] = await Promise.all([
        listPlayers(gameId),
        getScores(gameId),
        getPlayerNames(gameId),
      ]);

      await saveFinishedGame({
        gameId,
        startTs: fin.state.startTs ?? stateDoc.startTs ?? null,
        endTs: fin.state.endTs ?? Date.now(),
        durationSec: fin.state.durationSec,
        board: boardDoc.board,
        scores,
        names,
      });

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
          await updateUserWinCount(winnerId, "wordhunt"); // Assuming wordhunt for now
        }
      } catch (error) {
        console.error("Error updating user stats:", error);
        // Don't fail the game finish if stats tracking fails
      }

      try {
        const roomCode = await redis.get(`game:${gameId}:roomCode`);
        if (roomCode) {
          const result = await openLobby(roomCode);
        }
      } catch (e) {
        console.error("Error reopening lobby:", e);
      }

      // broadcast to the room
      emitToGame(gameId, "game:ended", {
        gameId,
        endTs: fin.state.endTs ?? Date.now(),
        scores,
        names,
      });

      // if there was a room code, tell the lobby its open again
      // lobby has already reopened in Redis, this just tells the client instantly
      try {
        const roomCode = await redis.get(`game:${gameId}:roomCode`);
        if (roomCode) {
          emitToLobby(roomCode, "lobby:reopened", { roomCode });
        }
      } catch {}

      return res.status(200).json({
        gameId,
        board: boardDoc.board,
        status: fin.state.status, // should be "ended"
        startTs: fin.state.startTs ?? stateDoc.startTs ?? null,
        endTs: fin.state.endTs ?? null,
        durationSec: fin.state.durationSec,
        players,
        names,
        scores,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
