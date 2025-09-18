// src/pages/games/WordHunter.tsx

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useGameSocket } from "@/hooks/useGameSocket";
import { useLobbySocket } from "@/hooks/useLobbySocket";
import { createAuthenticatedApiFunctions } from "@/services/authenticatedApi";
import { isValidWord } from "@/utils/gameUtils";

import { MdPeopleAlt } from "react-icons/md";
import { FaTrophy, FaHourglassHalf } from "react-icons/fa";
import { Spinner } from "@/components/ui/spinner";
import { getProfileIconPath } from "@/utils/profileIconUtils";

interface FoundWord {
  word: string;
  points: number;
}

const WordHunter: React.FC = () => {
  const { id: gameId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getAccessTokenSilently, user } = useAuth0();

  // Create API once and memoize it
  const api = useMemo(() => {
    try {
      const apiInstance = createAuthenticatedApiFunctions(
        getAccessTokenSilently,
      );
      // console.log("API created successfully:", apiInstance);
      // console.log("submitWord function exists:", typeof apiInstance.submitWord);
      return apiInstance;
    } catch (error) {
      console.error("Error creating API:", error);
      return null;
    }
  }, [getAccessTokenSilently]);

  // Socket: live game info (board/startTs/duration) + live scores
  const onGameEnded = useCallback(
    (data: {
      gameId: string;
      endTs: number;
      scores: Record<string, number>;
      names: Record<string, string>;
    }) => {
      setShowEnded(true);

      // Determine winner from the scores provided by the backend
      if (data.scores && Object.keys(data.scores).length > 0) {
        const scores = data.scores;
        const scoreValues = Object.values(scores);
        const maxScore = Math.max(...scoreValues);
        const winners = Object.keys(scores).filter(
          (id) => scores[id] === maxScore,
        );

        if (winners.length === 1) {
          // Single winner
          // console.log("Winner:", winners[0], "Score:", scores[winners[0]]);
          setGameResults({
            scores: data.scores,
            names: data.names || {},
            winner: winners[0],
          });
        } else {
          // Tie - no single winner
          // console.log(
          //   "Tie detected:",
          //   winners.length,
          //   "players with score",
          //   maxScore,
          // );
          setGameResults({
            scores: data.scores,
            names: data.names || {},
            winner: "tie",
          });
        }
      } else {
        setGameResults({
          scores: data.scores || {},
          names: data.names || {},
          winner: undefined,
        });
      }
    },
    [],
  );

  // Listen for game:started from lobby room first, then join game room
  const [lobbyGameData, setLobbyGameData] = useState<any>(null);
  const roomCode = localStorage.getItem("roomCode");

  useLobbySocket(roomCode || "", {
    onGameStartedInLobby: (gameData) => {
      setLobbyGameData(gameData);
    },
    onReopened: ({ roomCode: reopenedRoomCode }) => {
      navigate(`/lobby/${reopenedRoomCode}`);
    },
  });
  const { started: gameStarted, scores } = useGameSocket(gameId, {
    onEnded: onGameEnded,
  });

  // Use lobby data if available, otherwise use game socket data
  const started = lobbyGameData || gameStarted;

  // Debug: Log when game state changes
  useEffect(() => {
    if (started) {
    }
  }, [started]);

  // board created on the backend
  const board = started?.board || [];

  // Game end state - declare before timer useEffect
  const [showEnded, setShowEnded] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // timer - just for display, game end is handled by socket events
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  useEffect(() => {
    if (!started) return;
    const endTs = started.startTs + started.durationSec * 1000;
    const id = window.setInterval(() => {
      const timeLeft = Math.max(0, endTs - Date.now());
      setTimeLeftMs(timeLeft);
    }, 250);
    return () => clearInterval(id);
  }, [started]);
  const secondsLeft = Math.ceil(timeLeftMs / 1000);

  // Fetch user profile for profile picture
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profile = await api?.getUserProfile();
        setUserProfile(profile?.user);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };
    if (api) {
      fetchUserProfile();
    }
  }, [api]);

  // End banner + lobby navigation (owner only)
  const roomCodeLabel = localStorage.getItem("roomCode") || "-";
  const isOwner = localStorage.getItem("isOwner") === "true"; // set this when you create lobby/start

  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [submittedWords, setSubmittedWords] = useState<Set<string>>(new Set());
  const [selectedTiles, setSelectedTiles] = useState<number[][]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [wordStatus, setWordStatus] = useState<
    "neutral" | "success" | "duplicate"
  >("neutral");
  const [gameResults, setGameResults] = useState<{
    scores: Record<string, number>;
    names: Record<string, string>;
    winner?: string;
  } | null>(null);

  const dragStartRef = useRef<number[] | null>(null);
  // const boardRef = useRef<HTMLDivElement>(null);

  // Audio refs for sound effects
  const successSoundRef = useRef<HTMLAudioElement | null>(null);

  const names = started?.names || {};

  // Initialize audio elements
  useEffect(() => {
    successSoundRef.current = new Audio("/sounds/success.mp3");

    // Preload audio file
    successSoundRef.current.load();

    // Cleanup on unmount
    return () => {
      if (successSoundRef.current) {
        successSoundRef.current.pause();
        successSoundRef.current = null;
      }
    };
  }, []);

  // Function to play success sound
  const playSuccessSound = () => {
    if (successSoundRef.current) {
      successSoundRef.current.currentTime = 0; // Reset to start
      successSoundRef.current
        .play()
        .catch((err: any) => console.error("Audio play failed:", err));
    }
  };

  // Function to vibrate device (mobile only)
  const vibrateDevice = () => {
    if ("vibrate" in navigator) {
      // Vibrate pattern: 100ms on, 50ms off, 100ms on
      navigator.vibrate([100, 50, 100]);
    }
  };

  // Global mouse and touch event listeners to handle dragging off the board
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    const handleGlobalMouseLeave = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    const handleGlobalTouchEnd = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
      }
    };

    document.addEventListener("mouseup", handleGlobalMouseUp);
    document.addEventListener("mouseleave", handleGlobalMouseLeave);
    document.addEventListener("touchend", handleGlobalTouchEnd);
    document.addEventListener("touchmove", handleGlobalTouchMove, {
      passive: false,
    });

    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("mouseleave", handleGlobalMouseLeave);
      document.removeEventListener("touchend", handleGlobalTouchEnd);
      document.removeEventListener("touchmove", handleGlobalTouchMove);
    };
  }, [isDragging]);

  // Calculate totals
  const totalWords = foundWords.length;
  const totalPoints = foundWords.reduce((sum, word) => sum + word.points, 0);

  // Check if two positions are adjacent (including diagonally)
  const isAdjacent = (pos1: number[], pos2: number[]): boolean => {
    const [row1, col1] = pos1;
    const [row2, col2] = pos2;
    return Math.abs(row1 - row2) <= 1 && Math.abs(col1 - col2) <= 1;
  };

  // Handle tile selection start
  const handleTileMouseDown = (row: number, col: number) => {
    setIsDragging(true);
    dragStartRef.current = [row, col];
    setSelectedTiles([[row, col]]);
    setCurrentWord(board[row][col]);
  };

  // Handle tile hover during drag
  const handleTileMouseEnter = (row: number, col: number) => {
    if (!isDragging || !dragStartRef.current) return;

    const newPos = [row, col];

    // Check if this tile is adjacent to the last selected tile
    if (
      selectedTiles.length === 0 ||
      isAdjacent(selectedTiles[selectedTiles.length - 1], newPos)
    ) {
      // Check if this tile hasn't been selected yet
      const alreadySelected = selectedTiles.some(
        (pos) => pos[0] === row && pos[1] === col,
      );
      if (!alreadySelected) {
        const newSelectedTiles = [...selectedTiles, newPos];
        setSelectedTiles(newSelectedTiles);
        const newWord = newSelectedTiles
          .map((pos) => board[pos[0]][pos[1]])
          .join("");
        setCurrentWord(newWord);

        // Check word status in real-time as user drags
        if (newWord.length >= 3) {
          if (isValidWord(newWord)) {
            const wordExists = foundWords.some(
              (found) => found.word === newWord,
            );
            if (!wordExists) {
              setWordStatus("success"); // Green background for valid new word
            } else {
              setWordStatus("duplicate"); // Yellow background for duplicate word
            }
          } else {
            setWordStatus("neutral"); // Default background for invalid word
          }
        } else {
          setWordStatus("neutral"); // Default background for short words
        }
      }
    }
  };

  // Handle drag end
  const handleMouseUp = async () => {
    if (isDragging && selectedTiles.length >= 3 && board.length) {
      const word = selectedTiles.map((pos) => board[pos[0]][pos[1]]).join("");
      const looksValid = isValidWord(word);

      // Only submit if it looks valid on client side
      if (!looksValid) {
        setWordStatus("neutral");
        return;
      }

      // Check for duplicate on frontend first
      if (submittedWords.has(word.toLowerCase())) {
        setWordStatus("duplicate");
        setTimeout(() => setWordStatus("neutral"), 1);
        setIsDragging(false);
        setSelectedTiles([]);
        setCurrentWord("");
        dragStartRef.current = null;
        return;
      }

      try {
        // send to backend
        // console.log("Submitting word:", word, "path:", selectedTiles);
        // console.log("GameId:", gameId);
        // console.log("API object:", api);
        // console.log("submitWord function:", api?.submitWord);

        if (!api || !api.submitWord) {
          console.error("API or submitWord function is not available");
          setWordStatus("neutral");
          return;
        }

        const resp = await api.submitWord(gameId!, selectedTiles);

        if (resp.accepted) {
          // Success feedback
          vibrateDevice();
          playSuccessSound();
          setFoundWords((prev) => [
            ...prev,
            { word: resp.word, points: resp.points },
          ]);
          setSubmittedWords((prev) => new Set([...prev, word.toLowerCase()]));
          setWordStatus("success");
        } else {
          // Server rejected
          // reasons: "invalid_path", "not_in_dictionary", "duplicate_word", "too_short"
          if (resp.reason === "duplicate_word") {
            setSubmittedWords((prev) => new Set([...prev, word.toLowerCase()]));
            setWordStatus("duplicate");
          } else setWordStatus("neutral");
        }
      } catch (e) {
        console.error("submit failed", e);
        console.error("Error details:", (e as Error).message);
        console.error("Error response:", (e as any).response);
        setWordStatus("neutral");
      }
    }

    // reset selection quickly
    setTimeout(() => setWordStatus("neutral"), 1);
    setIsDragging(false);
    setSelectedTiles([]);
    setCurrentWord("");
    dragStartRef.current = null;
  };

  // Check if a tile is selected
  const isTileSelected = (row: number, col: number): boolean => {
    return selectedTiles.some((pos) => pos[0] === row && pos[1] === col);
  };

  // Check if a tile is part of the current trail (for outline)
  const isPartOfTrail = (row: number, col: number): boolean => {
    return selectedTiles.some((pos) => pos[0] === row && pos[1] === col);
  };

  // Get tile position for SVG path calculation
  const getTileCenter = (row: number, col: number) => {
    // For mobile: h-14 = 56px, gap-2 = 8px
    // For desktop: h-20 = 80px, gap-4 = 16px
    const isMobile = window.innerWidth < 640; // sm breakpoint
    const tileSize = isMobile ? 56 : 80;
    const gap = isMobile ? 8 : 16;

    // Convert to percentage-based coordinates (0-100)
    const totalWidth = 5 * tileSize + 4 * gap; // 5 columns
    const totalHeight = 5 * tileSize + 4 * gap; // 5 rows

    const x = ((col * (tileSize + gap) + tileSize / 2) / totalWidth) * 100;
    const y = ((row * (tileSize + gap) + tileSize / 2) / totalHeight) * 100;

    return { x, y };
  };

  // Generate SVG path for trail
  const generateTrailPath = () => {
    if (selectedTiles.length < 2) return "";

    const path = selectedTiles.map((pos, index) => {
      const { x, y } = getTileCenter(pos[0], pos[1]);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    });

    return path.join(" ");
  };

  // Don't render until board is generated
  if (board.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center font-adlam text-white">
        <div className="flex flex-col items-center gap-6 text-center">
          <Spinner />
          <div className="flex flex-col items-center text-center">
            <h1 className="text-3xl">Loading Game...</h1>
            <p className="text-lg">Room Code: {roomCodeLabel}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-20 font-adlam text-[#FCF8CF] sm:pt-10 2xl:h-[80vh]">
      <div className="mx-auto w-full sm:w-10/12 lg:w-11/12 2xl:w-10/12 3xl:w-9/12">
        {showEnded && (
          <div className="mb-4 min-w-fit items-center place-self-center rounded-lg bg-[#01685e] p-3 text-yellow-100">
            Round Over!
            {isOwner && (
              <button
                className="ml-4 rounded-md bg-[#febd4f] px-3 py-1 text-[#876124] hover:opacity-90"
                onClick={async () => {
                  try {
                    // Notify all players that lobby is reopened
                    if (api?.reopenLobby) {
                      await api.reopenLobby(roomCodeLabel);
                    }
                    // Navigate to lobby
                    navigate(`/lobby/${roomCodeLabel}`);
                  } catch (error) {
                    console.error("Error reopening lobby:", error);
                    // Still navigate even if API call fails
                    navigate(`/lobby/${roomCodeLabel}`);
                  }
                }}
              >
                Back to Lobby
              </button>
            )}
          </div>
        )}

        {/* Winner Display */}
        {gameResults && gameResults.winner && gameResults.winner !== "tie" && (
          <div className="mb-4 flex justify-center">
            <div className="flex items-center space-x-3 rounded-lg bg-[#febd4f] p-3 shadow-md">
              <FaTrophy className="h-6 w-6 text-[#876124]" />
              <span className="text-lg font-medium text-[#876124]">
                Winner:{" "}
                {gameResults.names[gameResults.winner] || gameResults.winner}
              </span>
            </div>
          </div>
        )}

        {/* Tie Display */}
        {gameResults && gameResults.winner === "tie" && (
          <div className="mb-4 flex justify-center">
            <div className="flex items-center space-x-3 rounded-lg bg-[#febd4f] p-3 shadow-md">
              <FaTrophy className="h-6 w-6 text-[#876124]" />
              <span className="text-lg font-medium text-[#876124]">
                It's a Tie!
              </span>
            </div>
          </div>
        )}

        {/* No Winner Display */}
        {gameResults && !gameResults.winner && (
          <div className="mb-4 flex justify-center">
            <div className="flex items-center space-x-3 rounded-lg bg-gray-400 p-3 shadow-md">
              <FaTrophy className="h-6 w-6 text-gray-700" />
              <span className="text-lg font-medium text-gray-700">
                Game Over - No Winner
              </span>
            </div>
          </div>
        )}

        {/* Current Word Display - Hide when game is over */}
        {!showEnded && (
          <div className="flex flex-col items-center justify-center gap-2 lg:mb-4">
            <div
              className={`inline-block flex min-h-[2.5rem] min-w-[8rem] items-center justify-center rounded-lg px-6 transition-all duration-150 ${
                wordStatus === "success"
                  ? "scale-105 bg-green-500 shadow-lg"
                  : wordStatus === "duplicate"
                    ? "scale-105 bg-yellow-500 shadow-lg"
                    : "bg-[#01685E]"
              }`}
            >
              <span className="text-xl">{currentWord || ""}</span>
            </div>

            {/* Timer */}
          </div>
        )}

        {/* Timer - Right side above grid on md and below, over middle panel on lg+ - Hide when game is over */}
        {!showEnded && (
          <div className="flex justify-end md:justify-end lg:hidden">
            <div
              className={`flex max-w-[6rem] items-center justify-center gap-1 rounded-t-lg px-2 py-1 text-lg font-light transition-transform duration-1000 sm:mb-2 sm:rounded-lg sm:text-2xl ${
                secondsLeft <= 30 ? "animate-pulse text-red-500" : ""
              }`}
            >
              <FaHourglassHalf
                className={`text-base sm:text-xl ${secondsLeft <= 30 ? "text-red-500" : ""}`}
              />
              <span className={secondsLeft <= 30 ? "text-red-500" : ""}>
                {Math.floor(secondsLeft / 60)}:
                {(secondsLeft % 60).toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Panel - Found Words */}
          <div className="order-2 lg:order-1 lg:col-span-3">
            <div className="flex h-[400px] flex-col rounded-2xl bg-[#01685e] p-6 shadow-xl lg:h-[600px]">
              <div className="mb-4 flex justify-between text-center">
                <div className="text-lg">Words: {totalWords}</div>
                <div className="text-lg">Points: {totalPoints}</div>
              </div>

              <div className="flex-1 overflow-hidden">
                {/* Hidden scrollbar but keeps scroll functionality */}
                <div className="scrollbar-hide h-full space-y-3 overflow-y-auto">
                  {foundWords.length === 0 ? (
                    <p className="text-center text-[#b1dfbc]">
                      No words found yet!
                    </p>
                  ) : (
                    foundWords.map((word, index) => (
                      <div
                        key={index}
                        className="flex flex-shrink-0 items-center justify-between rounded-lg bg-[#fcf8cf] p-3 shadow-lg"
                      >
                        <span className="text-sm text-[#876124]">
                          {word.word}
                        </span>
                        <span className="text-sm text-[#876124]">
                          {word.points}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Middle Panel - Game Board */}
          <div className="relative order-1 select-none lg:order-2 lg:col-span-6">
            {/* Timer - Positioned over the right side of middle panel (lg+ only) - Hide when game is over */}
            {!showEnded && (
              <div className="absolute right-4 top-4 z-10 hidden lg:block">
                <div
                  className={`flex max-w-[6rem] items-center justify-center gap-1 rounded-t-lg px-2 py-1 text-lg font-light transition-transform duration-1000 sm:mb-2 sm:rounded-lg sm:text-2xl ${
                    secondsLeft <= 30 ? "animate-pulse text-red-500" : ""
                  }`}
                >
                  <FaHourglassHalf
                    className={`text-base sm:text-xl ${secondsLeft <= 30 ? "text-red-500" : ""}`}
                  />
                  <span className={secondsLeft <= 30 ? "text-red-500" : ""}>
                    {Math.floor(secondsLeft / 60)}:
                    {(secondsLeft % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              </div>
            )}
            <div className="flex flex-col rounded-2xl bg-[#01685e] px-4 py-6 shadow-xl sm:h-[600px] sm:px-6">
              {/* Game Board - Centered with reduced spacing */}
              <div className="flex items-center justify-center sm:flex-1">
                <div
                  className="relative touch-none"
                  style={{
                    touchAction: "none",
                    WebkitTouchCallout: "none",
                    WebkitUserSelect: "none",
                    userSelect: "none",
                  }}
                >
                  {/* SVG overlay for trail lines */}
                  {selectedTiles.length > 1 && (
                    <svg
                      className="pointer-events-none absolute inset-0"
                      width="100%"
                      height="100%"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      style={{
                        margin: "-2px",
                        transform: "translate(2px, 2px)",
                      }}
                    >
                      <path
                        d={generateTrailPath()}
                        stroke={
                          wordStatus === "success"
                            ? "#4ade80" // Green for valid words
                            : wordStatus === "duplicate"
                              ? "#fbbf24" // Yellow for duplicate words
                              : "#ff6b6b" // Red for invalid words
                        }
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        opacity="0.9"
                        filter={
                          wordStatus === "success"
                            ? "drop-shadow(0 0 4px rgba(74, 222, 128, 0.5))" // Green glow
                            : wordStatus === "duplicate"
                              ? "drop-shadow(0 0 4px rgba(251, 191, 36, 0.5))" // Yellow glow
                              : "drop-shadow(0 0 4px rgba(255, 107, 107, 0.5))" // Red glow
                        }
                      />
                    </svg>
                  )}

                  <div className="grid grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                    {board.map((row: string[], rowIndex: number) =>
                      row.map((letter: string, colIndex: number) => (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          data-row={rowIndex}
                          data-col={colIndex}
                          className={`relative flex h-[3.5rem] w-[3.5rem] cursor-pointer items-center justify-center rounded-xl text-2xl font-bold shadow-2xl transition-all duration-200 sm:h-[5rem] sm:w-[5rem] md:h-[5.5rem] md:w-[5.5rem] lg:h-[4.5rem] lg:w-[4.5rem] xl:h-20 xl:w-20 ${
                            isTileSelected(rowIndex, colIndex)
                              ? wordStatus === "success"
                                ? "bg-[#4ade80] text-white shadow-lg" // Green for valid words
                                : wordStatus === "duplicate"
                                  ? "bg-[#fbbf24] text-white shadow-lg" // Yellow for duplicate words
                                  : "bg-[#ff6b6b] text-white shadow-lg" // Red for invalid words
                              : "bg-[#fcf8cf] text-[#876124] hover:bg-[#f0e68c]"
                          }`}
                          onMouseDown={() =>
                            handleTileMouseDown(rowIndex, colIndex)
                          }
                          onMouseEnter={() =>
                            handleTileMouseEnter(rowIndex, colIndex)
                          }
                          onMouseUp={handleMouseUp}
                          onTouchStart={() =>
                            handleTileMouseDown(rowIndex, colIndex)
                          }
                          onTouchMove={(e) => {
                            const touch = e.touches[0];
                            const element = document.elementFromPoint(
                              touch.clientX,
                              touch.clientY,
                            );
                            if (
                              element &&
                              element.closest("[data-row][data-col]")
                            ) {
                              const row = parseInt(
                                element.getAttribute("data-row") || "0",
                              );
                              const col = parseInt(
                                element.getAttribute("data-col") || "0",
                              );
                              handleTileMouseEnter(row, col);
                            }
                          }}
                          onTouchEnd={handleMouseUp}
                        >
                          {/* Trail outline for tiles in the current path */}
                          {isPartOfTrail(rowIndex, colIndex) && (
                            <div className="pointer-events-none absolute inset-0 rounded-lg"></div>
                          )}
                          {letter}
                        </div>
                      )),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Player List */}
          <div className="order-3 h-[400px] lg:col-span-3 lg:h-[600px]">
            <div className="flex h-[400px] flex-col rounded-2xl bg-[#01685e] p-6 shadow-xl lg:h-[600px]">
              {/* Room Code */}
              <div className="mb-4 flex justify-between">
                <div className="text-lg">Room Code: {roomCodeLabel}</div>
                <div className="flex items-center justify-end gap-2 text-lg">
                  {<MdPeopleAlt />}
                  {started?.players?.length ?? 0}/8
                </div>
              </div>

              {/* Player List */}
              <div className="flex h-[400px] overflow-hidden sm:h-[500px]">
                {/* Hidden scrollbar but keeps scroll functionality */}
                <div className="scrollbar-hide w-full space-y-3 overflow-y-auto">
                  {(started?.players ?? []).map((pid: string) => {
                    // Use icon from game data if available, otherwise fall back to current user's icon or default
                    const profileIcon =
                      started?.icons?.[pid] ||
                      (pid === user?.sub && userProfile?.profile_icon) ||
                      1; // Default icon

                    const profileSrc = getProfileIconPath(profileIcon);

                    return (
                      <div
                        key={pid}
                        className="flex flex-shrink-0 items-center space-x-3 rounded-lg bg-[#febd4f] p-2 shadow-md"
                      >
                        <img
                          src={profileSrc}
                          alt={names[pid] || pid}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[#876124]">
                            {names[pid] || pid}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#876124]">
                          {<FaTrophy />} {scores?.[pid] ?? 0}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordHunter;
