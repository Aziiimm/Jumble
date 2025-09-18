// src/services/authenticatedApi.ts

import { buildApiUrl } from "../config/api";
import { useAuth0 } from "@auth0/auth0-react";

// Custom hook for authenticated API calls
export function useAuthenticatedApi() {
  const { getAccessTokenSilently } = useAuth0();

  const makeAuthenticatedRequest = async (
    endpoint: string,
    options: RequestInit = {},
  ) => {
    try {
      const token = await getAccessTokenSilently();
      const url = buildApiUrl(endpoint);

      const defaultHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`,
        );
      }

      return response.json();
    } catch (error) {
      console.error("Authenticated API request failed:", error);
      throw error;
    }
  };

  return { makeAuthenticatedRequest };
}

// Utility functions for common API calls
export const createAuthenticatedApiFunctions = (
  getAccessTokenSilently: () => Promise<string>,
) => {
  const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
    const token = await getAccessTokenSilently();
    const url = buildApiUrl(endpoint);

    const defaultHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  };

  return {
    // Lobby API calls
    createLobby: () => makeRequest("/lobbies", { method: "POST" }),

    joinLobby: (roomCode: string) =>
      makeRequest(`/lobbies/${roomCode}/join`, { method: "POST" }),

    startLobby: (roomCode: string) =>
      makeRequest(`/lobbies/${roomCode}/start`, { method: "POST" }),

    reopenLobby: (roomCode: string) =>
      makeRequest(`/lobbies/${roomCode}/reopen`, { method: "POST" }),

    getLobby: (roomCode: string) => makeRequest(`/lobbies/${roomCode}`),

    // Game API calls
    submitWord: (gameId: string, path: number[][]) =>
      makeRequest(`/games/${gameId}/submit`, {
        method: "POST",
        body: JSON.stringify({ path }),
      }),

    finishGame: (gameId: string) =>
      makeRequest(`/games/${gameId}/finish`, { method: "POST" }),

    getGameState: (gameId: string) => makeRequest(`/games/${gameId}/state`),

    // User API calls
    getUserProfile: () => makeRequest("/users/me"),

    updateUserProfile: (profileData: {
      display_name?: string;
      profile_icon?: number;
    }) =>
      makeRequest("/users/me", {
        method: "PUT",
        body: JSON.stringify(profileData),
      }),

    getLeaderboard: (gameType?: string) => {
      const params = gameType ? `?gameType=${gameType}` : "";
      return makeRequest(`/users/leaderboard${params}`);
    },
  };
};
