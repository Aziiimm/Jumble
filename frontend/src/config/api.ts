// src/config/api.ts

// Environment-based API configuration
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

export const config = {
  api: {
    baseUrl: API_BASE_URL,
    endpoints: {
      games: `${API_BASE_URL}/games`,
      auth: `${API_BASE_URL}/auth`,
      users: `${API_BASE_URL}/users`,
      lobbies: `${API_BASE_URL}/lobbies`,
    },
  },
  socket: {
    url: SOCKET_URL,
  },
};

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

export default config;
