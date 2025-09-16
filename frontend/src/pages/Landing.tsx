// src/pages/Landing.tsx

import React, { useState } from "react";
// import { Switch } from "@/components/ui/switch";
import { Link, useNavigate } from "react-router-dom";

import banner from "../assets/images/jumble_banner.png";
import wordhunter from "../assets/images/wordhunter.png";
import timebomb from "../assets/images/timebomb.png";

const games = [
  {
    id: 1,
    title: "Word Hunter",
    image: wordhunter,
  },
  {
    id: 2,
    title: "Timebomb",
    image: timebomb,
  },
];

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [isCreatingLobby, setIsCreatingLobby] = useState(false);
  const [isJoiningLobby, setIsJoiningLobby] = useState(false);
  const [selectedGame, setSelectedGame] = useState<number | null>(null);

  const handleCreateLobby = async () => {
    if (selectedGame === null) {
      alert("Please select a game first!");
      return;
    }

    setIsCreatingLobby(true);
    try {
      const response = await fetch("http://localhost:3000/lobbies/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: "u_owner_" + Math.random().toString(36).slice(2, 8),
          ownerName: "OwnerName",
          gameType: selectedGame, // Include the selected game type
        }),
      });
      const data = await response.json();

      // Set owner data and navigate to lobby
      localStorage.setItem("isOwner", "true");
      localStorage.setItem("playerId", data.ownerId);
      localStorage.setItem("playerName", "OwnerName");
      localStorage.setItem("roomCode", data.roomCode);

      navigate(`/lobby/${data.roomCode}`);
    } catch (error) {
      console.error("Error creating lobby:", error);
      alert("Error creating lobby. Please try again.");
    } finally {
      setIsCreatingLobby(false);
    }
  };

  const handleJoinLobby = async () => {
    if (!roomCode) {
      alert("Please enter a room code!");
      return;
    }

    setIsJoiningLobby(true);
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

      navigate(`/lobby/${roomCode}`);
    } catch (error) {
      console.error("Error joining lobby:", error);
      alert("Error joining lobby. Please check the room code and try again.");
    } finally {
      setIsJoiningLobby(false);
    }
  };

  return (
    <div>
      <div className="mx-auto w-8/12 pt-8 3xl:w-7/12">
        <div className="flex flex-col-reverse items-center lg:flex-row lg:justify-between">
          <div className="mt-4 space-y-2 text-center font-adlam text-4xl text-white sm:text-center sm:text-5xl md:mt-0 md:text-5xl lg:w-5/12 lg:text-start lg:text-4xl xl:text-5xl 2xl:text-6xl 3xl:text-7xl">
            <div>Party Games, Anywhere.</div>
            <div className="text-nowrap text-center text-sm sm:text-center sm:text-base lg:text-start 2xl:text-2xl">
              Play with Friends or Against AI opponents
            </div>
          </div>
          <img className="w-full md:w-9/12 lg:w-6/12 xl:w-5/12" src={banner} />
        </div>
      </div>

      <div className="mx-auto w-10/12 pb-12 pt-8 sm:w-8/12 sm:pb-40 xl:pb-24 3xl:w-7/12">
        <div className="flex flex-col items-center justify-center gap-8 font-adlam lg:flex-row xl:justify-between">
          {/* Game Selector */}
          <div className="mt-4 rounded-3xl bg-[#b1dfbc] px-8 shadow-2xl lg:w-7/12 2xl:px-16">
            <label className="inline-block w-full py-4 text-center align-middle text-2xl text-[#01685e] lg:text-start">
              Choose a Game
            </label>
            <div className="grid w-full grid-cols-2 gap-4 md:px-8 lg:grid-cols-2 lg:px-0">
              {games.map((game) => (
                <div
                  key={game.id}
                  onClick={() => setSelectedGame(game.id)}
                  className={`flex cursor-pointer flex-col items-center rounded-lg p-2 shadow-xl transition duration-150 ease-in-out sm:px-2 sm:py-4 lg:px-0 ${
                    selectedGame === game.id
                      ? "bg-[#01685e] text-white"
                      : "bg-[#fcf8cf]"
                  }`}
                >
                  <img
                    src={game.image}
                    alt={game.title}
                    className="rounded-md object-contain sm:w-9/12 md:w-8/12"
                  />
                  <h3 className="w-full text-nowrap text-center text-xs sm:text-base sm:text-lg lg:text-sm xl:text-lg 2xl:text-xl">
                    {game.title}
                  </h3>
                </div>
              ))}
            </div>

            <div className="pb-10">
              {/* Play Solo FEATURE FOR THE FUTURE*/}
              {/* <div className="mt-6 flex w-full justify-between px-4">
                <label>Play Solo</label>
                <Switch />
              </div>
              <div className="mt-2 w-full px-4 text-xs font-light text-gray-600 hover:cursor-default sm:text-base">
                You will be matched against an AI player. No account necessary!
              </div> */}
              <div className="mt-4 flex w-full justify-center">
                <button
                  onClick={handleCreateLobby}
                  disabled={isCreatingLobby || selectedGame === null}
                  className="w-full rounded-xl bg-[#01685e] px-4 py-3 text-white transition duration-150 ease-in-out hover:bg-[#014d47] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreatingLobby
                    ? "Creating..."
                    : selectedGame === null
                      ? "Select a Game First"
                      : "Create Lobby"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Side (Join + Leaderboard) */}
          <div className="flex w-full flex-col justify-center gap-6 md:flex-row lg:w-4/12 lg:flex-col">
            {/* Join Room */}
            <div className="flex w-full flex-col space-y-2 rounded-3xl bg-[#01685e] px-6 pb-6 shadow-xl">
              <label className="mt-4 inline-block align-middle text-xl text-white">
                Join a Room
              </label>
              <div className="flex h-14 w-full flex-row rounded-xl bg-[#febd4f] lg:space-y-0">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="9999"
                  maxLength={4}
                  value={roomCode}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow numbers and limit to 4 digits
                    if (/^\d*$/.test(value) && value.length <= 4) {
                      setRoomCode(value);
                    }
                  }}
                  className="no-spinners h-full w-11/12 appearance-none rounded-xl bg-[#febd4f] pl-4 text-[#876124] placeholder-[#876124] shadow-sm outline-none"
                  placeholder="Enter Code"
                />
                <button
                  onClick={handleJoinLobby}
                  disabled={isJoiningLobby}
                  className="h-full w-3/6 rounded-2xl rounded-r-xl bg-[#ffa93d] text-[#876124] transition duration-150 ease-in-out hover:brightness-90 disabled:opacity-50"
                >
                  {isJoiningLobby ? "Joining..." : "Join"}
                </button>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="flex w-full flex-col space-y-2 rounded-3xl bg-[#01685e] px-6 pb-6 shadow-xl">
              <label className="mt-4 inline-block w-1/2 align-middle text-xl text-white">
                Leaderboards
              </label>
              <div className="flex h-14 w-full flex-col space-y-2 rounded-xl bg-[#febd4f] transition-all duration-200 ease-in-out hover:brightness-90 lg:flex-row lg:space-y-0">
                <Link
                  to="/leaderboard"
                  className="flex h-full w-full items-center justify-center rounded-2xl rounded-r-xl text-[#876124] transition duration-150 ease-in-out hover:brightness-90"
                >
                  View
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
