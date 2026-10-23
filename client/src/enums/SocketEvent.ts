export const SocketEvent = {
  CREATE_ROOM: "create_room", JOIN_ROOM: "join_room",
  PLAYER_JOINED: "player_joined", PLAYER_LEFT: "player_left",
  START_GAME: "start_game", GAME_STATE: "game_state",
  ROUND_START: "round_start", WORD_CHOSEN: "word_chosen",
  ROUND_END: "round_end", GAME_OVER: "game_over",
  DRAW_START: "draw_start", DRAW_MOVE: "draw_move", DRAW_END: "draw_end",
  DRAW_DATA: "draw_data", CANVAS_CLEAR: "canvas_clear", DRAW_UNDO: "draw_undo",
  GUESS: "guess", GUESS_RESULT: "guess_result", CHAT: "chat", CHAT_MESSAGE: "chat_message",
} as const;
export type SocketEvent = (typeof SocketEvent)[keyof typeof SocketEvent];
