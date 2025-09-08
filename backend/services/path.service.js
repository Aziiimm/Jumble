// services/path.service.js

export function isValidPath(board, positions) {
  // positions: array of [row,col]
  if (!Array.isArray(positions) || positions.length < 3) return false;
  const n = 5;

  // bounds + no repeats
  const seen = new Set();
  for (const [r, c] of positions) {
    if (!Number.isInteger(r) || !Number.isInteger(c)) return false;
    if (r < 0 || r >= n || c < 0 || c >= n) return false;
    const key = `${r},${c}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }

  // adjacency (including diagonals)
  for (let i = 0; i < positions.length - 1; i++) {
    const [r1, c1] = positions[i];
    const [r2, c2] = positions[i + 1];
    if (Math.abs(r1 - r2) > 1 || Math.abs(c1 - c2) > 1) {
      return false;
    }
  }

  return true;
}

export function buildWord(board, positions) {
  // assumes positions are valid indices
  let word = "";
  for (const [r, c] of positions) {
    word += String(board[r][c] || "").toUpperCase();
  }
  return word;
}
