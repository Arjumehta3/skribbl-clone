export const GamePhase = {
  LOBBY: "lobby",
  WORD_SELECTION: "word_selection",
  DRAWING: "drawing",
  ROUND_END: "round_end",
  GAME_OVER: "game_over",
} as const;
export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];
