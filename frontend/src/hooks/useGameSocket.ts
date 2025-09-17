// src/hooks/useGameSocket.ts

import { useEffect, useState, useCallback, useRef } from "react";
import { socket } from "@/lib/socket";
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

  // Use refs to store callbacks to prevent re-renders
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // Debug: Log when scores change (only when they actually change)
  useEffect(() => {
    if (Object.keys(scores).length > 0) {
    }
  }, [scores]);

  // Socket joining/leaving is now handled directly in useEffect

  const onStarted = useCallback(
    (d: GameStarted) => {
      if (d.gameId !== gameId) return;
      setStarted(d);
      setScores(d.scores || {});
      optsRef.current.onStarted?.(d);
    },
    [gameId],
  );

  const onScore = useCallback(
    (d: GameScore) => {
      if (d.gameId !== gameId) return;
      // Debug: Only log score updates when they actually change
      if (Object.keys(d.scores || {}).length > 0) {
      }
      setScores(d.scores || {});
      optsRef.current.onScore?.(d);
    },
    [gameId],
  );

  const onEnded = useCallback(
    (d: GameEnded) => {
      if (d.gameId !== gameId) return;
      optsRef.current.onEnded?.(d);
    },
    [gameId],
  );

  useEffect(() => {
    if (!gameId) return;

    // Join the game room
    socket.emit("game:join", { gameId });

    // Set up socket event listeners
    socket.on("game:started", onStarted);
    socket.on("game:score", onScore);
    socket.on("game:ended", onEnded);

    return () => {
      // Leave the game room
      socket.emit("game:leave", { gameId });

      // Remove event listeners
      socket.off("game:started", onStarted);
      socket.off("game:score", onScore);
      socket.off("game:ended", onEnded);
    };
  }, [gameId]); // Only depend on gameId, not the callback functions

  return { started, scores };
}
