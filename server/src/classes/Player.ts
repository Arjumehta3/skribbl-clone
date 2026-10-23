import type { PlayerDTO } from "../types/index.js";

export class Player {
  public readonly id: string; // socket.id
  public name: string;
  public score: number = 0;
  public hasGuessed: boolean = false;
  public isHost: boolean = false;
  public isReady: boolean = false;

  constructor(id: string, name: string, isHost: boolean = false) {
    this.id = id;
    this.name = name.trim().slice(0, 20); // max 20 characters
    this.isHost = isHost;
  }

  addScore(points: number): void {
    this.score += points;
  }

  // Har naye round se pehle call hoga
  resetForRound(): void {
    this.hasGuessed = false;
  }

  // Play again par call hoga
  resetForGame(): void {
    this.score = 0;
    this.hasGuessed = false;
    this.isReady = false;
  }

  // Client ko sirf safe data bhejo
  toDTO(): PlayerDTO {
    return {
      id: this.id,
      name: this.name,
      score: this.score,
      hasGuessed: this.hasGuessed,
      isHost: this.isHost,
      isReady: this.isHost || this.isReady, // host hamesha ready maana jata hai
    };
  }
}