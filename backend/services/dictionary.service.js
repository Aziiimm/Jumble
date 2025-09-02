// services.dictionary.service.js

import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let WORDS = null; // Set<string> once loaded
let loadedCount = 0; // for testing
let isLoading = false; // prevent loading twice

const WORDS_FILE = path.resolve(__dirname, "..", "data", "words.txt");

const MIN_LEN = 3;

// load the dictionary file into a set, skipping any short or blank lines

export async function initDictionary() {
  if (WORDS || isLoading) return; // already loaded or in progress
  isLoading = true;

  const set = new Set();
  const rl = readline.createInterface({
    input: fs.createReadStream(WORDS_FILE, { encoding: "utf-8" }),
    crlDelay: Infinity,
  });

  for await (const line of rl) {
    const w = String(line).trim().toUpperCase();
    if (w.length >= MIN_LEN) set.add(w);
  }

  WORDS = set;
  loadedCount = WORDS.size;
  isLoading = false;
  console.log(
    `[dict] loaded ${loadedCount.toLocaleString()} words from ${WORDS_FILE}`
  );
}

// ensure dictionary is available, if a route calls isValidWord befeore initDictionary() has run, we can lazy init once
async function ensureDictionaryLoaded() {
  if (!WORDS && !isLoading) {
    await initDictionary();
  }
}

// check dictionary membership
export async function isValidWord(word) {
  await ensureDictionaryLoaded();
  if (!word || typeof word !== "string" || !WORDS) return false;

  return WORDS.has(word.toUpperCase());
}

// health/stats
export async function dictStats() {
  await ensureDictionaryLoaded();
  return {
    loaded: Boolean(WORDS),
    count: loadedCount,
    minLen: MIN_LEN,
    source: WORDS_FILE,
  };
}
