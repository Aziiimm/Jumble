// src/config/api.ts

// Use env vars if set, otherwise default to proxy path
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "/api";

// Check if we're in production and using direct backend connection
const isDirectBackendConnection =
  SOCKET_URL.includes("3.88.157.186") || SOCKET_URL.includes("localhost");

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
