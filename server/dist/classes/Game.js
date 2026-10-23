import { GamePhase } from "../enums/GamePhase.js";
import { SocketEvent } from "../enums/SocketEvent.js";
import { getRandomWords, maskWord, pickHintIndex } from "../utils/wordPicker.js";
import { isCorrectGuess, isCloseGuess } from "../utils/wordMatcher.js";
import { WORD_SELECT_SECONDS, ROUND_END_SECONDS, GUESS_BASE_SCORE, GUESS_MIN_SCORE, DRAWER_POINTS_PER_GUESS, MAX_POINTS_PER_STROKE, } from "../config.js";
export class Game {
    phase = GamePhase.LOBBY;
    room;
    round = 0;
    turnQueue = [];
    drawerId = null;
    currentWord = "";
    wordOptions = [];
    usedWords = new Set();
    revealed = new Set();
    timeLeft = 0;
    hintTimes = [];
    guessedCount = 0;
    tickTimer = null;
    phaseTimer = null;
    strokes = [];
    currentStroke = null;
    constructor(room) {
        this.room = room;
    }
    // ---------- Start / turns ----------
    start() {
        if (this.room.getPlayers().length < 2) {
            throw new Error("Need at least 2 players to start");
        }
        this.room.getPlayers().forEach((p) => (p.score = 0));
        this.round = 1;
        this.refillQueue();
        this.nextTurn();
    }
    refillQueue() {
        this.turnQueue = this.room.getPlayers().map((p) => p.id);
    }
    nextTurn() {
        this.clearTimers();
        if (this.room.getPlayers().length < 2) {
            this.endGame();
            return;
        }
        // Jo player chala gaya usko skip karo
        let nextId;
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
    startTurn(drawerId) {
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
        this.wordOptions = getRandomWords(wordCount, this.usedWords);
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
    chooseWord(playerId, word) {
        if (this.phase !== GamePhase.WORD_SELECTION)
            return false;
        if (playerId !== this.drawerId)
            return false;
        if (!this.wordOptions.includes(word))
            return false; // client ka word nahi manenge
        this.beginDrawing(word);
        return true;
    }
    beginDrawing(word) {
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
    tick() {
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
    revealHint() {
        // Poora word kabhi mat kholo, kam se kam 1 letter band rahe
        if (this.revealed.size >= this.currentWord.length - 1)
            return;
        const index = pickHintIndex(this.currentWord, this.revealed);
        if (index === null)
            return;
        this.revealed.add(index);
        this.room.broadcast(SocketEvent.HINT_UPDATE, { maskedWord: this.getMaskedWord() });
    }
    // ---------- Guessing ----------
    handleGuess(playerId, text) {
        if (this.phase !== GamePhase.DRAWING)
            return "ignored";
        const player = this.room.getPlayer(playerId);
        if (!player || playerId === this.drawerId || player.hasGuessed)
            return "ignored";
        if (isCorrectGuess(text, this.currentWord)) {
            const { drawTime } = this.room.settings;
            let points = Math.max(GUESS_MIN_SCORE, Math.round((GUESS_BASE_SCORE * this.timeLeft) / drawTime));
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
            if (this.allGuessed())
                this.endRound();
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
    allGuessed() {
        const guessers = this.room.getPlayers().filter((p) => p.id !== this.drawerId);
        return guessers.length > 0 && guessers.every((p) => p.hasGuessed);
    }
    // ---------- Round end / game end ----------
    endRound() {
        if (this.phase !== GamePhase.DRAWING && this.phase !== GamePhase.WORD_SELECTION)
            return;
        this.clearTimers();
        const drawer = this.drawerId ? this.room.getPlayer(this.drawerId) : undefined;
        if (drawer)
            drawer.addScore(this.guessedCount * DRAWER_POINTS_PER_GUESS);
        this.phase = GamePhase.ROUND_END;
        this.room.broadcast(SocketEvent.ROUND_END, {
            word: this.currentWord,
            scores: this.room.getPlayersDTO(),
        });
        this.phaseTimer = setTimeout(() => this.nextTurn(), ROUND_END_SECONDS * 1000);
    }
    endGame() {
        this.clearTimers();
        this.phase = GamePhase.GAME_OVER;
        const leaderboard = this.room.getPlayersDTO().sort((a, b) => b.score - a.score);
        this.room.broadcast(SocketEvent.GAME_OVER, {
            winner: leaderboard[0] ?? null,
            leaderboard,
        });
    }
    // Player ke jaane ke BAAD call hoga
    handlePlayerLeft(playerId) {
        if (this.phase === GamePhase.LOBBY || this.phase === GamePhase.GAME_OVER)
            return;
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
    canDraw(playerId) {
        return this.phase === GamePhase.DRAWING && playerId === this.drawerId;
    }
    beginStroke(point, color, size) {
        const stroke = { points: [point], color, size };
        this.strokes.push(stroke);
        this.currentStroke = stroke;
    }
    addPoint(point) {
        if (!this.currentStroke)
            return false;
        if (this.currentStroke.points.length >= MAX_POINTS_PER_STROKE)
            return false;
        this.currentStroke.points.push(point);
        return true;
    }
    endStroke() {
        this.currentStroke = null;
    }
    undoStroke() {
        this.currentStroke = null;
        return this.strokes.pop() !== undefined;
    }
    clearCanvas() {
        this.strokes = [];
        this.currentStroke = null;
    }
    getStrokes() {
        return this.strokes;
    }
    // ---------- State ----------
    getMaskedWord() {
        return maskWord(this.currentWord, this.revealed);
    }
    // Har player ko alag state: asli word sirf drawer (ya jisne guess kar liya) ko
    getStateFor(playerId) {
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
    broadcastState() {
        for (const p of this.room.getPlayers()) {
            this.room.sendTo(p.id, SocketEvent.GAME_STATE, this.getStateFor(p.id));
        }
    }
    getDrawerId() {
        return this.drawerId;
    }
    // ---------- Cleanup ----------
    clearTimers() {
        if (this.tickTimer)
            clearInterval(this.tickTimer);
        if (this.phaseTimer)
            clearTimeout(this.phaseTimer);
        this.tickTimer = null;
        this.phaseTimer = null;
    }
    // Room delete hone par call hoga, taaki timers chalte na rahein
    destroy() {
        this.clearTimers();
    }
}
