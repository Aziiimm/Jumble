// services/user.service.js
// User management service for Auth0 integration

import { pool } from "../db.js";

/**
 * Create or update a user from Auth0 JWT payload
 * @param {Object} userData - User data from Auth0 JWT
 * @param {string} userData.sub - Auth0 user ID
 * @param {string} userData.email - User email
 * @returns {Promise<Object>} Created/updated user object
 */
export async function createOrUpdateUser(userData) {
  const { sub, email } = userData;

  if (!sub || !email) {
    throw new Error("sub and email are required");
  }

  try {
    // Generate default display name
    const defaultDisplayName = `Player${Math.random()
      .toString(36)
      .substr(2, 5)}`;

    // Use random default profile icon (1-8)
    const defaultProfileIcon = Math.floor(Math.random() * 8) + 1;

    // Try to insert the user, or update if they already exist
    const query = `
      INSERT INTO users (sub, email, display_name, profile_icon, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (sub) 
      DO UPDATE SET 
        email = EXCLUDED.email,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [sub, email, defaultDisplayName, defaultProfileIcon];
    const { rows } = await pool.query(query, values);

    return rows[0];
  } catch (error) {
    console.error("Error creating/updating user:", error);
    throw new Error("Failed to create or update user");
  }
}

/**
 * Get user by Auth0 sub
 * @param {string} sub - Auth0 user ID
 * @returns {Promise<Object|null>} User object or null if not found
 */
export async function getUserBySub(sub) {
  if (!sub) {
    throw new Error("sub is required");
  }

  try {
    const query = "SELECT * FROM users WHERE sub = $1";
    const { rows } = await pool.query(query, [sub]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error getting user by sub:", error);
    throw new Error("Failed to get user");
  }
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null if not found
 */
export async function getUserByEmail(email) {
  if (!email) {
    throw new Error("email is required");
  }

  try {
    const query = "SELECT * FROM users WHERE email = $1";
    const { rows } = await pool.query(query, [email]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    throw new Error("Failed to get user");
  }
}

/**
 * Get user statistics (games played, wins, total score, etc.)
 * @param {string} sub - Auth0 user ID
 * @returns {Promise<Object>} User statistics
 */
export async function getUserStats(sub) {
  if (!sub) {
    throw new Error("sub is required");
  }

  try {
    const query = `
      SELECT 
        u.wordhunt_games_played,
        u.timebomb_games_played,
        (u.wordhunt_games_played + u.timebomb_games_played) as total_games_played,
        u.wordhunt_wins,
        u.timebomb_wins,
        (u.wordhunt_wins + u.timebomb_wins) as total_wins,
        0 as total_score,
        0 as average_score,
        0 as best_score,
        CASE 
          WHEN (u.wordhunt_games_played + u.timebomb_games_played) > 0 
          THEN ROUND((u.wordhunt_wins + u.timebomb_wins)::DECIMAL / (u.wordhunt_games_played + u.timebomb_games_played) * 100, 2)
          ELSE 0 
        END as overall_win_rate,
        CASE 
          WHEN u.wordhunt_games_played > 0 
          THEN ROUND(u.wordhunt_wins::DECIMAL / u.wordhunt_games_played * 100, 2)
          ELSE 0 
        END as wordhunt_win_rate,
        CASE 
          WHEN u.timebomb_games_played > 0 
          THEN ROUND(u.timebomb_wins::DECIMAL / u.timebomb_games_played * 100, 2)
          ELSE 0 
        END as timebomb_win_rate
      FROM users u
      WHERE u.sub = $1
    `;

    const { rows } = await pool.query(query, [sub]);
    const result = rows[0] || {
      wordhunt_games_played: 0,
      timebomb_games_played: 0,
      total_games_played: 0,
      wordhunt_wins: 0,
      timebomb_wins: 0,
      total_wins: 0,
      total_score: 0,
      average_score: 0,
      best_score: 0,
      overall_win_rate: 0,
      wordhunt_win_rate: 0,
      timebomb_win_rate: 0,
    };

    // Ensure win rate fields are always present, even if they're 0
    if (
      result.overall_win_rate === null ||
      result.overall_win_rate === undefined
    ) {
      result.overall_win_rate = 0;
    }
    if (
      result.wordhunt_win_rate === null ||
      result.wordhunt_win_rate === undefined
    ) {
      result.wordhunt_win_rate = 0;
    }
    if (
      result.timebomb_win_rate === null ||
      result.timebomb_win_rate === undefined
    ) {
      result.timebomb_win_rate = 0;
    }

    return result;
  } catch (error) {
    console.error("Error getting user stats:", error);
    throw new Error("Failed to get user statistics");
  }
}

/**
 * Update user win count for a specific game type
 * @param {string} sub - Auth0 user ID
 * @param {string} gameType - 'wordhunt' or 'timebomb'
 * @returns {Promise<Object>} Updated user stats
 */
export async function updateUserWinCount(sub, gameType) {
  if (!sub) {
    throw new Error("sub is required");
  }

  if (!["wordhunt", "timebomb"].includes(gameType)) {
    throw new Error("gameType must be 'wordhunt' or 'timebomb'");
  }

  try {
    const winColumn = `${gameType}_wins`;
    const query = `
      UPDATE users 
      SET ${winColumn} = ${winColumn} + 1,
          updated_at = NOW()
      WHERE sub = $1
      RETURNING *
    `;

    const { rows } = await pool.query(query, [sub]);

    if (rows.length === 0) {
      throw new Error("User not found");
    }

    return rows[0];
  } catch (error) {
    console.error("Error updating user win count:", error);
    throw new Error("Failed to update user win count");
  }
}

/**
 * Update user games played count for a specific game type
 * @param {string} sub - Auth0 user ID
 * @param {string} gameType - 'wordhunt' or 'timebomb'
 * @returns {Promise<Object>} Updated user stats
 */
export async function updateUserGamesPlayed(sub, gameType) {
  if (!sub) {
    throw new Error("sub is required");
  }

  if (!["wordhunt", "timebomb"].includes(gameType)) {
    throw new Error("gameType must be 'wordhunt' or 'timebomb'");
  }

  try {
    const gamesColumn = `${gameType}_games_played`;
    const query = `
      UPDATE users 
      SET ${gamesColumn} = ${gamesColumn} + 1,
          updated_at = NOW()
      WHERE sub = $1
      RETURNING *
    `;

    const { rows } = await pool.query(query, [sub]);

    if (rows.length === 0) {
      throw new Error("User not found");
    }

    return rows[0];
  } catch (error) {
    console.error("Error updating user games played:", error);
    throw new Error("Failed to update user games played");
  }
}

/**
 * Get user statistics for a specific game type
 * @param {string} sub - Auth0 user ID
 * @param {string} gameType - 'wordhunt' or 'timebomb'
 * @returns {Promise<Object>} Game-specific user statistics
 */
export async function getUserGameStats(sub, gameType) {
  if (!sub) {
    throw new Error("sub is required");
  }

  if (!["wordhunt", "timebomb"].includes(gameType)) {
    throw new Error("gameType must be 'wordhunt' or 'timebomb'");
  }

  try {
    const gamesColumn = `${gameType}_games_played`;
    const winsColumn = `${gameType}_wins`;

    const query = `
      SELECT 
        u.${gamesColumn} as games_played,
        u.${winsColumn} as wins,
        CASE 
          WHEN u.${gamesColumn} > 0 
          THEN ROUND(u.${winsColumn}::DECIMAL / u.${gamesColumn} * 100, 2)
          ELSE 0 
        END as win_rate,
        COALESCE(SUM(gs.score), 0) as total_score,
        COALESCE(AVG(gs.score), 0) as average_score,
        COALESCE(MAX(gs.score), 0) as best_score
      FROM users u
      LEFT JOIN game_scores gs ON u.sub = gs.player_id
      WHERE u.sub = $1
      GROUP BY u.sub, u.${gamesColumn}, u.${winsColumn}
    `;

    const { rows } = await pool.query(query, [sub]);
    return (
      rows[0] || {
        games_played: 0,
        wins: 0,
        win_rate: 0,
        total_score: 0,
        average_score: 0,
        best_score: 0,
      }
    );
  } catch (error) {
    console.error("Error getting user game stats:", error);
    throw new Error("Failed to get user game statistics");
  }
}

/**
 * Update user profile information (display name and profile icon)
 * @param {string} sub - Auth0 user ID
 * @param {Object} profileData - Profile data to update
 * @param {string} [profileData.display_name] - New display name
 * @param {number} [profileData.profile_icon] - New profile icon number (1-8)
 * @returns {Promise<Object>} Updated user object
 */
export async function updateUserProfile(sub, profileData) {
  if (!sub) {
    throw new Error("sub is required");
  }

  const { display_name, profile_icon } = profileData;

  if (!display_name && !profile_icon) {
    throw new Error(
      "At least one field (display_name or profile_icon) must be provided"
    );
  }

  try {
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (display_name) {
      updateFields.push(`display_name = $${paramCount}`);
      values.push(display_name);
      paramCount++;
    }

    if (profile_icon) {
      // Validate icon number is between 1 and 8
      if (
        typeof profile_icon !== "number" ||
        profile_icon < 1 ||
        profile_icon > 8
      ) {
        throw new Error("Profile icon must be a number between 1 and 8");
      }
      updateFields.push(`profile_icon = $${paramCount}`);
      values.push(profile_icon);
      paramCount++;
    }

    values.push(sub); // Add sub as the last parameter

    const query = `
      UPDATE users 
      SET ${updateFields.join(", ")}, updated_at = NOW()
      WHERE sub = $${paramCount}
      RETURNING *
    `;

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      throw new Error("User not found");
    }

    return rows[0];
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw new Error("Failed to update user profile");
  }
}

/**
 * Get leaderboard data for all users
 * @param {string} [gameType='overall'] - 'overall', 'wordhunt', or 'timebomb'
 * @param {number} [limit=50] - Maximum number of players to return
 * @returns {Promise<Array>} Array of player leaderboard data
 */
export async function getLeaderboard(gameType = "overall", limit = 50) {
  if (!["overall", "wordhunt", "timebomb"].includes(gameType)) {
    throw new Error("gameType must be 'overall', 'wordhunt', or 'timebomb'");
  }

  try {
    let orderBy;
    let selectFields;

    switch (gameType) {
      case "wordhunt":
        orderBy = "u.wordhunt_wins DESC";
        selectFields = "u.wordhunt_wins as wins";
        break;
      case "timebomb":
        orderBy = "u.timebomb_wins DESC";
        selectFields = "u.timebomb_wins as wins";
        break;
      default: // overall
        orderBy = "(u.wordhunt_wins + u.timebomb_wins) DESC";
        selectFields = "(u.wordhunt_wins + u.timebomb_wins) as wins";
        break;
    }

    const query = `
      SELECT 
        u.sub,
        u.display_name as name,
        u.profile_icon as avatar,
        u.wordhunt_wins,
        u.timebomb_wins,
        u.wordhunt_games_played,
        u.timebomb_games_played,
        (u.wordhunt_wins + u.timebomb_wins) as overall_wins,
        (u.wordhunt_games_played + u.timebomb_games_played) as overall_games_played,
        ${selectFields},
        CASE 
          WHEN (u.wordhunt_games_played + u.timebomb_games_played) > 0 
          THEN ROUND((u.wordhunt_wins + u.timebomb_wins)::DECIMAL / (u.wordhunt_games_played + u.timebomb_games_played) * 100, 2)
          ELSE 0 
        END as overall_win_rate,
        CASE 
          WHEN u.wordhunt_games_played > 0 
          THEN ROUND(u.wordhunt_wins::DECIMAL / u.wordhunt_games_played * 100, 2)
          ELSE 0 
        END as wordhunt_win_rate,
        CASE 
          WHEN u.timebomb_games_played > 0 
          THEN ROUND(u.timebomb_wins::DECIMAL / u.timebomb_games_played * 100, 2)
          ELSE 0 
        END as timebomb_win_rate
      FROM users u
      WHERE (u.wordhunt_wins > 0 OR u.timebomb_wins > 0)
      ORDER BY ${orderBy}
      LIMIT $1
    `;

    const { rows } = await pool.query(query, [limit]);
    return rows;
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    throw new Error("Failed to get leaderboard data");
  }
}

/**
 * Extract user data from Auth0 JWT payload
 * @param {Object} authPayload - Auth0 JWT payload
 * @returns {Object} Normalized user data
 */
export async function extractUserFromAuth0(authPayload, accessToken) {
  if (!authPayload || !authPayload.sub) {
    throw new Error("Invalid Auth0 payload");
  }

  // If email is in the payload, use it
  if (authPayload.email) {
    return {
      sub: authPayload.sub,
      email: authPayload.email,
    };
  }

  // Check if user already exists in database to avoid hitting Auth0 rate limits
  try {
    const existingUser = await getUserBySub(authPayload.sub);
    if (existingUser && existingUser.email) {
      return {
        sub: authPayload.sub,
        email: existingUser.email,
      };
    }
  } catch (error) {}

  // Only fetch from Auth0 if we don't have the user in our database
  if (!accessToken) {
    throw new Error("Access token required to fetch user email");
  }

  try {
    const response = await fetch(
      `https://${process.env.AUTH0_DOMAIN}/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status}`);
    }

    const userInfo = await response.json();

    return {
      sub: authPayload.sub,
      email: userInfo.email,
    };
  } catch (error) {
    console.error("Error fetching user info:", error);
    throw new Error("Failed to fetch user email from Auth0");
  }
}
