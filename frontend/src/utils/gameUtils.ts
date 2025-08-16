// src/utils/gameUtils.ts

import { COMMON_WORDS } from "./COMMON_WORDS";

// English letter frequency (approximate percentages)
const LETTER_FREQUENCIES: { [key: string]: number } = {
  E: 12.02,
  T: 9.1,
  A: 8.12,
  O: 7.68,
  I: 7.31,
  N: 6.95,
  S: 6.28,
  R: 6.02,
  H: 5.92,
  D: 4.32,
  L: 3.98,
  U: 2.88,
  C: 2.71,
  M: 2.61,
  F: 2.3,
  Y: 2.11,
  W: 2.09,
  G: 2.03,
  P: 1.82,
  B: 1.49,
  V: 1.11,
  K: 0.69,
  X: 0.17,
  Q: 0.11,
  J: 0.1,
  Z: 0.07,
};

/**
 * Generate a random 5x5 game board based on English letter frequencies
 */
export const generateGameBoard = (): string[][] => {
  const board: string[][] = [];

  for (let row = 0; row < 5; row++) {
    const boardRow: string[] = [];
    for (let col = 0; col < 5; col++) {
      boardRow.push(getRandomLetter());
    }
    board.push(boardRow);
  }

  return board;
};

/**
 * Get a random letter based on English frequency distribution
 */
const getRandomLetter = (): string => {
  const random = Math.random() * 100;
  let cumulative = 0;

  for (const [letter, frequency] of Object.entries(LETTER_FREQUENCIES)) {
    cumulative += frequency;
    if (random <= cumulative) {
      return letter;
    }
  }

  // Fallback to common letters if something goes wrong
  return "E";
};

/**
 * Check if a word is valid (exists in our word list)
 */
export const isValidWord = (word: string): boolean => {
  return COMMON_WORDS.has(word.toUpperCase());
};

/**
 * Calculate points for a word based on length
 */
export const calculateWordPoints = (word: string): number => {
  if (word.length < 3) return 0;
  return word.length * 100 - 300 + word.length * 100;
};

/**
 * Check if a sequence of positions forms a valid path on the board
 */
export const isValidPath = (positions: number[][]): boolean => {
  if (positions.length < 3) return false;

  // Check if each position is adjacent to the next
  for (let i = 0; i < positions.length - 1; i++) {
    const [row1, col1] = positions[i];
    const [row2, col2] = positions[i + 1];

    // Check if positions are adjacent (including diagonally)
    if (Math.abs(row1 - row2) > 1 || Math.abs(col1 - col2) > 1) {
      return false;
    }
  }

  // Check for duplicate positions
  const seen = new Set<string>();
  for (const [row, col] of positions) {
    const key = `${row},${col}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }

  return true;
};

/**
 * Get all possible words from a board (for debugging/testing)
 */
export const getAllPossibleWords = (board: string[][]): string[] => {
  const words: string[] = [];
  const visited = new Set<string>();

  const dfs = (
    row: number,
    col: number,
    currentWord: string,
    path: number[][],
  ) => {
    if (row < 0 || row >= 5 || col < 0 || col >= 5) return;

    const key = `${row},${col}`;
    if (path.some(([r, c]) => r === row && c === col)) return;

    const newWord = currentWord + board[row][col];
    const newPath = [...path, [row, col]];

    if (newWord.length >= 3 && isValidWord(newWord)) {
      words.push(newWord);
    }

    if (newWord.length < 8) {
      // Limit word length for performance
      // Check all 8 adjacent positions
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          dfs(row + dr, col + dc, newWord, newPath);
        }
      }
    }
  };

  // Start DFS from each position
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      dfs(row, col, "", []);
    }
  }

  return [...new Set(words)]; // Remove duplicates
};
