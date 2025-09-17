// routes/users.routes.js
// User profile and management routes

import express from "express";
import { requireAuth, checkJwt, extractUser } from "../auth.js";
import {
  getUserStats,
  updateUserProfile,
  getLeaderboard,
} from "../services/user.service.js";

const router = express.Router();

// Get current user's profile and statistics
router.get(
  "/me",
  checkJwt,
  extractUser,
  requireAuth,
  async (req, res, next) => {
    try {
      console.log(
        `📊 GET /users/me (with stats) - User: ${req.user?.sub || "Unknown"}`
      );

      const stats = await getUserStats(req.user.sub);

      res.json({
        success: true,
        user: {
          ...req.user,
          stats,
        },
      });
    } catch (error) {
      console.error(`❌ GET /users/me (with stats) - Error:`, error.message);
      next(error);
    }
  }
);

// Get leaderboard data
router.get(
  "/leaderboard",
  checkJwt,
  extractUser,
  requireAuth,
  async (req, res, next) => {
    try {
      const { gameType = "overall", limit = 50 } = req.query;

      console.log(
        `🏆 GET /users/leaderboard - GameType: ${gameType}, Limit: ${limit}`
      );

      if (!["overall", "wordhunt", "timebomb"].includes(gameType)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid gameType. Must be 'overall', 'wordhunt', or 'timebomb'",
        });
      }

      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: "Limit must be a number between 1 and 100",
        });
      }

      const leaderboard = await getLeaderboard(gameType, limitNum);

      res.json({
        success: true,
        gameType,
        players: leaderboard,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update current user's profile
router.put(
  "/me",
  checkJwt,
  extractUser,
  requireAuth,
  async (req, res, next) => {
    try {
      console.log(`✏️ PUT /users/me - User: ${req.user?.sub || "Unknown"}`);

      const { display_name, profile_picture } = req.body;

      if (!display_name && !profile_picture) {
        return res.status(400).json({
          success: false,
          message:
            "At least one field (display_name or profile_picture) must be provided",
        });
      }

      // Validate display_name if provided
      if (
        display_name &&
        (typeof display_name !== "string" || display_name.trim().length === 0)
      ) {
        return res.status(400).json({
          success: false,
          message: "Display name must be a non-empty string",
        });
      }

      // Validate profile_picture if provided
      if (profile_picture && typeof profile_picture !== "string") {
        return res.status(400).json({
          success: false,
          message: "Profile picture must be a string",
        });
      }

      const updatedUser = await updateUserProfile(req.user.sub, {
        display_name: display_name?.trim(),
        profile_picture,
      });

      res.json({
        success: true,
        user: updatedUser,
      });
    } catch (error) {
      console.error(`❌ PUT /users/me - Error:`, error.message);
      next(error);
    }
  }
);

export default router;
