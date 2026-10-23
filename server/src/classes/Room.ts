import type { Server } from "socket.io";
import { Player } from "./Player.js";
import type { PlayerDTO, RoomSettings } from "../types/index.js";

export class Room {
  public readonly id: string; 
  public settings: RoomSettings;
  private players: Map<string, Player> = new Map();
  private io: Server;

  constructor(id: string, settings: RoomSettings, io: Server) {
    this.id = id;
    this.settings = settings;
    this.io = io;
  }

 

  addPlayer(player: Player): void {
    if (this.isFull()) {
      throw new Error("Room is full");
    }
    
    if (this.players.size === 0) {
      player.isHost = true;
    }
    this.players.set(player.id, player);
  }

  removePlayer(playerId: string): Player | undefined {
    const player = this.players.get(playerId);
    if (!player) return undefined;

    this.players.delete(playerId);

 
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

 
  broadcast(event: string, data?: unknown): void {
    this.io.to(this.id).emit(event, data);
  }

  
  sendTo(playerId: string, event: string, data?: unknown): void {
    this.io.to(playerId).emit(event, data);
  }
}