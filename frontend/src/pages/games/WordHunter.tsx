// src/pages/games/WordHunter.tsx

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameSocket } from "@/hooks/useGameSocket";
import { useLobbySocket } from "@/hooks/useLobbySocket";
import { submitWord, finishGame } from "@/services/api";
import { isValidWord } from "@/utils/gameUtils";

import { MdPeopleAlt } from "react-icons/md";
import { FaTrophy } from "react-icons/fa";

const dog =
  "https://www.nylabone.com/-/media/project/oneweb/nylabone/images/dog101/10-intelligent-dog-breeds/golden-retriever-tongue-out.jpg?h=430&w=710&hash=7FEB820D235A44B76B271060E03572C7";

interface FoundWord {
  word: string;
  points: number;
}

const WordHunter: React.FC = () => {
  const { id: gameId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // TEMPORARY PLAYER ID (UNTIL AUTH IS DONE): use a fixed id/name per browser tab
  const playerId =
    localStorage.getItem("playerId") ||
    (() => {
      const v = "u_" + Math.random().toString(36).slice(2, 8);
      localStorage.setItem("playerId", v);
      return v;
    })();

  const playerName =
    localStorage.getItem("playerName") ||
    (() => {
      const v = "Guest-" + playerId.slice(-4);
      localStorage.setItem("playerName", v);
      return v;
    })();

  // Socket: live game info (board/startTs/duration) + live scores
  const onGameEnded = useCallback(() => {
    setShowEnded(true); // banner on everyone's client
  }, []);

  // Listen for game:started from lobby room first, then join game room
  const [lobbyGameData, setLobbyGameData] = useState<any>(null);
  const roomCode = localStorage.getItem("roomCode");

  useLobbySocket(roomCode || "", {
    onGameStartedInLobby: (gameData) => {
      console.log("Received game:started from lobby:", gameData);
      setLobbyGameData(gameData);
    },
    onReopened: ({ roomCode: reopenedRoomCode }) => {
      console.log("Lobby reopened, redirecting to lobby:", reopenedRoomCode);
      navigate(`/lobby/${reopenedRoomCode}`);
    },
  });

  const { started: gameStarted, scores } = useGameSocket(gameId, {
    onEnded: onGameEnded,
  });

  // Use lobby data if available, otherwise use game socket data
  const started = lobbyGameData || gameStarted;

  // board created on the backend
  const board = started?.board || [];

  // timer
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  useEffect(() => {
    if (!started) return;
    const endTs = started.startTs + started.durationSec * 1000;
    const id = window.setInterval(() => {
      setTimeLeftMs(Math.max(0, endTs - Date.now()));
    }, 250);
    return () => clearInterval(id);
  }, [started]);
  const secondsLeft = Math.ceil(timeLeftMs / 1000);

  // End banner + lobby navigation (owner only)
  const roomCodeLabel = localStorage.getItem("roomCode") || "-";
  const isOwner = localStorage.getItem("isOwner") === "true"; // set this when you create lobby/start

  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [selectedTiles, setSelectedTiles] = useState<number[][]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [wordStatus, setWordStatus] = useState<
    "neutral" | "success" | "duplicate"
  >("neutral");
  const [showEnded, setShowEnded] = useState<boolean>(false);

  const dragStartRef = useRef<number[] | null>(null);
  // const boardRef = useRef<HTMLDivElement>(null);

  // Audio refs for sound effects
  const successSoundRef = useRef<HTMLAudioElement | null>(null);

  // player data
  const livePlayerIds = started?.players || [];
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
        .catch((err: any) => console.log("Audio play failed:", err));
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

    document.addEventListener("mouseup", handleGlobalMouseUp);
    document.addEventListener("mouseleave", handleGlobalMouseLeave);
    document.addEventListener("touchend", handleGlobalTouchEnd);

    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("mouseleave", handleGlobalMouseLeave);
      document.removeEventListener("touchend", handleGlobalTouchEnd);
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

      try {
        // send to backend
        console.log("Submitting word:", word, "path:", selectedTiles);
        const resp = await submitWord(gameId!, playerId, selectedTiles);
        console.log("Submit response:", resp);

        if (resp.accepted) {
          // Success feedback
          vibrateDevice();
          playSuccessSound();
          setFoundWords((prev) => [
            ...prev,
            { word: resp.word, points: resp.points },
          ]);
          setWordStatus("success");
        } else {
          // Server rejected
          // reasons: "invalid_path", "not_in_dictionary", "duplicate_word", "too_short"
          if (resp.reason === "duplicate_word") setWordStatus("duplicate");
          else setWordStatus("neutral");
        }
      } catch (e) {
        console.error("submit failed", e);
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
    return <div>Loading...</div>;
  }

  return (
    <div className="px-6 pb-20 pt-10 font-adlam text-[#FCF8CF]">
      <div className="mx-auto w-full sm:w-10/12 lg:w-11/12 2xl:w-10/12 3xl:w-9/12">
        {/* Game Header */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl">Word Hunter</h1>
        </div>

        {showEnded && (
          <div className="mb-4 rounded-lg bg-yellow-500/20 p-3 text-center text-yellow-100">
            Round over!
            {isOwner && (
              <button
                className="ml-4 rounded-md bg-yellow-400 px-3 py-1 text-[#876124] hover:bg-yellow-300"
                onClick={async () => {
                  try {
                    // Notify all players that lobby is reopened
                    await fetch(
                      `http://localhost:3000/lobbies/${roomCodeLabel}/reopen`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ownerId: playerId }),
                      },
                    );
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

        {/* Current Word Display and Timer */}
        <div className="mb-6 flex items-center justify-center gap-4">
          <div
            className={`inline-block flex min-h-[2.5rem] min-w-[6rem] items-center justify-center rounded-lg px-6 transition-all duration-150 ${
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
          <div className="flex items-center gap-2 rounded-lg bg-[#01685E] px-4 py-2">
            <span className="text-lg">⏱️</span>
            <span className="text-xl font-bold">
              {Math.floor(secondsLeft / 60)}:
              {(secondsLeft % 60).toString().padStart(2, "0")}
            </span>
          </div>
        </div>

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
          <div className="order-1 select-none lg:order-2 lg:col-span-6">
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
                        stroke="#ff6b6b"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        opacity="0.9"
                        filter="drop-shadow(0 0 4px rgba(255, 107, 107, 0.5))"
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
                              ? "bg-[#ff6b6b] text-white shadow-lg"
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
                            e.preventDefault();
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

              {/* Game Instructions */}
              <div className="mt-4 flex-shrink-0 text-center text-sm text-[#b1dfbc]">
                <p className="hidden sm:block">
                  Click and drag to connect adjacent letters and form words!
                </p>
                <p className="sm:hidden">
                  Tap and drag to connect adjacent letters and form words!
                </p>
                <p>Words must be at least 3 letters long.</p>
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
                  {(started?.players ?? []).map((pid: string) => (
                    <div
                      key={pid}
                      className="flex flex-shrink-0 items-center space-x-3 rounded-lg bg-[#febd4f] p-2 shadow-md"
                    >
                      <img
                        src={dog}
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
                  ))}
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
