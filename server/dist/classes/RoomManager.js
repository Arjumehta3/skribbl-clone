import { Room } from "./Room.js";
import { Player } from "./Player.js";
import { generateRoomCode } from "../utils/roomCode.js";
import { DEFAULT_SETTINGS, LANGUAGES, LIMITS } from "../config.js";
import { GamePhase } from "../enums/GamePhase.js";
import { WordMode } from "../enums/WordMode.js";
function clamp(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
}
export class RoomManager {
    rooms = new Map();
    playerRooms = new Map();
    io;
    constructor(io) {
        this.io = io;
    }
    sanitizeSettings(input = {}) {
        const d = DEFAULT_SETTINGS;
        const wordMode = Object.values(WordMode).includes(input.wordMode)
            ? input.wordMode
            : d.wordMode;
        const language = LANGUAGES.includes(input.language)
            ? input.language
            : d.language;
        return {
            maxPlayers: clamp(input.maxPlayers, LIMITS.maxPlayers.min, LIMITS.maxPlayers.max, d.maxPlayers),
            rounds: clamp(input.rounds, LIMITS.rounds.min, LIMITS.rounds.max, d.rounds),
            drawTime: clamp(input.drawTime, LIMITS.drawTime.min, LIMITS.drawTime.max, d.drawTime),
            wordCount: clamp(input.wordCount, LIMITS.wordCount.min, LIMITS.wordCount.max, d.wordCount),
            hints: clamp(input.hints, LIMITS.hints.min, LIMITS.hints.max, d.hints),
            wordMode,
            isPrivate: typeof input.isPrivate === "boolean"
                ? input.isPrivate
                : d.isPrivate,
            language,
        };
    }
    createRoom(settings) {
        let code = generateRoomCode();
        while (this.rooms.has(code)) {
            code = generateRoomCode();
        }
        const room = new Room(code, this.sanitizeSettings(settings), this.io);
        this.rooms.set(code, room);
        return room;
    }
    // Quick Play ke liye suitable public room dhoondho
    // Same language wale room ko pehle; jis room se ban hai wo skip
    findPublicRoom(language = "English", playerName = "") {
        let running;
        for (const room of this.rooms.values()) {
            if (room.settings.isPrivate || room.isFull())
                continue;
            if (room.settings.language !== language)
                continue;
            if (room.isBanned(playerName))
                continue;
            if (!room.game || room.game.phase === GamePhase.GAME_OVER)
                return room; // lobby wala pehle
            running ??= room; // warna chalta hua game join karwa do
        }
        return running;
    }
    getRoom(roomId) {
        return this.rooms.get(roomId.trim().toUpperCase());
    }
    getRoomByPlayer(playerId) {
        const roomId = this.playerRooms.get(playerId);
        return roomId ? this.rooms.get(roomId) : undefined;
    }
    joinRoom(roomId, player) {
        const room = this.getRoom(roomId);
        if (!room) {
            throw new Error("Room not found");
        }
        room.addPlayer(player);
        this.playerRooms.set(player.id, room.id);
        return room;
    }
    leaveRoom(playerId) {
        const room = this.getRoomByPlayer(playerId);
        if (!room)
            return undefined;
        const player = room.removePlayer(playerId);
        this.playerRooms.delete(playerId);
        if (!player)
            return undefined;
        if (room.isEmpty()) {
            this.deleteRoom(room.id);
        }
        return { room, player };
    }
    deleteRoom(roomId) {
        this.rooms.get(roomId)?.destroy();
        this.rooms.delete(roomId);
    }
}
