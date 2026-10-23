import { Player } from "./Player.js";
import { Game } from "./Game.js";
import { GamePhase } from "../enums/GamePhase.js";
export class Room {
    id; // room code, jaise AB12XY
    settings;
    game = null;
    players = new Map();
    io;
    constructor(id, settings, io) {
        this.id = id;
        this.settings = settings;
        this.io = io;
    }
    // ---------- Players ----------
    addPlayer(player) {
        if (this.isFull()) {
            throw new Error("Room is full");
        }
        // Pehla player hamesha host banta hai
        if (this.players.size === 0) {
            player.isHost = true;
        }
        this.players.set(player.id, player);
    }
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player)
            return undefined;
        this.players.delete(playerId);
        // Host chala gaya to sabse purane player ko naya host banao
        if (player.isHost && this.players.size > 0) {
            const nextHost = this.players.values().next().value;
            if (nextHost)
                nextHost.isHost = true;
        }
        return player;
    }
    getPlayer(playerId) {
        return this.players.get(playerId);
    }
    getPlayers() {
        return Array.from(this.players.values());
    }
    getPlayersDTO() {
        return this.getPlayers().map((p) => p.toDTO());
    }
    isHost(playerId) {
        return this.players.get(playerId)?.isHost === true;
    }
    isFull() {
        return this.players.size >= this.settings.maxPlayers;
    }
    isEmpty() {
        return this.players.size === 0;
    }
    // ---------- Game ----------
    startGame() {
        if (this.game && this.game.phase !== GamePhase.GAME_OVER) {
            throw new Error("Game already started");
        }
        const game = new Game(this);
        game.start();
        this.game = game;
        return game;
    }
    updateSettings(newSettings) {
        if (this.game && this.game.phase !== GamePhase.GAME_OVER) {
            throw new Error("Cannot change settings during a game");
        }
        if (newSettings.maxPlayers < this.players.size) {
            throw new Error("Max players cannot be less than current players");
        }
        this.settings = newSettings;
    }
    resetToLobby() {
        this.game?.destroy();
        this.game = null;
        this.players.forEach((p) => p.resetForGame());
    }
    // ---------- Broadcast ----------
    // Room ke sabhi players ko event bhejo
    broadcast(event, data) {
        this.io.to(this.id).emit(event, data);
    }
    // Sirf ek player ko event bhejo
    sendTo(playerId, event, data) {
        this.io.to(playerId).emit(event, data);
    }
}
