// src/pages/games/LobbyPage.tsx

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLobbySocket } from "@/hooks/useLobbySocket";

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>(); // route like /lobby/:code
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);

  const isOwner = localStorage.getItem("isOwner") === "true";
  const playerId = localStorage.getItem("playerId");

  const { snapshot } = useLobbySocket(code || "", {
    onClosed: ({ gameId }) => {
      console.log("Lobby closed, navigating to game:", gameId);
      // navigate all players to the game screen
      navigate(`/wordhunter/${gameId}`);
    },
  });

  const handleStartGame = async () => {
    if (!code || isStarting) return;

    setIsStarting(true);
    try {
      const response = await fetch(
        `http://localhost:3000/lobbies/${code}/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerId: playerId }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to start game");
      }

      const data = await response.json();
      console.log("Game started:", data);
      // The onClosed callback will handle navigation
    } catch (error) {
      console.error("Error starting game:", error);
      setIsStarting(false);
    }
  };

  if (!snapshot) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Loading Lobby...</h1>
          <p className="text-gray-600">Room Code: {code}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white">Lobby</h1>
          <p className="text-xl text-blue-200">Room Code: {code}</p>
          <p className="text-lg text-gray-300">
            Status: {snapshot.status || "Waiting for players..."}
          </p>
        </div>

        {/* Players List */}
        <div className="mb-8 rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-2xl font-semibold text-white">
            Players ({snapshot.members?.length || 0}/8)
          </h2>
          <div className="space-y-3">
            {snapshot.members?.map((id) => (
              <div
                key={id}
                className={`flex items-center rounded-lg p-3 ${
                  id === playerId
                    ? "border-2 border-green-400 bg-green-500/20"
                    : "bg-white/10"
                }`}
              >
                <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 font-bold text-white">
                  {snapshot.names?.[id]?.charAt(0) || id.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">
                    {snapshot.names?.[id] || id}
                  </p>
                  {id === playerId && (
                    <p className="text-sm text-green-300">(You)</p>
                  )}
                </div>
                {id === snapshot.ownerId && (
                  <span className="rounded-full bg-yellow-500 px-3 py-1 text-xs font-bold text-yellow-900">
                    Owner
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Start Game Button */}
        {isOwner && (
          <div className="text-center">
            <button
              onClick={handleStartGame}
              disabled={isStarting || (snapshot.members?.length || 0) < 1}
              className="rounded-xl bg-green-600 px-8 py-4 text-xl font-bold text-white transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-500"
            >
              {isStarting ? "Starting Game..." : "Start Game"}
            </button>
            {(snapshot.members?.length || 0) < 1 && (
              <p className="mt-2 text-sm text-yellow-300">
                Need at least 1 player to start
              </p>
            )}
          </div>
        )}

        {/* Non-owner message */}
        {!isOwner && (
          <div className="text-center">
            <p className="text-lg text-gray-300">
              Waiting for the owner to start the game...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
