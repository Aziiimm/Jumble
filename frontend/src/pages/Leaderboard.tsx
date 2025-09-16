// src/pages/Leaderboard.tsx

import React, { useState } from "react";

type GameType = "overall" | "wordhunter" | "timebomb";

interface Player {
  id: number;
  name: string;
  overallWins: number;
  wordHunterWins: number;
  timebombWins: number;
  avatar?: string;
}

// Mock data
const mockPlayers: Player[] = [
  {
    id: 1,
    name: "WordMaster",
    overallWins: 45,
    wordHunterWins: 42,
    timebombWins: 3,
  },
  {
    id: 2,
    name: "SpeedDemon",
    overallWins: 38,
    wordHunterWins: 20,
    timebombWins: 18,
  },
  {
    id: 3,
    name: "PuzzlePro",
    overallWins: 32,
    wordHunterWins: 28,
    timebombWins: 4,
  },
  {
    id: 4,
    name: "GameChamp",
    overallWins: 29,
    wordHunterWins: 25,
    timebombWins: 4,
  },
  {
    id: 5,
    name: "VictoryKing",
    overallWins: 26,
    wordHunterWins: 22,
    timebombWins: 4,
  },
  {
    id: 6,
    name: "WordWizard",
    overallWins: 24,
    wordHunterWins: 24,
    timebombWins: 0,
  },
  {
    id: 7,
    name: "QuickDraw",
    overallWins: 21,
    wordHunterWins: 8,
    timebombWins: 13,
  },
  {
    id: 8,
    name: "BrainBox",
    overallWins: 19,
    wordHunterWins: 19,
    timebombWins: 0,
  },
  {
    id: 9,
    name: "FastFingers",
    overallWins: 17,
    wordHunterWins: 5,
    timebombWins: 12,
  },
  {
    id: 10,
    name: "LexiconLover",
    overallWins: 15,
    wordHunterWins: 15,
    timebombWins: 0,
  },
  {
    id: 11,
    name: "TimingTitan",
    overallWins: 13,
    wordHunterWins: 2,
    timebombWins: 11,
  },
  {
    id: 12,
    name: "VocabularyVic",
    overallWins: 12,
    wordHunterWins: 12,
    timebombWins: 0,
  },
  {
    id: 13,
    name: "BombSquad",
    overallWins: 11,
    wordHunterWins: 1,
    timebombWins: 10,
  },
  {
    id: 14,
    name: "LetterLegend",
    overallWins: 9,
    wordHunterWins: 9,
    timebombWins: 0,
  },
  {
    id: 15,
    name: "RapidRunner",
    overallWins: 8,
    wordHunterWins: 3,
    timebombWins: 5,
  },
];

const Leaderboard: React.FC = () => {
  const [filter, setFilter] = useState<GameType>("overall");

  const getSortedPlayers = () => {
    return [...mockPlayers].sort((a, b) => {
      switch (filter) {
        case "wordhunter":
          return b.wordHunterWins - a.wordHunterWins;
        case "timebomb":
          return b.timebombWins - a.timebombWins;
        default:
          return b.overallWins - a.overallWins;
      }
    });
  };

  const getPlayerWins = (player: Player) => {
    switch (filter) {
      case "wordhunter":
        return player.wordHunterWins;
      case "timebomb":
        return player.timebombWins;
      default:
        return player.overallWins;
    }
  };

  const sortedPlayers = getSortedPlayers();
  const topThree = sortedPlayers.slice(0, 3);

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-10/12 py-8 font-adlam text-white 2xl:w-8/12">
        {/* Header */}
        <div className="mb-6 text-center sm:mb-8">
          <h1 className="text-3xl font-bold text-white sm:text-5xl md:text-6xl">
            Leaderboards
          </h1>
          <p className="mt-2 text-base text-gray-300 sm:text-lg">
            See who's dominating the games!
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6 flex justify-center sm:mb-8">
          <div className="flex rounded-xl bg-[#01685e] p-1 shadow-xl">
            {[
              { key: "overall", label: "Overall" },
              { key: "wordhunter", label: "Word Hunter" },
              { key: "timebomb", label: "Timebomb" },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setFilter(option.key as GameType)}
                className={`rounded-lg px-3 py-2 text-sm transition duration-150 ease-in-out sm:px-6 sm:text-base ${
                  filter === option.key
                    ? "bg-[#febd4f] text-[#876124] shadow-lg"
                    : "text-white hover:bg-[#014d47]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:justify-between">
          {/* Top 3 Podium */}
          <div className="flex h-full flex-col lg:w-1/2">
            <h2 className="mb-4 text-center text-2xl font-bold text-white sm:mb-6 sm:text-3xl">
              Top 3
            </h2>
            <div className="h-full rounded-2xl bg-[#01685e] p-4 shadow-2xl sm:p-6">
              <div className="relative flex h-64 items-end justify-center gap-2 sm:h-80 sm:gap-3 md:h-96">
                {/* 2nd place */}
                {topThree[1] && (
                  <div className="relative flex h-full items-end">
                    <div className="relative h-1/2 w-24 rounded-t-xl bg-[#C0C0C0] p-2 text-white shadow-2xl sm:w-32 sm:rounded-t-2xl sm:p-3 md:w-40 md:p-4">
                      <div className="flex h-full flex-col items-center justify-center">
                        <div className="mb-1 text-lg sm:text-xl md:text-2xl">
                          🥈
                        </div>
                        <h3 className="text-center text-xs font-bold sm:text-sm md:text-lg">
                          {topThree[1].name}
                        </h3>
                        <p className="text-center text-xs opacity-80 sm:text-sm">
                          {getPlayerWins(topThree[1])} wins
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1st place */}
                {topThree[0] && (
                  <div className="relative flex h-full items-end">
                    <div className="relative h-full w-28 rounded-t-xl bg-[#FFD700] p-3 text-[#8B4513] shadow-2xl sm:w-36 sm:rounded-t-2xl sm:p-4 md:w-44 md:p-6">
                      <div className="flex h-full flex-col items-center justify-center">
                        <div className="mb-1 text-2xl sm:mb-2 sm:text-3xl md:text-4xl">
                          🥇
                        </div>
                        <h3 className="text-center text-sm font-bold sm:text-base md:text-xl">
                          {topThree[0].name}
                        </h3>
                        <p className="text-center text-xs opacity-80 sm:text-sm md:text-base">
                          {getPlayerWins(topThree[0])} wins
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3rd place */}
                {topThree[2] && (
                  <div className="relative flex h-full items-end">
                    <div className="relative h-1/3 w-20 rounded-t-xl bg-[#CD7F32] p-2 text-white shadow-2xl sm:w-28 sm:rounded-t-2xl sm:p-3 md:w-36 md:p-4">
                      <div className="flex h-full flex-col items-center justify-center">
                        <div className="mb-1 text-lg sm:text-xl md:text-2xl">
                          🥉
                        </div>
                        <h3 className="text-center text-xs font-bold sm:text-sm md:text-lg">
                          {topThree[2].name}
                        </h3>
                        <p className="text-center text-xs opacity-80 sm:text-sm">
                          {getPlayerWins(topThree[2])} wins
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Full Leaderboard */}
          <div className="flex h-full flex-col lg:w-1/2">
            <h2 className="mb-4 text-center text-2xl font-bold text-white sm:mb-6 sm:text-3xl">
              All Players
            </h2>
            <div className="h-full rounded-2xl bg-[#01685e] p-4 shadow-2xl sm:p-6">
              <div className="scrollbar-hide h-64 space-y-2 overflow-y-auto sm:h-80 md:h-96">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-xl bg-[#fcf8cf] p-3 text-[#876124] transition duration-150 ease-in-out hover:bg-[#f5f0c0] sm:p-4"
                  >
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="flex w-6 items-center justify-center text-sm font-bold sm:w-8 sm:text-lg">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold sm:text-base">
                          {player.name}
                        </h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold sm:text-xl">
                        {getPlayerWins(player)}
                      </div>
                      <div className="text-xs opacity-70">wins</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
