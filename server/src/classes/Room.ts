import type { Server } from "socket.io";
import { Player } from "./Player.js";
import { Game } from "./Game.js";
import { GamePhase } from "../enums/GamePhase.js";
import type { PlayerDTO, RoomSettings } from "../types/index.js";

export class Room {
  public readonly id: string; // room code, jaise AB12XY
  public settings: RoomSettings;
  public game: Game | null = null;
  private players: Map<string, Player> = new Map();
  private io: Server;
  private autoStartTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(id: string, settings: RoomSettings, io: Server) {
    this.id = id;
    this.settings = settings;
    this.io = io;
  }

  // ---------- Players ----------

  addPlayer(player: Player): void {
    if (this.isFull()) {
      throw new Error("Room is full");
    }
    // Pehla player hamesha host banta hai
    if (this.players.size === 0) {
      player.isHost = true;
    }
    this.players.set(player.id, player);
  }

  removePlayer(playerId: string): Player | undefined {
    const player = this.players.get(playerId);
    if (!player) return undefined;

    this.players.delete(playerId);

    // Host chala gaya to sabse purane player ko naya host banao
    if (player.isHost && this.players.size > 0) {
      const nextHost = this.players.values().next().value;
      if (nextHost) nextHost.isHost = true;
    }
    return player;
  }

  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  getPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  getPlayersDTO(): PlayerDTO[] {
    return this.getPlayers().map((p) => p.toDTO());
  }

  isHost(playerId: string): boolean {
    return this.players.get(playerId)?.isHost === true;
  }

  isFull(): boolean {
    return this.players.size >= this.settings.maxPlayers;
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  // ---------- Game ----------

  startGame(): Game {
    if (this.game && this.game.phase !== GamePhase.GAME_OVER) {
      throw new Error("Game already started");
    }
    const game = new Game(this);
    game.start();
    this.game = game;
    return game;
  }

  updateSettings(newSettings: RoomSettings): void {
    if (this.game && this.game.phase !== GamePhase.GAME_OVER) {
      throw new Error("Cannot change settings during a game");
    }
    if (newSettings.maxPlayers < this.players.size) {
      throw new Error("Max players cannot be less than current players");
    }
    this.settings = newSettings;
  }

  // Public (Quick Play) room: 2+ players hote hi game apne aap shuru ho jata hai
  scheduleAutoStart(delayMs = 5000): void {
    if (this.settings.isPrivate || this.autoStartTimer) return;
    if (this.players.size < 2) return;
    if (this.game && this.game.phase !== GamePhase.GAME_OVER) return;

    this.broadcast("auto_start", { seconds: Math.round(delayMs / 1000) });
    this.autoStartTimer = setTimeout(() => {
      this.autoStartTimer = null;
      if (this.players.size < 2) return;
      if (this.game && this.game.phase !== GamePhase.GAME_OVER) return;
      if (this.game) this.resetToLobby();
      try {
        this.startGame();
      } catch {
        // 2 se kam player bache to kuch nahi
      }
    }, delayMs);
  }

  cancelAutoStartIfNeeded(): void {
    if (this.autoStartTimer && this.players.size < 2) {
      clearTimeout(this.autoStartTimer);
      this.autoStartTimer = null;
    }
  }

  resetToLobby(): void {
    this.game?.destroy();
    this.game = null;
    this.players.forEach((p) => p.resetForGame());
    this.broadcast("room_reset", {
      players: this.getPlayersDTO(),
      settings: this.settings,
    });
  }

  destroy(): void {
    if (this.autoStartTimer) clearTimeout(this.autoStartTimer);
    this.autoStartTimer = null;
    this.game?.destroy();
  }

  // ---------- Broadcast ----------

  // Room ke sabhi players ko event bhejo
  broadcast(event: string, data?: unknown): void {
    this.io.to(this.id).emit(event, data);
  }

  // Sirf ek player ko event bhejo
  sendTo(playerId: string, event: string, data?: unknown): void {
    this.io.to(playerId).emit(event, data);
  }
}