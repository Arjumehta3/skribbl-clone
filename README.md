# Skribbl Clone

A real-time multiplayer drawing and guessing game (a clone of [skribbl.io](https://skribbl.io)) built with **React + TypeScript + Vite** on the frontend and **Node.js + Express + Socket.IO** on the backend.

One player draws a secret word while everyone else tries to guess it. Faster guesses earn more points, drawers rotate every turn, and the player with the most points at the end wins.

## Live Demo

**https://skribbl-clone-197y.onrender.com**

> Hosted on a free tier, so the first load after a period of inactivity can take 30–60 seconds while the server wakes up.

---

## Features

### Rooms and lobby
- Create a room with host-configurable settings: max players (2–20), rounds (2–10), draw time (15–240 s), words per turn (1–5), hints (0–5), word language, public or private
- Join with a **room code** or an **invite link** (`/room/ABC123`)
- Lobby with player list, avatars, ready-up, and host-only Start
- **Play button (Quick Play):** drops you into a random public room (same language), or creates one. The game starts automatically once 2 or more players are in, and restarts automatically after it ends
- Private rooms are invite-only through the code or link

### Game flow
- Turn-based: one drawer per turn, everyone else guesses
- Drawer picks 1 of N words, the others see blanks (`_ _ _ _ _`)
- Hints reveal letters over time
- Round and turn countdown, round-end summary, final leaderboard and winner
- Late joiners in public rooms get the current state and the drawing so far

### Drawing
- HTML5 Canvas with brush, 12 colors, brush size, eraser, undo, clear (drawer only)
- Real-time sync to all players over WebSockets
- Works with **mouse, touchpad, touch and pen** (Pointer Events), so it is fully usable on phones

### Chat and guessing
- Guess input checked on the server, "close guess" feedback, "X guessed the word!" notification
- General chat for the drawer and for players who already guessed, so the word is never leaked

### Extras
- Word categories (animals, objects, actions, food, nature, professions, vehicles, sports, and more)
- Word languages: **English, Hindi (Roman letters), Spanish, French**. Spanish and French guesses ignore accents
- Host moderation: **kick** and **ban**; **votekick** for everyone else (needs 3+ players and a majority of the other players)
- Player avatars
- In-game settings: volume, rebindable hotkeys (Brush / Undo / Clear / Swap), chat input position, chat bubbles on the canvas. Saved in the browser
- Sound effects generated with the Web Audio API (no audio files)
- Rate limiting on chat and guesses, input sanitising, and a cap on points per stroke

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router |
| Canvas | HTML5 Canvas API with custom drawing logic |
| Backend | Node.js, Express, TypeScript |
| Real-time | Socket.IO |
| Deployment | Render |

---

## Project Structure

```
skribbl-clone/
├── client/                      # React app
│   └── src/
│       ├── pages/               # Home, CreateRoom, JoinRoom, Lobby, Game
│       ├── components/          # DoodleAvatar, SettingsPanel, ModerationButtons
│       ├── context/GameContext  # Socket events -> React state (single source of truth)
│       ├── Socket.ts            # Shared socket.io client
│       └── utils/               # avatar, settings, sound helpers
└── server/                      # Node + Socket.IO
    └── src/
        ├── classes/             # RoomManager, Room, Game, Player  (OOP core)
        ├── handlers/            # room, game, draw, moderation socket handlers
        ├── data/                # word lists (words.ts, wordLists.ts)
        └── utils/               # wordMatcher, wordPicker, rateLimiter, cleanName
```

---

## Architecture Overview

```
 Browser (React)                          Server (Node + Socket.IO)
┌────────────────────┐   WebSocket    ┌─────────────────────────────┐
│ Pages / Canvas     │ <────────────> │ Handlers (thin event layer) │
│ GameContext        │   events       │   roomHandlers              │
│  (state from       │                │   gameHandlers              │
│   socket events)   │                │   drawHandlers              │
└────────────────────┘                │   moderationHandlers        │
                                      │            │                │
                                      │            v                │
                                      │  RoomManager ── Room ── Game│
                                      │                  └─ Player  │
                                      └─────────────────────────────┘
```

The server is **authoritative**. Clients only send intentions (draw a point, guess a word, pick a word). The server validates them, updates game state, and broadcasts the result.

### OOP design (server)
| Class | Responsibility |
|---|---|
| `RoomManager` | Creates and finds rooms, maps players to rooms, validates and sanitises settings, finds public rooms for Quick Play |
| `Room` | Players, host handling, settings, bans and kick votes, broadcast helpers, auto-start for public rooms |
| `Game` | The state machine: phases, turn queue, timers, hints, scoring, stroke history |
| `Player` | Name, avatar, score, ready and guessed flags |

Socket handlers stay thin. They validate input and call into these classes, so game logic is not mixed with networking.

### How drawing strokes are captured, sent and rendered
1. The drawer's browser listens to **Pointer Events** on the canvas (`pointerdown`, `pointermove`, `pointerup`). One code path covers mouse, touch and pen.
2. Each point is **normalised to 0–1** (position divided by the canvas size), so the drawing looks identical on any screen size. The canvas has a fixed internal resolution of 1000×700.
3. The client sends `draw_start { x, y, color, size }`, then many `draw_move { x, y }`, then `draw_end`. Points closer than a small threshold are skipped to save bandwidth, and on phones the coalesced pointer events are used so lines stay smooth.
4. The server checks the sender is the current drawer during the drawing phase, stores the stroke, and broadcasts `draw_data` to the room.
5. Every client keeps a **list of strokes**. New points are painted incrementally. Undo and clear just edit that list and repaint, so all clients stay consistent.
6. Late joiners receive the full stroke list in `canvas_state` and repaint it.

### How game state is managed
`Game` is a state machine driven by server timers:

```
LOBBY -> WORD_SELECTION -> DRAWING -> ROUND_END -> (next drawer) ... -> GAME_OVER
```

- A **turn queue** is built from the players. Each player draws once per round, and the queue is refilled for the next round. Players who join mid-game are added to the next round.
- `WORD_SELECTION`: the drawer gets `wordOptions` (and only the drawer). If they do not pick in time, a word is chosen automatically.
- `DRAWING`: a 1-second timer broadcasts `timer_tick`. Hints are scheduled by splitting the draw time into `hints + 1` parts, and each one reveals another random letter via `hint_update`.
- The turn ends when time runs out or when **everyone has guessed**.
- Each client gets a personalised `game_state`. Only the drawer and players who guessed correctly receive the real word, everyone else gets the masked version.
- If the drawer leaves, the turn ends. If fewer than 2 players remain, the game ends.

### Scoring
- Correct guess: `max(50, round(500 × timeLeft / drawTime))`, plus a **+100 bonus** if guessed in the first 25% of the time
- The drawer earns 50 points per player who guessed
- Highest total at the end wins, and the leaderboard is sent in `game_over`

### Word matching logic
Implemented in `server/src/utils/wordMatcher.ts`:
- Guess and word are **trimmed, lower-cased, and accent-stripped** (Unicode NFD normalisation, so `montaña` matches `montana`, and `œ` is treated as `oe`)
- A guess is correct only on an **exact match** after normalising. Partial matches do not count
- A guess that differs by **exactly one letter** (same length) triggers a private "That was close!" message
- Players who already guessed, and the drawer, cannot send guesses. Their messages go to chat so they cannot leak the word

### How WebSockets are used
Socket.IO rooms (`socket.join(roomId)`) are used for broadcasting, so only members of a room see its events. The server never trusts the client: host-only actions (start, settings, kick, ban) check `room.isHost`, drawing events check `drawerId` and the current phase, and chat and guesses go through a rate limiter.

---

## WebSocket Events

**Client -> Server**

| Event | Payload | Notes |
|---|---|---|
| `create_room` | `{ hostName, avatar, settings }` | Creates a room, creator becomes host |
| `join_room` | `{ roomId, playerName, avatar }` | Join by code or link |
| `quick_play` | `{ playerName, avatar, language }` | Join or create a public room |
| `update_settings` | partial settings | Host only, lobby only |
| `toggle_ready` | - | |
| `start_game` | - | Host only |
| `play_again` | - | Host only, after game over |
| `leave_room` | - | |
| `word_chosen` | `{ word }` | Drawer only |
| `draw_start` / `draw_move` / `draw_end` | `{ x, y, color, size }` / `{ x, y }` / - | Drawer only |
| `canvas_clear` / `draw_undo` | - | Drawer only |
| `guess` | `{ text }` | |
| `chat` | `{ text }` | |
| `kick_player` / `ban_player` | `{ playerId }` | Host only |
| `vote_kick` | `{ playerId }` | 3+ players |

**Server -> Client**

| Event | Description |
|---|---|
| `room_joined`, `player_joined`, `player_left`, `players_updated`, `settings_updated`, `room_reset` | Lobby and room state |
| `auto_start` | Public room countdown before the game begins |
| `game_state`, `round_start`, `timer_tick`, `hint_update`, `round_end`, `game_over` | Game flow |
| `draw_data`, `canvas_clear`, `draw_undo`, `canvas_state` | Drawing sync |
| `guess_result`, `chat_message`, `system_message` | Guessing and chat |
| `kicked`, `error` | Moderation and validation errors |

---

## Run Locally

**Requirements:** Node.js 18 or newer.

```bash
# 1. Server  (http://localhost:3000)
cd server
npm install
npm run dev

# 2. Client  (http://localhost:5173)  -- in a second terminal
cd client
npm install
npm run dev -- --host
```

Open `http://localhost:5173` in two or more browser tabs and press **Play**, or create a room and share its code.

**Testing on a phone:** connect the phone to the same Wi-Fi and open `http://<your-computer-ip>:5173`. The client automatically looks for the server at `<same-host>:3000`.

### Environment variables

| Where | Variable | Purpose |
|---|---|---|
| server | `PORT` | Port to listen on (default `3000`; set automatically by most hosts) |
| server | `CLIENT_URL` | Allowed frontend origin(s) for CORS, comma separated. If unset, all origins are allowed (development only) |
| client | `VITE_SERVER_URL` | Backend URL. If unset, defaults to `<current host>:3000` |

---

## Deployment (Render)

The whole app runs as **one Render Web Service**. The Node server serves the Socket.IO connection **and** the built React app (`client/dist`), so there is a single URL and no CORS setup.

**Web Service settings**
- Root directory: *(leave empty, repository root)*
- Build command: `cd client && npm install --include=dev && npm run build && cd ../server && npm install --include=dev && npm run build`
- Start command: `cd server && npm start`
- Environment: `NODE_VERSION=20`
- Health check path: `/health`

How it works: during the build, Vite creates `client/dist`. At startup the server checks whether that folder exists and, if so, serves it as static files and falls back to `index.html` for React Router links such as `/room/ABC123`. In local development `client/dist` does not exist, so the server only does WebSockets and Vite serves the UI.

**Alternative: split deployment.** The frontend can also be a separate static site (set `VITE_SERVER_URL` to the backend URL at build time, and `CLIENT_URL` on the backend for CORS).

**Platform notes**
- Vercel and Netlify cannot host a long-running WebSocket server, so a split setup needs the backend on Render, Railway, or similar
- `VITE_SERVER_URL` (split setup only) is baked in at build time, so changing it requires redeploying the frontend
- Rooms live in server memory. A redeploy or restart ends all running games
- The free tier sleeps after inactivity, so the first request can be slow

---

## Known Limitations

- **Word mode:** the setting (Normal / Hidden / Combination) is stored and shown, but only Normal behaviour is implemented
- Rooms are stored in memory, so they do not survive a server restart and the server runs as a single instance
- Bans are by player name, so a banned player can come back under a different name
- Hindi words use Roman letters, so unusual spellings (for example `hathi` instead of `haathi`) are not accepted
- Fill tool and spectator mode are not implemented

## Possible Improvements

- Persist rooms in Redis and use the Socket.IO Redis adapter to scale to multiple instances
- Implement Hidden and Combination word modes, a fill tool, and a replay of the last round
- Custom host-provided word lists
