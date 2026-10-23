import type { Server, Socket } from "socket.io";
import { RoomManager } from "../classes/RoomManager.js";
import { SocketEvent } from "../enums/SocketEvent.js";
import { GamePhase } from "../enums/GamePhase.js";
import { createRateLimiter } from "../utils/rateLimiter.js";
import { MAX_MESSAGE_LENGTH, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from "../config.js";

interface WordChosenData {
  word?: string;
}

interface TextData {
  text?: string;
}

export function registerGameHandlers(_io: Server, socket: Socket, rooms: RoomManager): void {
  // Is socket ke guess aur chat dono isi limiter se guzarte hain
  const allowMessage = createRateLimiter(RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);

  // Text ko trim karta hai; khali, bahut lamba ya spam ho to null deta hai
  const cleanText = (data: TextData): string | null => {
    const text = typeof data?.text === "string" ? data.text.trim() : "";
    if (!text || text.length > MAX_MESSAGE_LENGTH) return null;
    if (!allowMessage()) return null;
    return text;
  };

  socket.on(SocketEvent.START_GAME, () => {
    const room = rooms.getRoomByPlayer(socket.id);
    if (!room) return;

    // Sirf host game start kar sakta hai
    if (!room.isHost(socket.id)) {
      socket.emit(SocketEvent.ERROR, { message: "Only the host can start the game" });
      return;
    }

    // Host ke alawa sab ready hone chahiye
    if (!room.getPlayers().every((p) => p.isHost || p.isReady)) {
      socket.emit(SocketEvent.ERROR, { message: "All players must be ready" });
      return;
    }

    try {
      room.startGame();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start game";
      socket.emit(SocketEvent.ERROR, { message });
    }
  });

  socket.on(SocketEvent.WORD_CHOSEN, (data: WordChosenData) => {
    const room = rooms.getRoomByPlayer(socket.id);
    if (!room?.game || typeof data?.word !== "string") return;
    room.game.chooseWord(socket.id, data.word); // drawer aur options ka check Game ke andar hai
  });

  socket.on(SocketEvent.GUESS, (data: TextData) => {
    const room = rooms.getRoomByPlayer(socket.id);
    const player = room?.getPlayer(socket.id);
    const text = cleanText(data);
    if (!room?.game || !player || !text) return;

    const outcome = room.game.handleGuess(socket.id, text);

    // Sahi guess ka text chat mein nahi dikhate (word leak ho jayega).
    // Galat ya close guess sabko dikhta hai.
    if (outcome === "wrong" || outcome === "close") {
      room.broadcast(SocketEvent.CHAT_MESSAGE, {
        playerId: player.id,
        playerName: player.name,
        text,
      });
    }
  });

  socket.on(SocketEvent.CHAT, (data: TextData) => {
    const room = rooms.getRoomByPlayer(socket.id);
    const player = room?.getPlayer(socket.id);
    const text = cleanText(data);
    if (!room || !player || !text) return;

    const message = { playerId: player.id, playerName: player.name, text };
    const game = room.game;

    // Drawing ke dauran drawer aur sahi guess karne walon ka chat sirf unhi tak
    const drawerId = game?.getDrawerId();
    const restricted =
      game?.phase === GamePhase.DRAWING && (player.id === drawerId || player.hasGuessed);

    if (restricted) {
      for (const p of room.getPlayers()) {
        if (p.id === drawerId || p.hasGuessed) {
          room.sendTo(p.id, SocketEvent.CHAT_MESSAGE, message);
        }
      }
    } else {
      room.broadcast(SocketEvent.CHAT_MESSAGE, message);
    }
  });
}