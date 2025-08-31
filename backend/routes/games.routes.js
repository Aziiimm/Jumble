// routes/games.routes.js
import express from "express";
import crypto from "crypto";
import { generateBoard5x5 } from "../services/board.service.js";
import {
  saveNewGame,
  loadBoard,
  loadState,
  addPlayer,
  initPlayerScore,
  listPlayers,
  getScores,
} from "../data/redisGameRepo.js";
import { stat } from "fs";

const router = express.Router();

// POST /games  -> create a game session
router.post("/", async (req, res, next) => {
  try {
    const duration = 80; // 80 second game duration

    const gameId = "g_" + crypto.randomBytes(3).toString("hex"); // craeting a game id prefixed by g_
    const board = generateBoard5x5();
    const state = await saveNewGame({ gameId, board, durationSec: duration }); // persist in redis

    // return payload the frontend needs
    res.status(201).json({
      gameId,
      board,
      status: state.status,
      durationSec: state.durationSec,
      startTs: state.startTs, // null for now
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id/state -> returns game data
router.get("/:id/state", async (req, res, next) => {
  try {
    const gameId = req.params.id;

    // basic check for game id (shouldn't be necessary)
    if (!gameId || !gameId.startsWith("g_")) {
      return res.status(400).json({ message: "invalid gameId" });
    }

    const boardDoc = await loadBoard(gameId);
    const stateDoc = await loadState(gameId);

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

// POST /games/:id/join
router.post("/:id/join", async (req, res, next) => {
  try {
    const gameId = req.params.id;
    const { playerId, name } = req.body || {};

    // basic input checks
    if (!gameId || !gameId.startsWith("g_")) {
      return res.status(400).json({ message: "invalid gameId" });
    }
    if (!playerId || typeof playerId !== "string") {
      return res.status(400).json({ message: "playerId is required" });
    }

    // ensure the game exists and is joinable (in waiting state)
    const stateDoc = await loadState(gameId);
    const boardDoc = await loadBoard(gameId);
    if (!stateDoc || !boardDoc) {
      return res
        .status(404)
        .json({ message: "game not found or game has expired " });
    }
    if (stateDoc.status !== "waiting") {
      return res
        .status(409)
        .json({ message: `cannot join; game status is '${stateDoc.status}'` });
    }

    // add player to redis set and initialize their score to 0
    await addPlayer(gameId, playerId);
    await initPlayerScore(gameId, playerId);

    // store player display name later, for now we're just gonna return it in the response
    const players = await listPlayers(gameId);
    const scores = await getScores(gameId);

    return res.status(200).json({
      gameId,
      joined: playerId,
      name: name || null,
      players, // array of playerIds
      scores, // { playerId: number }
      status: stateDoc.status,
      durationSec: stateDoc.durationSec,
      startTs: stateDoc.startTs,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
