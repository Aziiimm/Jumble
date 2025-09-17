// src/hooks/useGameSocket.ts

import { useEffect, useState, useCallback } from "react";
import { socket } from "@/lib/socket";
import { buildApiUrl } from "@/config/api";
import type { GameStarted, GameScore, GameEnded } from "@/types/realtime";

type UseGameSocketOpts = {
  onStarted?: (payload: GameStarted) => void;
  onScore?: (payload: GameScore) => void;
  onEnded?: (payload: GameEnded) => void;
};

export function useGameSocket(
  gameId: string | undefined,
  opts: UseGameSocketOpts = {},
) {
  const [started, setStarted] = useState<GameStarted | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});

  const join = useCallback(() => {
    if (!gameId) return;
    socket.emit("game:join", { gameId });
  }, [gameId]);

  const leave = useCallback(() => {
    if (!gameId) return;
    socket.emit("game:leave", { gameId });
  }, [gameId]);

  const onStarted = useCallback(
    (d: GameStarted) => {
      if (d.gameId !== gameId) return;
      setStarted(d);
      setScores(d.scores || {});
      opts.onStarted?.(d);
    },
    [gameId, opts.onStarted],
  );

  const onScore = useCallback(
    (d: GameScore) => {
      if (d.gameId !== gameId) return;
      setScores(d.scores || {});
      opts.onScore?.(d);
    },
    [gameId, opts.onScore],
  );

  const onEnded = useCallback(
    (d: GameEnded) => {
      if (d.gameId !== gameId) return;
      opts.onEnded?.(d);
    },
    [gameId, opts.onEnded],
  );

  useEffect(() => {
    if (!gameId) return;
    join();

    // Fallback: fetch game state directly if socket event is missed
    const fetchGameState = async () => {
      try {
        const response = await fetch(buildApiUrl(`/games/${gameId}/state`));
        if (response.ok) {
          const data = await response.json();
          if (data.status === "running" && data.board) {
            setStarted({
              gameId: data.gameId || gameId,
              board: data.board,
              players: data.players || [],
              names: data.names || {},
              scores: data.scores || {},
              startTs: data.startTs || Date.now(),
              durationSec: data.durationSec || 80,
            });
            setScores(data.scores || {});
          }
        }
      } catch (error) {
        console.error("Failed to fetch game state:", error);
      }
    };

    // Try to fetch game state after a short delay
    const timeoutId = setTimeout(fetchGameState, 1000);

    socket.on("game:started", onStarted);
    socket.on("game:score", onScore);
    socket.on("game:ended", onEnded);

    return () => {
      clearTimeout(timeoutId);
      leave();
      socket.off("game:started", onStarted);
      socket.off("game:score", onScore);
      socket.off("game:ended", onEnded);
    };
  }, [gameId, join, leave, onStarted, onScore, onEnded]);

  return { started, scores, join, leave };
}
