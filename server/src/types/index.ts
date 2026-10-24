import { WordMode } from "../enums/WordMode.js";

export interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  drawTime: number; 
  wordCount: number; 
  hints: number; 
  wordMode: WordMode;
  isPrivate: boolean;
}

export interface Point {
  x: number; 
  y: number; 
}

export interface Stroke {
  points: Point[];
  color: string;
  size: number;
}


export interface PlayerDTO {
  id: string;
  name: string;
  score: number;
  hasGuessed: boolean;
  isHost: boolean;
    isReady: boolean;
    avatar: string;
}