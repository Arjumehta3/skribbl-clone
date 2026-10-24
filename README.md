# Skribbl Clone

A real-time multiplayer drawing and guessing game inspired by skribbl.io, built with React and TypeScript on the frontend and Node.js, Express, and Socket.IO on the backend.

Each turn, one player draws a secret word while the others try to guess it. Players earn points for correct guesses, the drawer changes every turn, and the highest score at the end wins.

## Live Demo

Add the deployed frontend URL here after deployment: https://your-frontend-url.onrender.com

Make sure the deployed app is accessible and the main game flow works before submitting.

## Features

**Rooms and Lobby**
- Create a room with configurable settings: player limit, rounds, drawing time, word choices, hints, language, and visibility.
- Join using a room code or invite link; private rooms stay accessible through either.
- Lobby with player list, avatar selection, and readiness; only the host can start the game or change settings.
- Quick Play joins an available public room or creates one when needed.

**Game Flow**
- Turn-based play: one player draws, the rest guess; the drawer picks a word from the options.
- Masked letters for players who haven't guessed, revealed hints, and a countdown timer.
- Round summary, final leaderboard, and winner.
- Late joiners in public rooms receive the current game state and drawing history.

**Drawing Tools**
- HTML5 Canvas with brush, colours, adjustable size, eraser, undo, and clear (current drawer only).
- Real-time sync via Socket.IO; mouse, touchpad, touchscreen, and pen input via Pointer Events.

**Chat and Guessing**
- Server-checked guesses, with feedback for close guesses and notifications for correct ones.
- General chat, with messages restricted for players who could reveal the secret word.

**Additional Features**
- Word categories: animals, objects, actions, food, nature, professions, vehicles, and sports.
- Word lists in English, Hindi (Roman letters), Spanish, and French; accents are ignored when matching Spanish and French guesses.
- Host moderation (kick, ban) and vote-kick.
- Player avatars, browser-saved preferences, and sound effects via the Web Audio API.
- Rate limits on chat and guesses, input sanitisation, and capped points for drawing activity.

## Technology Stack

| Area | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router |
| Drawing | HTML5 Canvas API and custom drawing logic |
| Backend | Node.js, Express, TypeScript |
| Real-time communication | Socket.IO |
| Deployment | Render |

## Project Structure

```
skribbl-clone/
├── client/                      # React frontend
│   └── src/
│       ├── pages/                # Home, room creation, lobby, and game pages
│       ├── components/           # Reusable UI components
│       ├── context/GameContext   # Game state updated from socket events
│       ├── Socket.ts             # Shared Socket.IO client
│       └── utils/                # Avatar, settings, and sound helpers
└── server/                       # Node.js and Socket.IO backend
    └── src/
        ├── classes/              # RoomManager, Room, Game, and Player
        ├── handlers/             # Room, game, drawing, and moderation events
        ├── data/                 # Word lists
        └── utils/                # Word matching, word selection, and validation helpers
```

## Architecture Overview

The frontend handles the UI, canvas interactions, and game updates, and talks to the backend through Socket.IO events. The backend manages rooms, validates player actions, controls game flow, calculates scores, and broadcasts updates to players in the same room.

The server is authoritative: clients send actions (drawing, guessing, selecting a word), and the server validates them and decides how the game state changes.

| Class | Responsibility |
|---|---|
| RoomManager | Creates and finds rooms, maps players to rooms, validates room settings, and finds public rooms for Quick Play. |
| Room | Manages players, host, settings, moderation, and room-level broadcasts. |
| Game | Manages phases, turn order, timers, hints, scoring, and drawing history. |
| Player | Stores name, avatar, score, readiness, and guessing status. |

Socket event handlers process incoming events and call these classes to perform game operations.

## How Real-Time Drawing Works

1. The drawer's browser captures `pointerdown`, `pointermove`, and `pointerup` events on the canvas.
2. Canvas coordinates are normalised so positions work across different screen sizes.
3. The client sends stroke start, movement, and end events to the server.
4. The server checks the player may draw, stores the stroke data, and broadcasts updates to the room.
5. Each client updates its local stroke list and redraws when needed; undo and clear are synchronised.
6. Late joiners receive the existing canvas state to see the drawing in progress.

## How Game State Works

Phases: `LOBBY -> WORD_SELECTION -> DRAWING -> ROUND_END -> next turn or round -> GAME_OVER`

- Players are placed in a turn queue so everyone takes turns drawing.
- In word selection, the drawer gets word options; if none is chosen in time, the game picks one automatically.
- During drawing, the server broadcasts timer updates and reveals hints per the room settings.
- A turn ends when the timer runs out or all eligible players have guessed the word.
- Each player only receives the information they may see; the secret word is hidden from players who haven't guessed it.
- If the drawer leaves, the current turn ends. The game ends if fewer than two players remain.

### Scoring
- Correct guessers earn points based on remaining time, with a minimum score and an early-guess bonus.
- The drawer earns points for each player who guesses correctly.
- At the end, the server sends the final leaderboard and winner.

### Word Matching
Implemented in `server/src/utils/wordMatcher.ts`.
- Guesses are trimmed, lowercased, and normalised for accent differences.
- A guess must match the word exactly after normalisation; partial matches are not accepted.
- A guess one letter off with the same length triggers a private close-guess message.
- The drawer and players who already guessed correctly cannot submit further active guesses.

## Socket.IO Communication and Validation

Socket.IO rooms send updates only to players in the relevant game room. The server validates host-only actions, drawing permissions, guesses, and chat messages, and rate-limits chat and guess events.

### Client to Server

| Event | Purpose |
|---|---|
| `create_room` | Create a room and make the creator its host. |
| `join_room` | Join a room using its code or link. |
| `quick_play` | Join or create a public room. |
| `update_settings` | Update room settings; host-only. |
| `toggle_ready` | Change a player's ready status. |
| `start_game` | Start the game; host-only. |
| `play_again` | Start another game after the previous one ends; host-only. |
| `leave_room` | Leave the current room. |
| `word_chosen` | Submit the drawer's selected word. |
| `draw_start`, `draw_move`, `draw_end` | Send drawing stroke events. |
| `canvas_clear`, `draw_undo` | Clear the canvas or undo a stroke. |
| `guess` | Submit a word guess. |
| `chat` | Send a chat message. |
| `kick_player`, `ban_player` | Moderate a room; host-only. |
| `vote_kick` | Vote to remove a player, subject to the game's rules. |

### Server to Client

| Event | Purpose |
|---|---|
| `room_joined`, `player_joined`, `player_left`, `players_updated` | Room membership and player updates. |
| `settings_updated`, `room_reset`, `auto_start` | Room settings and public-room start status. |
| `game_state`, `round_start`, `timer_tick`, `hint_update` | Current game state, round, timer, and hints. |
| `round_end`, `game_over` | Round results and final game results. |
| `draw_data`, `canvas_clear`, `draw_undo`, `canvas_state` | Canvas activity and drawing history. |
| `guess_result`, `chat_message`, `system_message` | Guesses, chat, and system notifications. |
| `kicked`, `error` | Moderation results and validation errors. |

## Run the Project Locally

**Requirements:** Node.js 18 or newer, npm

**1. Start the backend** (runs on http://localhost:3000 by default)

```bash
cd server
npm install
npm run dev
```

**2. Start the frontend** (in a second terminal)

```bash
cd client
npm install
npm run dev -- --host
```

Open http://localhost:5173. To test multiplayer, open two or more browser tabs and create or join the same room.

**Testing on a phone:** Connect the phone and computer to the same Wi-Fi, then open `http://<your-computer-ip>:5173` on the phone. Make sure the frontend can reach the backend at the computer's local IP.

## Environment Variables

| Location | Variable | Purpose |
|---|---|---|
| Backend | `PORT` | Server port. Defaults to 3000. |
| Backend | `CLIENT_URL` | Frontend origin allowed by CORS; comma-separate multiple origins. Configure for deployment. |
| Frontend | `VITE_SERVER_URL` | Backend Socket.IO server URL. If unset, the client uses the current host with port 3000. |

## Deployment on Render

Two Render services are used: a backend Web Service (Node.js and Socket.IO) and a frontend Static Site (React build).

**1. Deploy the backend**
- Create a Web Service for the repository with root directory `server`.
- Build command: `npm install --include=dev && npm run build`
- Start command: `npm start`
- Add `NODE_VERSION=20` if required.
- Set `CLIENT_URL` to the deployed frontend URL (can be updated after creating the frontend).

**2. Deploy the frontend**
- Create a Static Site for the same repository with root directory `client`.
- Build command: `npm install --include=dev && npm run build`
- Publish directory: `dist`
- Set `VITE_SERVER_URL` to the deployed backend URL.
- Add a rewrite rule from `/*` to `/index.html` so client-side routes load after refresh.

**3. Connect and test**
1. Deploy the backend and copy its public URL.
2. Set it as `VITE_SERVER_URL` in the frontend service and deploy the frontend.
3. Set the frontend URL as `CLIENT_URL` in the backend service and redeploy if needed.
4. Open the frontend URL and test room creation, joining from a second browser, drawing, guessing, scoring, and the end-of-game flow.
5. Add the actual frontend URL to the Live Demo section above.

**Deployment notes**
- `VITE_SERVER_URL` is set at build time; changing it requires a new frontend build and deployment.
- Rooms and active games live in server memory, so restarting the backend ends active games.
- The room-management design targets a single backend instance; multiple instances would need shared state and appropriate Socket.IO configuration.
- On free plans, the first request after inactivity may be slow while the service starts.

## Current Scope and Technical Notes

- **Word modes:** Only Normal mode is supported; Hidden and Combination modes are not yet implemented.
- **Room state:** Stored in server memory (see deployment notes); designed for a single server instance.
- **Moderation:** Bans are tied to player names, not persistent user accounts.

## Future Improvements

- Implement Hidden and Combination word modes.
- Add custom word lists and drawing replay.
- Use Redis or another shared store for persistent room state or multiple backend instances.