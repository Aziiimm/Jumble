// /src/types/realtime.ts

export type LobbySnapshot = {
  roomCode: string;
  status: "open" | "closed";
  ownerId: string;
  members: string[];
  names: Record<string, string>;
  icons: Record<string, number>;
};

export type GameStarted = {
  gameId: string;
  board: string[][];
  players: string[];
  names: Record<string, string>;
  icons: Record<string, number>;
  scores: Record<string, number>;
  startTs: number;
  durationSec: number;
};

export type GameScore = {
  gameId: string;
  playerId: string;
  word: string;
  points: number;
  scores: Record<string, number>;
};

export type GameEnded = {
  gameId: string;
  endTs: number;
  scores: Record<string, number>;
  names: Record<string, string>;
  icons: Record<string, number>;
};
