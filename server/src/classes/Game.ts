import type { Room } from "./Room.js";
import { GamePhase } from "../enums/GamePhase.js";
import { SocketEvent } from "../enums/SocketEvent.js";
import { getRandomWords, maskWord, pickHintIndex } from "../utils/wordPicker.js";
import { isCorrectGuess, isCloseGuess } from "../utils/wordMatcher.js";
import type { Point, Stroke } from "../types/index.js";
import {
  WORD_SELECT_SECONDS,
  ROUND_END_SECONDS,
  GUESS_BASE_SCORE,
  GUESS_MIN_SCORE,
  DRAWER_POINTS_PER_GUESS,
  MAX_POINTS_PER_STROKE,
} from "../config.js";

export type GuessOutcome = "correct" | "close" | "wrong" | "ignored";

export class Game {
  public phase: GamePhase = GamePhase.LOBBY;

  private room: Room;
  private round = 0;
  private turnQueue: string[] = [];
  private drawerId: string | null = null;
  private currentWord = "";
  private wordOptions: string[] = [];
  private usedWords: Set<string> = new Set();
  private revealed: Set<number> = new Set();
  private timeLeft = 0;
  private hintTimes: number[] = [];
  private guessedCount = 0;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  private strokes: Stroke[] = [];
  private currentStroke: Stroke | null = null;

  constructor(room: Room) {
    this.room = room;
  }

  // ---------- Start / turns ----------

  start(): void {
    if (this.room.getPlayers().length < 2) {
      throw new Error("Need at least 2 players to start");
    }
    this.room.getPlayers().forEach((p) => (p.score = 0));
    this.round = 1;
    this.refillQueue();
    this.nextTurn();
  }

  private refillQueue(): void {
    this.turnQueue = this.room.getPlayers().map((p) => p.id);
  }

  private nextTurn(): void {
    this.clearTimers();

    if (this.room.getPlayers().length < 2) {
      this.endGame();
      return;
    }

    // Jo player chala gaya usko skip karo
    let nextId: string | undefined;
    while (this.turnQueue.length > 0) {
      const id = this.turnQueue.shift();
      if (id && this.room.getPlayer(id)) {
        nextId = id;
        break;
      }
    }

    if (!nextId) {
      // Is round mein sabka turn ho gaya
      this.round++;
      if (this.round > this.room.settings.rounds) {
        this.endGame();
        return;
      }
      this.refillQueue();
      this.nextTurn();
      return;
    }

    this.startTurn(nextId);
  }

  private startTurn(drawerId: string): void {
    const { wordCount, drawTime, rounds } = this.room.settings;

    this.drawerId = drawerId;
    this.phase = GamePhase.WORD_SELECTION;
    this.currentWord = "";
    this.guessedCount = 0;
    this.revealed.clear();
    this.strokes = [];
    this.currentStroke = null;
    this.room.broadcast(SocketEvent.CANVAS_CLEAR);
    this.room.getPlayers().forEach((p) => p.resetForRound());
    this.wordOptions = getRandomWords(wordCount, this.usedWords, this.room.settings.language);

    this.broadcastState();

    // Words sirf drawer ko jaate hain
    for (const p of this.room.getPlayers()) {
      this.room.sendTo(p.id, SocketEvent.ROUND_START, {
        drawerId,
        wordOptions: p.id === drawerId ? this.wordOptions : [],
        drawTime,
        round: this.round,
        totalRounds: rounds,
      });
    }

    // Drawer ne time par word nahi chuna to pehla word apne aap
    this.phaseTimer = setTimeout(() => {
      const first = this.wordOptions[0];
      if (first && this.phase === GamePhase.WORD_SELECTION) {
        this.beginDrawing(first);
      }
    }, WORD_SELECT_SECONDS * 1000);
  }

  // ---------- Word selection and drawing ----------

  chooseWord(playerId: string, word: string): boolean {
    if (this.phase !== GamePhase.WORD_SELECTION) return false;
    if (playerId !== this.drawerId) return false;
    if (!this.wordOptions.includes(word)) return false; // client ka word nahi manenge
    this.beginDrawing(word);
    return true;
  }

  private beginDrawing(word: string): void {
    const { drawTime, hints } = this.room.settings;
    this.clearTimers();

    this.currentWord = word;
    this.usedWords.add(word);
    this.phase = GamePhase.DRAWING;
    this.timeLeft = drawTime;

    // drawTime ko (hints + 1) hisson mein baanto
    this.hintTimes = [];
    for (let k = 1; k <= hints; k++) {
      this.hintTimes.push(Math.round((drawTime / (hints + 1)) * k));
    }

    this.broadcastState();
    this.tickTimer = setInterval(() => this.tick(), 1000);
  }

  private tick(): void {
    this.timeLeft--;
    this.room.broadcast(SocketEvent.TIMER_TICK, { timeLeft: this.timeLeft });

    const elapsed = this.room.settings.drawTime - this.timeLeft;
    if (this.hintTimes.includes(elapsed)) {
      this.revealHint();
    }
    if (this.timeLeft <= 0) {
      this.endRound();
    }
  }

  private revealHint(): void {
    // Poora word kabhi mat kholo, kam se kam 1 letter band rahe
    if (this.revealed.size >= this.currentWord.length - 1) return;
    const index = pickHintIndex(this.currentWord, this.revealed);
    if (index === null) return;

    this.revealed.add(index);
    this.room.broadcast(SocketEvent.HINT_UPDATE, { maskedWord: this.getMaskedWord() });
  }

  // ---------- Guessing ----------

  handleGuess(playerId: string, text: string): GuessOutcome {
    if (this.phase !== GamePhase.DRAWING) return "ignored";

    const player = this.room.getPlayer(playerId);
    if (!player || playerId === this.drawerId || player.hasGuessed) return "ignored";

    if (isCorrectGuess(text, this.currentWord)) {
            const { drawTime } = this.room.settings;
      let points = Math.max(
        GUESS_MIN_SCORE,
        Math.round((GUESS_BASE_SCORE * this.timeLeft) / drawTime)
      );
      // Pehle 25% time ke andar guess kiya to bonus
      if (this.timeLeft >= drawTime * 0.75) {
        points += 100;
      }
      player.addScore(points);
      player.hasGuessed = true;
      this.guessedCount++;

      this.room.broadcast(SocketEvent.GUESS_RESULT, {
        correct: true,
        playerId,
        playerName: player.name,
        points,
      });
      // Jisne guess kiya use ab word dikh sakta hai
      this.room.sendTo(playerId, SocketEvent.GAME_STATE, this.getStateFor(playerId));

      if (this.allGuessed()) this.endRound();
      return "correct";
    }

    if (isCloseGuess(text, this.currentWord)) {
      this.room.sendTo(playerId, SocketEvent.GUESS_RESULT, {
        correct: false,
        close: true,
        playerId,
        playerName: player.name,
      });
      return "close";
    }

    return "wrong";
  }

  private allGuessed(): boolean {
    const guessers = this.room.getPlayers().filter((p) => p.id !== this.drawerId);
    return guessers.length > 0 && guessers.every((p) => p.hasGuessed);
  }

  // ---------- Round end / game end ----------

  private endRound(): void {
    if (this.phase !== GamePhase.DRAWING && this.phase !== GamePhase.WORD_SELECTION) return;
    this.clearTimers();

    const drawer = this.drawerId ? this.room.getPlayer(this.drawerId) : undefined;
    if (drawer) drawer.addScore(this.guessedCount * DRAWER_POINTS_PER_GUESS);

    this.phase = GamePhase.ROUND_END;
    this.room.broadcast(SocketEvent.ROUND_END, {
      word: this.currentWord,
      scores: this.room.getPlayersDTO(),
    });

    this.phaseTimer = setTimeout(() => this.nextTurn(), ROUND_END_SECONDS * 1000);
  }

  private endGame(): void {
    this.clearTimers();
    this.phase = GamePhase.GAME_OVER;

    const leaderboard = this.room.getPlayersDTO().sort((a, b) => b.score - a.score);
    this.room.broadcast(SocketEvent.GAME_OVER, {
      winner: leaderboard[0] ?? null,
      leaderboard,
    });

    // Quick Play room: kuch der baad naya game apne aap
    if (!this.room.settings.isPrivate) {
      this.phaseTimer = setTimeout(() => this.room.scheduleAutoStart(3000), 12000);
    }
  }

  // Player ke jaane ke BAAD call hoga
  handlePlayerLeft(playerId: string): void {
    if (this.phase === GamePhase.LOBBY || this.phase === GamePhase.GAME_OVER) return;

    if (this.room.getPlayers().length < 2) {
      this.endGame();
      return;
    }
    const drawing = this.phase === GamePhase.DRAWING || this.phase === GamePhase.WORD_SELECTION;
    if (playerId === this.drawerId && drawing) {
      this.endRound(); // drawer chala gaya
      return;
    }
    if (this.phase === GamePhase.DRAWING && this.allGuessed()) {
      this.endRound();
    }
  }

  // ---------- Drawing ----------

  canDraw(playerId: string): boolean {
    return this.phase === GamePhase.DRAWING && playerId === this.drawerId;
  }

  beginStroke(point: Point, color: string, size: number): void {
    const stroke: Stroke = { points: [point], color, size };
    this.strokes.push(stroke);
    this.currentStroke = stroke;
  }

  addPoint(point: Point): boolean {
    if (!this.currentStroke) return false;
    if (this.currentStroke.points.length >= MAX_POINTS_PER_STROKE) return false;
    this.currentStroke.points.push(point);
    return true;
  }

  endStroke(): void {
    this.currentStroke = null;
  }

  undoStroke(): boolean {
    this.currentStroke = null;
    return this.strokes.pop() !== undefined;
  }

  clearCanvas(): void {
    this.strokes = [];
    this.currentStroke = null;
  }

  getStrokes(): Stroke[] {
    return this.strokes;
  }

  // ---------- State ----------

  private getMaskedWord(): string {
    return maskWord(this.currentWord, this.revealed);
  }

  // Har player ko alag state: asli word sirf drawer (ya jisne guess kar liya) ko
  getStateFor(playerId: string) {
    const player = this.room.getPlayer(playerId);
    const canSeeWord = playerId === this.drawerId || player?.hasGuessed === true;
    return {
      phase: this.phase,
      round: this.round,
      totalRounds: this.room.settings.rounds,
      drawerId: this.drawerId,
      word: canSeeWord ? this.currentWord : null,
      maskedWord: this.getMaskedWord(),
      timeLeft: this.timeLeft,
    };
  }

  private broadcastState(): void {
    for (const p of this.room.getPlayers()) {
      this.room.sendTo(p.id, SocketEvent.GAME_STATE, this.getStateFor(p.id));
    }
  }

  getDrawerId(): string | null {
    return this.drawerId;
  }

  // ---------- Cleanup ----------

  private clearTimers(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    this.tickTimer = null;
    this.phaseTimer = null;
  }

  // Room delete hone par call hoga, taaki timers chalte na rahein
  destroy(): void {
    this.clearTimers();
  }
}