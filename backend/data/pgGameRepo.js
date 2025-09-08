// data/pgGameRepo.js
import { pool } from "../db.js";

/**
 * Save a finished game snapshot into Postgres.
 * - Upserts the game row
 * - Upserts each player's final score
 *
 * @param {Object} args
 * @param {string} args.gameId
 * @param {number|null} args.startTs  // epoch ms
 * @param {number|null} args.endTs    // epoch ms
 * @param {number} args.durationSec
 * @param {string[][]} args.board     // 5x5
 * @param {Record<string,number>} args.scores   // { playerId: score }
 * @param {Record<string,string>} args.names    // { playerId: displayName }
 */
export async function saveFinishedGame({
  gameId,
  startTs,
  endTs,
  durationSec,
  board,
  scores,
  names,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // upsert into games
    await client.query(
      `
      INSERT INTO games (id, start_ts, end_ts, duration_sec, board)
      VALUES ($1, $2, $3, $4, $5::jsonb)
      ON CONFLICT (id) DO UPDATE
      SET
        start_ts = EXCLUDED.start_ts,
        end_ts = EXCLUDED.end_ts,
        duration_sec = EXCLUDED.duration_sec,
        board = EXCLUDED.board
      `,
      [gameId, startTs, endTs, durationSec, JSON.stringify(board)]
    );

    // upsert into game_scores
    // build one values list for performance
    const entries = Object.entries(scores || {}); // [[playerId, score], ...]
    for (const [playerId, score] of entries) {
      const displayName = names?.[playerId] ?? null;
      await client.query(
        `
        INSERT INTO game_scores (game_id, player_id, display_name, score)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (game_id, player_id) DO UPDATE
        SET
          display_name = EXCLUDED.display_name,
          score = EXCLUDED.score
        `,
        [gameId, playerId, displayName, Number(score) || 0]
      );
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
