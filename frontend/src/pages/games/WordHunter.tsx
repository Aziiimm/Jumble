// src/pages/games/WordHunter.tsx

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  generateGameBoard,
  isValidWord,
  calculateWordPoints,
} from "../../utils/gameUtils";

import { MdPeopleAlt } from "react-icons/md";
import { FaTrophy } from "react-icons/fa";

// Mock data types
interface Player {
  id: number;
  name: string;
  profilePicture: string;
  wins: number;
}

interface FoundWord {
  word: string;
  points: number;
}

// Mock data
const mockPlayers: Player[] = [
  {
    id: 1,
    name: "Ivan Chen",
    profilePicture:
      "https://hips.hearstapps.com/hmg-prod/images/dog-puppy-on-garden-royalty-free-image-1586966191.jpg?crop=0.752xw:1.00xh;0.175xw,0&resize=1200:*",
    wins: 0,
  },
  {
    id: 2,
    name: "Lebron James",
    profilePicture:
      "https://www.communitycatspodcast.com/wp-content/uploads/2023/03/Cat6.jpg",
    wins: 0,
  },
  {
    id: 3,
    name: "Steve",
    profilePicture:
      "https://hips.hearstapps.com/hmg-prod/images/dog-puppy-on-garden-royalty-free-image-1586966191.jpg?crop=0.752xw:1.00xh;0.175xw,0&resize=1200:*",
    wins: 0,
  },
  {
    id: 4,
    name: "bronny james",
    profilePicture:
      "https://www.communitycatspodcast.com/wp-content/uploads/2023/03/Cat6.jpg",
    wins: 0,
  },
  {
    id: 5,
    name: "labubu",
    profilePicture:
      "https://hips.hearstapps.com/hmg-prod/images/dog-puppy-on-garden-royalty-free-image-1586966191.jpg?crop=0.752xw:1.00xh;0.175xw,0&resize=1200:*",
    wins: 0,
  },
  {
    id: 6,
    name: "Chris",
    profilePicture:
      "https://www.communitycatspodcast.com/wp-content/uploads/2023/03/Cat6.jpg",
    wins: 0,
  },
  {
    id: 7,
    name: "Naruto",
    profilePicture:
      "https://hips.hearstapps.com/hmg-prod/images/dog-puppy-on-garden-royalty-free-image-1586966191.jpg?crop=0.752xw:1.00xh;0.175xw,0&resize=1200:*",
    wins: 0,
  },
  {
    id: 8,
    name: "Player 8",
    profilePicture:
      "https://www.communitycatspodcast.com/wp-content/uploads/2023/03/Cat6.jpg",
    wins: 0,
  },
];

const WordHunter: React.FC = () => {
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [selectedTiles, setSelectedTiles] = useState<number[][]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [board, setBoard] = useState<string[][]>([]);
  const [players] = useState<Player[]>(mockPlayers);

  const dragStartRef = useRef<number[] | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Generate random board on component mount
  useEffect(() => {
    setBoard(generateGameBoard());
  }, []);

  // Global mouse event listeners to handle dragging off the board
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

    document.addEventListener("mouseup", handleGlobalMouseUp);
    document.addEventListener("mouseleave", handleGlobalMouseLeave);

    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("mouseleave", handleGlobalMouseLeave);
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
        setCurrentWord(
          newSelectedTiles.map((pos) => board[pos[0]][pos[1]]).join(""),
        );
      }
    }
  };

  // Handle drag end
  const handleMouseUp = () => {
    if (isDragging && selectedTiles.length >= 3) {
      const word = selectedTiles.map((pos) => board[pos[0]][pos[1]]).join("");

      // Validate word using utility function
      if (isValidWord(word)) {
        const points = calculateWordPoints(word);

        // Check if word already exists
        const wordExists = foundWords.some((found) => found.word === word);
        if (!wordExists) {
          setFoundWords((prev) => [...prev, { word, points }]);
        }
      }
    }

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
    const tileSize = 80; // h-20 = 80px
    const gap = 16; // gap-4 = 16px
    const x = col * (tileSize + gap) + tileSize / 2;
    const y = row * (tileSize + gap) + tileSize / 2;
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
      <div className="mx-auto w-9/12">
        {/* Game Header */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl">Word Hunter</h1>
        </div>

        {/* Current Word Display */}
        <div className="mb-6 flex items-center justify-center">
          <div className="inline-block flex min-h-[2.5rem] min-w-[6rem] items-center justify-center rounded-lg bg-[#01685E] px-6">
            <span className="text-xl">{currentWord || ""}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Panel - Found Words */}
          <div className="lg:col-span-3">
            <div className="flex h-[600px] flex-col rounded-2xl bg-[#01685e] p-6 shadow-xl">
              <div className="mb-4 flex justify-between text-center">
                <div className="text-lg">Words: {totalWords}</div>
                <div className="text-lg">Points: {totalPoints}</div>
              </div>

              <div className="flex-1 overflow-hidden">
                {/* Hidden scrollbar but keeps scroll functionality */}
                <div className="scrollbar-hide h-full space-y-3 overflow-y-auto pr-2">
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
          <div className="select-none lg:col-span-6">
            <div className="flex h-[600px] flex-col rounded-2xl bg-[#01685e] p-6 shadow-xl">
              {/* Game Board - Centered with reduced spacing */}
              <div className="flex flex-1 items-center justify-center">
                <div className="relative">
                  {/* SVG overlay for trail lines */}
                  {selectedTiles.length > 1 && (
                    <svg
                      className="pointer-events-none absolute inset-0"
                      width="448"
                      height="448"
                      viewBox="0 0 448 448"
                      style={{
                        margin: "-24px",
                        transform: "translate(24px, 24px)",
                      }} // Center the SVG properly
                    >
                      <path
                        d={generateTrailPath()}
                        stroke="#ff6b6b"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        opacity="0.9"
                        filter="drop-shadow(0 0 4px rgba(255, 107, 107, 0.5))"
                      />
                    </svg>
                  )}

                  <div className="grid grid-cols-5 gap-4">
                    {board.map((row, rowIndex) =>
                      row.map((letter, colIndex) => (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={`relative flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg text-2xl font-bold transition-all duration-200 ${
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
                        >
                          {/* Trail outline for tiles in the current path */}
                          {isPartOfTrail(rowIndex, colIndex) && (
                            <div className="pointer-events-none absolute inset-0 rounded-lg border-2 border-red-500 border-opacity-30"></div>
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
                <p>
                  Click and drag to connect adjacent letters and form words!
                </p>
                <p>Words must be at least 3 letters long.</p>
              </div>
            </div>
          </div>

          {/* Right Panel - Player List */}
          <div className="lg:col-span-3">
            <div className="flex h-[600px] flex-col rounded-2xl bg-[#01685e] p-6 shadow-xl">
              {/* Room Code */}
              <div className="mb-4 flex justify-between">
                {/* PLACEHOLDER ROOM CODE WILL FILL WITH ROOM CODE GENERATED FROM BACKEND LATER  */}
                <div className="text-lg">Room Code: 3000</div>
                <div className="flex items-center justify-end gap-2 text-lg">
                  {<MdPeopleAlt />}
                  {players.length}/8
                </div>
              </div>

              {/* Player List */}
              <div className="flex-1 overflow-hidden">
                {/* Hidden scrollbar but keeps scroll functionality */}
                <div className="scrollbar-hide h-full space-y-3 overflow-y-auto pr-2">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="flex flex-shrink-0 items-center space-x-3 rounded-lg bg-[#febd4f] p-2 shadow-md"
                    >
                      <img
                        src={player.profilePicture}
                        alt={player.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[#876124]">
                          {player.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#876124]">
                        {<FaTrophy />} {player.wins}
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
