// src/hooks/useLobbySocket.ts

import { useEffect, useState, useCallback, useRef } from "react";
import { socket } from "@/lib/socket";
import { buildApiUrl } from "@/config/api";
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

  // Use refs to store callbacks to prevent re-renders
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!roomCode) return;

    // Join the lobby room
    socket.emit("lobby:join", { roomCode });

    // Fetch the current lobby state as a fallback (only once)
    const fetchLobbyState = async () => {
      try {
        const response = await fetch(buildApiUrl(`/lobbies/${roomCode}`));
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
      if (d.roomCode === roomCode) optsRef.current.onClosed?.(d);
    };
    const onReopened = (d: { roomCode: string }) => {
      if (d.roomCode === roomCode) {
        optsRef.current.onReopened?.(d);
      } else {
      }
    };
    const onGameStarted = (d: GameStarted) => {
      // some UIs may want to see board/timers without switching page yet
      optsRef.current.onGameStartedInLobby?.(d);
    };

    socket.on("lobby:update", onUpdate);
    socket.on("lobby:closed", onClosed);
    socket.on("lobby:reopened", onReopened);
    socket.on("game:started", onGameStarted); // emit this to the lobby as well

    return () => {
      clearTimeout(timeoutId);
      socket.emit("lobby:leave", { roomCode });
      socket.off("lobby:update", onUpdate);
      socket.off("lobby:closed", onClosed);
      socket.off("lobby:reopened", onReopened);
      socket.off("game:started", onGameStarted);
    };
  }, [roomCode]); // Only depend on roomCode
  return { snapshot };
}
