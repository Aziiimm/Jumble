// services/board.service.js

// english letter frequency
const LETTER_FREQUENCIES = {
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

export function generateBoard5x5() {
  const board = [];
  for (let r = 0; r < 5; r++) {
    const row = [];
    for (let c = 0; c < 5; c++) {
      row.push(getRandomLetter());
    }
    board.push(row);
  }
  return board;
}

function getRandomLetter() {
  const entries = Object.entries(LETTER_FREQUENCIES);
  const total = entries.reduce((acc, [, v]) => acc + v, 0);
  const target = Math.random() * total;
  let cumulative = 0;
  for (const [letter, freq] of entries) {
    cumulative += freq;
    if (target <= cumulative) return letter;
  }
  return "E"; // fallback
}
