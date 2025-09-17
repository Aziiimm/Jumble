// src/services/api.ts

import { buildApiUrl } from "../config/api";

// Legacy functions - these will be replaced by authenticated versions
// Keeping for backward compatibility during transition

export async function submitWord(
  gameId: string,
  playerId: string,
  path: number[][],
) {
  const url = buildApiUrl(`/games/${gameId}/submit`);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, path }),
  });

  if (!res.ok) throw new Error(`submit failed: ${res.status}`);
  return res.json();
}

export async function finishGame(gameId: string) {
  const url = buildApiUrl(`/games/${gameId}/finish`);
  const res = await fetch(url, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`finish failed: ${res.status}`);
  return res.json();
}
