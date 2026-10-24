import { WordMode } from "./enums/WordMode.js";
import type { RoomSettings } from "./types/index.js";

export const LIMITS = {
  maxPlayers: { min: 2, max: 20 },
  rounds: { min: 2, max: 10 },
  drawTime: { min: 15, max: 240 },
  wordCount: { min: 1, max: 5 },
  hints: { min: 0, max: 5 },
};

export const DEFAULT_SETTINGS: RoomSettings = {
  maxPlayers: 8,
  rounds: 3,
  drawTime: 80,
  wordCount: 3,
  hints: 2,
  wordMode: WordMode.NORMAL,
  isPrivate: true,
  language: "English",
};

export const LANGUAGES = ["English", "Hindi", "Spanish", "French"] as const;

export const WORD_SELECT_SECONDS = 15;
export const ROUND_END_SECONDS = 5;
export const GUESS_BASE_SCORE = 500;
export const GUESS_MIN_SCORE = 50;
export const DRAWER_POINTS_PER_GUESS = 50;

export const ROOM_CODE_LENGTH = 6;
export const MAX_POINTS_PER_STROKE = 3000;

export const MAX_MESSAGE_LENGTH = 100;
export const RATE_LIMIT_MAX = 5; // itne messages
export const RATE_LIMIT_WINDOW_MS = 3000; // itne time mein