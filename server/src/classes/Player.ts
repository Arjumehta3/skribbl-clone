import type { PlayerDTO } from "../types/index.js";

export class Player {
  public readonly id: string; 
  public name: string;
  public score: number = 0;
  public hasGuessed: boolean = false;
  public isHost: boolean = false;

  constructor(id: string, name: string, isHost: boolean = false) {
    this.id = id;
    this.name = name.trim().slice(0, 20); 
    this.isHost = isHost;
  }

  addScore(points: number): void {
    this.score += points;
  }

 
  resetForRound(): void {
    this.hasGuessed = false;
  }

  
  toDTO(): PlayerDTO {
    return {
      id: this.id,
      name: this.name,
      score: this.score,
      hasGuessed: this.hasGuessed,
      isHost: this.isHost,
    };
  }
}