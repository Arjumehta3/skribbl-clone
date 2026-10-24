import type { GamePhase } from "../enums/GamePhase";
import type { WordMode } from "../enums/WordMode";

export type Language = "English" | "Hindi" | "Spanish" | "French";

export interface RoomSettings {
  maxPlayers: number; // 2-20
  rounds: number; // 2-10
  drawTime: number; // 15-240 seconds
  wordCount: number; // 1-5
  hints: number; // 0-5
  wordMode: WordMode;
  isPrivate: boolean;
  language: Language;
}

export interface Point {
  x: number; // 0 to 1 (normalized)
  y: number; // 0 to 1 (normalized)
}

export interface Stroke {
  points: Point[];
  color: string;
  size: number;
}

export interface PlayerDTO {
  id: string;
  name: string;
  avatar: string; // server abhi nahi bhejta, baad mein jodenge
  score: number;
  isHost: boolean;
  isReady: boolean;
  hasGuessed: boolean;
}

// Server ke game_state event ka shape
export interface GameState {
  phase: GamePhase;
  round: number;
  totalRounds: number;
  drawerId: string | null;
  word: string | null; // sirf drawer (ya sahi guess karne wale) ko milta hai
  maskedWord: string; // "_ _ a _ _"
  timeLeft: number;
}

// Server ke room_joined event ka shape
export interface RoomJoinedData {
  roomId: string;
  players: PlayerDTO[];
  settings: RoomSettings;
  you: PlayerDTO;
}

// round_start: wordOptions sirf drawer ke paas hote hain, baaki ko khali list
export interface RoundStartData {
  drawerId: string;
  wordOptions: string[];
  drawTime: number;
  round: number;
  totalRounds: number;
}

export interface RoundEndData {
  word: string;
  scores: PlayerDTO[];
}

export interface GameOverData {
  winner: PlayerDTO | null;
  leaderboard: PlayerDTO[];
}

export interface GuessResultData {
  correct: boolean;
  close?: boolean;
  playerId: string;
  playerName: string;
  points?: number;
}

export interface ChatMessageData {
  playerId: string;
  playerName: string;
  text: string;
}

// Server ke draw_data event ke 3 roop
export type DrawData =
  | { type: "start"; x: number; y: number; color: string; size: number }
  | { type: "move"; x: number; y: number }
  | { type: "end" };

// UI mein dikhne wala chat item (chat, system, sahi guess, close guess)
export interface ChatItem {
  id: string;
  kind: "chat" | "system" | "correct" | "close";
  playerName?: string;
  text: string;
}

export const LIMITS = {
  maxPlayers: { min: 2, max: 20 },
  rounds: { min: 2, max: 10 },
  drawTime: { min: 15, max: 240 },
  wordCount: { min: 1, max: 5 },
  hints: { min: 0, max: 5 },
};