// src/hooks/useLobbySocket.ts

import { useEffect, useState, useCallback } from "react";
import { socket } from "@/lib/socket";
import type { LobbySnapshot, GameStarted } from "@/types/realtime";

type UseLobbySocketOpts = {
  onClosed?: (payload: { roomCode: string; gameId: string }) => void;
  onReopened?: (payload: { roomCode: string }) => void;
  onGameStartedInLobby?: (payload: GameStarted) => void; // also emit game:started to lobby
};

export function useLobbySocket(
  roomCode: string | undefined,
  opts: UseLobbySocketOpts = {},
) {
  const [snapshot, setSnapshot] = useState<LobbySnapshot | null>(null);

  const join = useCallback(() => {
    if (!roomCode) return;
    socket.emit("lobby:join", { roomCode });
  }, [roomCode]);

  const leave = useCallback(() => {
    if (!roomCode) return;
    socket.emit("lobby:leave", { roomCode });
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode) return;

    // Join the lobby room
    join();

    // Fetch the current lobby state as a fallback (only once)
    const fetchLobbyState = async () => {
      try {
        const response = await fetch(
          `http://localhost:3000/lobbies/${roomCode}`,
        );
        if (response.ok) {
          const data = await response.json();
          setSnapshot(data);
        }
      } catch (error) {
        console.error("Failed to fetch lobby state:", error);
      }
    };

    // Fetch lobby state after a short delay (only if socket doesn't provide data)
    const timeoutId = setTimeout(() => {
      if (!snapshot) {
        fetchLobbyState();
      }
    }, 1000);

    const onUpdate = (d: LobbySnapshot) => {
      if (d.roomCode === roomCode) {
        setSnapshot(d);
      }
    };
    const onClosed = (d: { roomCode: string; gameId: string }) => {
      if (d.roomCode === roomCode) opts.onClosed?.(d);
    };
    const onReopened = (d: { roomCode: string }) => {
      if (d.roomCode === roomCode) opts.onReopened?.(d);
    };
    const onGameStarted = (d: GameStarted) => {
      console.log("Lobby socket received game:started:", d);
      // some UIs may want to see board/timers without switching page yet
      opts.onGameStartedInLobby?.(d);
    };

    socket.on("lobby:update", onUpdate);
    socket.on("lobby:closed", onClosed);
    socket.on("lobby:reopened", onReopened);
    socket.on("game:started", onGameStarted); // emit this to the lobby as well

    return () => {
      clearTimeout(timeoutId);
      leave();
      socket.off("lobby:update", onUpdate);
      socket.off("lobby:closed", onClosed);
      socket.off("lobby:reopened", onReopened);
      socket.off("game:started", onGameStarted);
    };
  }, [roomCode, join, leave, opts]);
  return { snapshot, join, leave };
}
