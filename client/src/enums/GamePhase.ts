export const GamePhase = {
  LOBBY: "LOBBY",
  WORD_SELECTION: "WORD_SELECTION",
  DRAWING: "DRAWING",
  ROUND_END: "ROUND_END",
  GAME_OVER: "GAME_OVER",
} as const;
export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];