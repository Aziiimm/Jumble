// src/pages/Leaderboard.tsx

import React, { useState, useEffect, useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { createAuthenticatedApiFunctions } from "@/services/authenticatedApi";
import { Spinner } from "@/components/ui/spinner";
import { FaTrophy } from "react-icons/fa";

type GameType = "overall" | "wordhunter" | "timebomb";

interface Player {
  sub: string;
  name: string;
  wins: number;
  wordhunt_wins: number;
  timebomb_wins: number;
  overall_wins: number;
  wordhunt_games_played: number;
  timebomb_games_played: number;
  overall_games_played: number;
  overall_win_rate: number;
  wordhunt_win_rate: number;
  timebomb_win_rate: number;
  avatar?: string;
}

const Leaderboard: React.FC = () => {
  const [filter, setFilter] = useState<GameType>("overall");
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getAccessTokenSilently } = useAuth0();

  // Memoize API object to prevent constant recreation
  const api = useMemo(() => {
    return createAuthenticatedApiFunctions(getAccessTokenSilently);
  }, [getAccessTokenSilently]);

  // Fetch all leaderboard data once when component mounts
  useEffect(() => {
    const fetchAllLeaderboardData = async () => {
      try {
        setIsLoading(true);
        // Fetch overall leaderboard data (which contains all game types)
        const response = await api.getLeaderboard("overall");
        // Handle the API response structure: {success: true, players: [...]}
        const data = response.success ? response.players : [];
        setAllPlayers(data);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        setAllPlayers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllLeaderboardData();
  }, [api]);

  const getSortedPlayers = () => {
    return [...allPlayers].sort((a, b) => {
      const aWins = getPlayerWins(a);
      const bWins = getPlayerWins(b);
      return bWins - aWins;
    });
  };

  const getPlayerWins = (player: Player) => {
    switch (filter) {
      case "wordhunter":
        return player.wordhunt_wins;
      case "timebomb":
        return player.timebomb_wins;
      default:
        return player.overall_wins;
    }
  };

  const getPlayerWinRate = (player: Player) => {
    switch (filter) {
      case "wordhunter":
        return player.wordhunt_win_rate;
      case "timebomb":
        return player.timebomb_win_rate;
      default:
        return player.overall_win_rate;
    }
  };

  const sortedPlayers = getSortedPlayers();
  const topThree = sortedPlayers.slice(0, 3);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center font-adlam text-white">
        <div className="flex flex-col items-center gap-4">
          <Spinner />
          <p className="text-lg">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

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
                        <p className="flex items-center justify-center gap-1 text-center text-xs opacity-80 sm:text-sm">
                          <FaTrophy className="text-xs" />
                          {getPlayerWins(topThree[1])}
                        </p>
                        <p className="text-center text-xs opacity-70 sm:text-sm">
                          {getPlayerWinRate(topThree[1])}% win rate
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
                        <p className="flex items-center justify-center gap-1 text-center text-xs opacity-80 sm:text-sm md:text-base">
                          <FaTrophy className="text-xs" />
                          {getPlayerWins(topThree[0])}
                        </p>
                        <p className="text-center text-xs opacity-70 sm:text-sm md:text-base">
                          {getPlayerWinRate(topThree[0])}% win rate
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
                        <p className="flex items-center justify-center gap-1 text-center text-xs opacity-80 sm:text-sm">
                          <FaTrophy className="text-xs" />
                          {getPlayerWins(topThree[2])}
                        </p>
                        <p className="text-center text-xs opacity-70 sm:text-sm">
                          {getPlayerWinRate(topThree[2])}% win rate
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
                    key={player.sub}
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
                      <div className="flex items-center justify-end gap-1 text-lg font-bold sm:text-xl">
                        <FaTrophy className="text-sm" />
                        {getPlayerWins(player)}
                      </div>
                      <div className="text-xs opacity-60">
                        {getPlayerWinRate(player)}% win rate
                      </div>
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
