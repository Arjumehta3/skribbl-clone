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
};

export const ROOM_CODE_LENGTH = 6;