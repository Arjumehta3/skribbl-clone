export enum SocketEvent {
  
  CREATE_ROOM = "create_room",
  JOIN_ROOM = "join_room",
  ROOM_JOINED = "room_joined",
  PLAYER_JOINED = "player_joined",
  PLAYER_LEFT = "player_left",
  START_GAME = "start_game",
    LEAVE_ROOM = "leave_room",

 
  GAME_STATE = "game_state",
  ROUND_START = "round_start",
  WORD_CHOSEN = "word_chosen",
  TIMER_TICK = "timer_tick",
  HINT_UPDATE = "hint_update",
  ROUND_END = "round_end",
  GAME_OVER = "game_over",


  DRAW_START = "draw_start",
  DRAW_MOVE = "draw_move",
  DRAW_END = "draw_end",
  DRAW_DATA = "draw_data",
  CANVAS_CLEAR = "canvas_clear",
  DRAW_UNDO = "draw_undo",

  
  GUESS = "guess",
  GUESS_RESULT = "guess_result",
  CHAT = "chat",
  CHAT_MESSAGE = "chat_message",

  ERROR = "error",

  
}