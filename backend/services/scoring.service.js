// services/scoring.service.js

export function scoreWordByLength(word) {
  const len = typeof word === "string" ? word.length : 0;
  if (len < 3) return 0;
  return len * 100 * 2 - 300;
}
