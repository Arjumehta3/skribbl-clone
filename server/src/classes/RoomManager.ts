
import type { Server } from "socket.io";
import { Room } from "./Room.js";
import { Player } from "./Player.js";
import { generateRoomCode } from "../utils/roomCode.js";
import { DEFAULT_SETTINGS, LIMITS } from "../config.js";
import { GamePhase } from "../enums/GamePhase.js";
import { WordMode } from "../enums/WordMode.js";
import type { RoomSettings } from "../types/index.js";

function clamp(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const n = Number(value);

  if (!Number.isFinite(n)) return fallback;

  return Math.min(max, Math.max(min, Math.round(n)));
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerRooms: Map<string, string> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  sanitizeSettings(input: Partial<RoomSettings> = {}): RoomSettings {
    const d = DEFAULT_SETTINGS;

    const wordMode = Object.values(WordMode).includes(
      input.wordMode as WordMode
    )
      ? (input.wordMode as WordMode)
      : d.wordMode;

    return {
      maxPlayers: clamp(
        input.maxPlayers,
        LIMITS.maxPlayers.min,
        LIMITS.maxPlayers.max,
        d.maxPlayers
      ),
      rounds: clamp(
        input.rounds,
        LIMITS.rounds.min,
        LIMITS.rounds.max,
        d.rounds
      ),
      drawTime: clamp(
        input.drawTime,
        LIMITS.drawTime.min,
        LIMITS.drawTime.max,
        d.drawTime
      ),
      wordCount: clamp(
        input.wordCount,
        LIMITS.wordCount.min,
        LIMITS.wordCount.max,
        d.wordCount
      ),
      hints: clamp(
        input.hints,
        LIMITS.hints.min,
        LIMITS.hints.max,
        d.hints
      ),
      wordMode,
      isPrivate:
        typeof input.isPrivate === "boolean"
          ? input.isPrivate
          : d.isPrivate,
    };
  }

  createRoom(settings?: Partial<RoomSettings>): Room {
    let code = generateRoomCode();

    while (this.rooms.has(code)) {
      code = generateRoomCode();
    }

    const room = new Room(
      code,
      this.sanitizeSettings(settings),
      this.io
    );

    this.rooms.set(code, room);

    return room;
  }

  // Quick Play ke liye suitable public room dhoondho
  findPublicRoom(): Room | undefined {
    let running: Room | undefined;

    for (const room of this.rooms.values()) {
      if (room.settings.isPrivate || room.isFull()) continue;
      if (!room.game || room.game.phase === GamePhase.GAME_OVER) return room; // lobby wala pehle
      running ??= room; // warna chalta hua game join karwa do
    }

    return running;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId.trim().toUpperCase());
  }

  getRoomByPlayer(playerId: string): Room | undefined {
    const roomId = this.playerRooms.get(playerId);

    return roomId ? this.rooms.get(roomId) : undefined;
  }

  joinRoom(roomId: string, player: Player): Room {
    const room = this.getRoom(roomId);

    if (!room) {
      throw new Error("Room not found");
    }

    room.addPlayer(player);
    this.playerRooms.set(player.id, room.id);

    return room;
  }

  leaveRoom(
    playerId: string
  ): { room: Room; player: Player } | undefined {
    const room = this.getRoomByPlayer(playerId);

    if (!room) return undefined;

    const player = room.removePlayer(playerId);
    this.playerRooms.delete(playerId);

    if (!player) return undefined;

    if (room.isEmpty()) {
      this.deleteRoom(room.id);
    }

    return { room, player };
  }

  deleteRoom(roomId: string): void {
    this.rooms.get(roomId)?.destroy();
    this.rooms.delete(roomId);
  }
}
