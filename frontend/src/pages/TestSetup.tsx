// src/pages/TestSetup.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function TestSetup() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [gameId, setGameId] = useState("");

  const setupOwner = () => {
    localStorage.setItem("roomCode", roomCode);
    localStorage.setItem("isOwner", "true");
    localStorage.setItem("playerId", "u_owner");
    localStorage.setItem("playerName", "OwnerName");
    alert("Owner setup complete! Check localStorage in DevTools.");
  };

  const setupGuest = () => {
    localStorage.setItem("roomCode", roomCode);
    localStorage.setItem("isOwner", "false");
    localStorage.setItem("playerId", "u_guest1");
    localStorage.setItem("playerName", "Guest 1");
    alert("Guest setup complete! Check localStorage in DevTools.");
  };

  const goToLobby = () => {
    if (!roomCode) {
      alert("Enter room code first!");
      return;
    }
    navigate(`/lobby/${roomCode}`);
  };

  const goToGame = () => {
    if (!gameId) {
      alert("Enter game ID first!");
      return;
    }
    navigate(`/wordhunter/${gameId}`);
  };

  const createLobby = async () => {
    try {
      const response = await fetch("http://localhost:3000/lobbies/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: "u_owner_" + Math.random().toString(36).slice(2, 8),
          ownerName: "OwnerName",
        }),
      });
      const data = await response.json();
      setRoomCode(data.roomCode);
      setGameId(data.gameId);

      // Set owner data and navigate to lobby
      localStorage.setItem("isOwner", "true");
      localStorage.setItem("playerId", data.ownerId);
      localStorage.setItem("playerName", "OwnerName");
      localStorage.setItem("roomCode", data.roomCode);

      alert(`Lobby created! Redirecting to lobby...`);
      navigate(`/lobby/${data.roomCode}`);
    } catch (error) {
      alert("Error creating lobby: " + error);
    }
  };

  const joinLobby = async () => {
    if (!roomCode) {
      alert("Enter room code first!");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3000/lobbies/${roomCode}/join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId: "u_guest_" + Math.random().toString(36).slice(2, 8),
            name: "Guest-" + Math.random().toString(36).slice(2, 6),
          }),
        },
      );
      const data = await response.json();

      // Set guest data and navigate to lobby
      localStorage.setItem("isOwner", "false");
      localStorage.setItem("playerId", data.joined);
      localStorage.setItem("playerName", data.name || "Guest");
      localStorage.setItem("roomCode", roomCode);

      alert(`Joined lobby! Redirecting...`);
      navigate(`/lobby/${roomCode}`);
    } catch (error) {
      alert("Error joining lobby: " + error);
    }
  };

  const clearStorage = () => {
    localStorage.clear();
    alert("localStorage cleared!");
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Test Setup Helper</h1>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Room Code:</label>
          <input
            type="text"
            value={roomCode || ""}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="e.g., 7704"
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Game ID:</label>
          <input
            type="text"
            value={gameId || ""}
            onChange={(e) => setGameId(e.target.value)}
            placeholder="e.g., g_70fa37"
            className="w-full rounded border p-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={createLobby}
            className="rounded bg-blue-500 p-3 text-white hover:bg-blue-600"
          >
            Create Lobby (Owner)
          </button>
          <button
            onClick={joinLobby}
            className="rounded bg-green-500 p-3 text-white hover:bg-green-600"
          >
            Join Lobby (Guest)
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={setupOwner}
            className="rounded bg-purple-500 p-3 text-white hover:bg-purple-600"
          >
            Setup as Owner (Manual)
          </button>
          <button
            onClick={setupGuest}
            className="rounded bg-orange-500 p-3 text-white hover:bg-orange-600"
          >
            Setup as Guest (Manual)
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={goToLobby}
            className="rounded bg-indigo-500 p-3 text-white hover:bg-indigo-600"
          >
            Go to Lobby
          </button>
          <button
            onClick={goToGame}
            className="rounded bg-yellow-500 p-3 text-white hover:bg-yellow-600"
          >
            Go to Game
          </button>
        </div>

        <button
          onClick={clearStorage}
          className="w-full rounded bg-red-500 p-3 text-white hover:bg-red-600"
        >
          Clear localStorage
        </button>

        <div className="mt-6 rounded bg-gray-100 p-4">
          <h3 className="mb-2 font-bold">Current localStorage:</h3>
          <pre className="text-sm">
            {JSON.stringify(
              {
                roomCode: localStorage.getItem("roomCode"),
                isOwner: localStorage.getItem("isOwner"),
                playerId: localStorage.getItem("playerId"),
                playerName: localStorage.getItem("playerName"),
              },
              null,
              2,
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
