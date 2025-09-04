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

const router = express.Router();

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

    const now = Date.now();
    const endTs = (stateDoc.startTs ?? 0) + (stateDoc.durationSec ?? 80) * 1000;
    if (stateDoc.status === "running" && stateDoc.startTs && now >= endTs) {
      try {
        await finishGame(gameId);
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
router.post("/:id/submit", async (req, res, next) => {
  try {
    const gameId = req.params.id;
    const { playerId, path } = req.body || {};

    if (!gameId || !gameId.startsWith("g_")) {
      return res.status(400).json({ message: "invalid gameId" });
    }
    if (!playerId || typeof playerId !== "string") {
      return res.status(400).json({ message: "playerId is required" });
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
    const endTs = (stateDoc.startTs ?? 0) + (stateDoc.durationSec ?? 80) * 1000;
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
});

// POST /games/:id/finish -> set game state to finished and return final stats
router.post("/:id/finish", async (req, res, next) => {
  try {
    const gameId = req.params.id;

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
    const endTs = (stateDoc.startTs ?? 0) + (stateDoc.durationSec ?? 80) * 1000;

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

    try {
      const roomCode = await redis.get(`game:${gameId}:roomCode`);
      if (roomCode) {
        await openLobby(roomCode);
      }
    } catch (e) {}

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
});

export default router;

// // POST /games  -> create a game session
// router.post("/", async (req, res, next) => {
//   try {
//     const duration = 300; // 5 min game duration GONNA CHANGE TO 80 SECONDS LATER

//     const gameId = "g_" + crypto.randomBytes(3).toString("hex"); // creating a game id prefixed by g_
//     const board = generateBoard5x5();
//     const state = await saveNewGame({ gameId, board, durationSec: duration }); // persist in redis

//     // return payload the frontend needs
//     res.status(201).json({
//       gameId,
//       board,
//       status: state.status,
//       durationSec: state.durationSec,
//       startTs: state.startTs, // null for now
//     });
//   } catch (err) {
//     next(err);
//   }
// });

// POST /games/:id/join
// router.post("/:id/join", async (req, res, next) => {
//   try {
//     const gameId = req.params.id;
//     const { playerId, name } = req.body || {};

//     // basic input checks
//     if (!gameId || !gameId.startsWith("g_")) {
//       return res.status(400).json({ message: "invalid gameId" });
//     }
//     if (!playerId || typeof playerId !== "string") {
//       return res.status(400).json({ message: "playerId is required" });
//     }

//     // ensure the game exists and is joinable (in waiting state)
//     const stateDoc = await loadState(gameId);
//     const boardDoc = await loadBoard(gameId);
//     if (!stateDoc || !boardDoc) {
//       return res
//         .status(404)
//         .json({ message: "game not found or game has expired " });
//     }
//     if (stateDoc.status !== "waiting") {
//       return res
//         .status(409)
//         .json({ message: `cannot join; game status is '${stateDoc.status}'` });
//     }

//     // add player to redis set and initialize their score to 0
//     await addPlayer(gameId, playerId);
//     await initPlayerScore(gameId, playerId);

//     if (name) {
//       await setPlayerName(gameId, playerId, name);
//     }

//     // store player display name later, for now we're just gonna return it in the response
//     const players = await listPlayers(gameId);
//     const scores = await getScores(gameId);
//     const names = await getPlayerNames(gameId);

//     return res.status(200).json({
//       gameId,
//       joined: playerId,
//       name: name || null,
//       players, // array of playerIds
//       scores, // { playerId: number }
//       names, // { playerId: name }
//       status: stateDoc.status,
//       durationSec: stateDoc.durationSec,
//       startTs: stateDoc.startTs,
//     });
//   } catch (err) {
//     next(err);
//   }
// });

// POST /games/:id/start -> set status to 'running' and set the startTs
// router.post("/:id/start", async (req, res, next) => {
//   try {
//     const gameId = req.params.id;

//     if (!gameId || !gameId.startsWith("g_")) {
//       return res.status(400).json({ message: "invalid gameId" });
//     }

//     // make sure the game exists (there is a board and a game state)
//     const [boardDoc, stateDoc] = await Promise.all([
//       loadBoard(gameId),
//       loadState(gameId),
//     ]);
//     if (!boardDoc || !stateDoc) {
//       return res.status(404).json({ message: "game not found or expired" });
//     }
//     if (stateDoc.status === "running") {
//       return res.status(409).json({ message: "game is already running" });
//     }
//     if (stateDoc.status === "ended") {
//       return res.status(409).json({ message: "game has already ended" });
//     }

//     const result = await startGame(gameId);
//     if (!result.ok) {
//       if (result.reason === "not_found")
//         return res.status(404).json({ message: "game not found" });
//       if (result.reason === "already_running")
//         return res.status(409).json({ message: "game is already running" });
//       if (result.reason === "already_ended")
//         return res.status(409).json({ message: "game has already ended" });
//       return res.status(500).json({ message: "failed to start the game " });
//     }

//     // return updated state to the client
//     const s = result.state; // { status, startTs, durationSec }
//     return res.status(200).json({
//       gameId, // g_8934da
//       board: boardDoc.board,
//       status: s.status, // running
//       startTs: s.startTs,
//       durationSec: s.durationSec, // 80
//     });
//   } catch (err) {
//     next(err);
//   }
// });
