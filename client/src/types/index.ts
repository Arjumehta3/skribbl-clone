export interface PlayerDTO {
  id: string;
  name: string;
  avatar: string; 
  score: number;
  isHost: boolean;
  isReady: boolean;
  isDrawing: boolean;
  hasGuessed: boolean;
}


export interface ScoreEntry {
  playerId: string;
  playerName: string;
  score: number;
}


export interface RoundEndData {
  word: string;
  scores: ScoreEntry[];
  nextDrawer: string | null;
}


export interface GameOverData {
  winner: ScoreEntry | null;
  leaderboard: ScoreEntry[];
}