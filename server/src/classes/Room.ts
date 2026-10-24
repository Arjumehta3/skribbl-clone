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
  private bannedNames: Set<string> = new Set(); // ban hue players ke naam (lowercase)
  private kickVotes: Map<string, Set<string>> = new Map(); // target -> voters

  constructor(id: string, settings: RoomSettings, io: Server) {
    this.id = id;
    this.settings = settings;
    this.io = io;
  }

  // ---------- Players ----------

  addPlayer(player: Player): void {
    if (this.isBanned(player.name)) {
      throw new Error("You are banned from this room");
    }
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
    this.kickVotes.delete(playerId);
    this.kickVotes.forEach((voters) => voters.delete(playerId));

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

  // ---------- Moderation ----------

  ban(name: string): void {
    this.bannedNames.add(name.trim().toLowerCase());
  }

  isBanned(name: string): boolean {
    return this.bannedNames.has(name.trim().toLowerCase());
  }

  // Votekick: baaki players (target ko chhod kar) ka majority chahiye, kam se kam 3 players
  addKickVote(targetId: string, voterId: string): { votes: number; needed: number } {
    const voters = this.kickVotes.get(targetId) ?? new Set<string>();
    voters.add(voterId);
    this.kickVotes.set(targetId, voters);

    const others = this.players.size - 1;
    return { votes: voters.size, needed: Math.floor(others / 2) + 1 };
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