# Skribbl Clone — Frontend

React + TypeScript + Vite frontend for the skribbl.io clone assignment.

## Current frontend features

- Home screen with animated avatar selection, optional player name, language selector and tutorial.
- Blank names automatically receive a generated `Player####` name.
- Create-room settings: player limit (2–20), rounds (2–10), drawing time (15–240s), word count (1–5), hints and word mode.
- Join-room screen with room-code validation on the client.
- Lobby/drawing UI with canvas pointer drawing, pen, eraser, colors, brush size, clear canvas, timer, word choices, chat input, reactions and player list.
- Game-over screen placeholder.
- Responsive layouts for desktop and mobile.
- Socket.IO client adapter and suggested event names ready for backend integration.

## Run locally

Requirements: Node.js 20.19+ or 22.12+ recommended for the installed Vite major version.

```bash
cd client
npm install
npm run dev
```

Open the local URL printed by Vite.

To check TypeScript:

```bash
npm run build
```

## Backend integration status

**This folder is frontend-only.** The screens currently use browser `sessionStorage`, demo players, a local timer and local canvas/chat state. Multiple browsers will NOT share rooms or drawings yet.

Search the source for `BACKEND REQUIRED` comments/labels. The following must be implemented by the backend before the assignment can be considered end-to-end complete:

1. `create_room`: persist room and settings; return a server-generated room ID/code.
2. `join_room`: validate room code and player limit; broadcast `player_joined` and `player_left`.
3. `start_game`: host-only authorization and authoritative round/turn state.
4. `round_start`, `word_chosen`, `game_state`, `round_end`, `game_over`: server owns word selection, timer, hints, drawer order, final scores and winner.
5. `draw_start`, `draw_move`, `draw_end`, `draw_data`, `canvas_clear`, `draw_undo`: broadcast drawing strokes to every client in the same room and validate that only the drawer can draw.
6. `guess`, `guess_result`: normalize guesses (`trim`, case-insensitive comparison), award points on the server and notify all clients.
7. `chat`, `chat_message`: broadcast room chat safely.
8. Reconnect/disconnect handling, input validation, rate limiting and room cleanup.
9. Configure production CORS and deploy the frontend plus a persistent WebSocket-capable backend.

### Configure Socket.IO URL

Copy `.env.example` to `.env` and set:

```env
VITE_SOCKET_URL=http://localhost:5000
```

The client adapter in `src/Socket.ts` will not attempt a connection if this value is absent. The current screens are not yet wired to all socket events; the backend can be developed separately, then the UI event handlers can be connected to it.

## Suggested backend contract

See `src/enums/SocketEvent.ts` and the assignment document's suggested event list. The event names are kept close to the brief:

- Room/lobby: `create_room`, `join_room`, `player_joined`, `player_left`, `start_game`
- Game: `game_state`, `round_start`, `word_chosen`, `round_end`, `game_over`
- Drawing: `draw_start`, `draw_move`, `draw_end`, `draw_data`, `canvas_clear`, `draw_undo`
- Chat/guess: `guess`, `guess_result`, `chat`, `chat_message`

## Important notes

- No API keys, database credentials or backend secrets belong in the frontend bundle.
- `sessionStorage` is only used to carry demo player/room values between pages; it is not a source of truth or secure storage.
- The generated room code in demo mode is not a real server room and cannot be joined from another device.
