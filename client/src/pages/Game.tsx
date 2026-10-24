import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, PointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { socket } from "../Socket";
import { SocketEvent } from "../enums/SocketEvent";
import { GamePhase } from "../enums/GamePhase";
import DoodleAvatar from "../components/DoodleAvatar";
import { toAvatarIndex } from "../utils/avatar";
import { usePrefs } from "../utils/usePrefs";
import SettingsPanel from "../components/SettingsPanel";
import { playSound } from "../utils/sound";
import type { DrawData, Point, Stroke } from "../types";
import "./RoomLobby.css";

const COLORS = [
  "#171717", "#ffffff", "#e53935", "#ff8a00",
  "#ffd600", "#55b84a", "#00bcd4", "#1684e8",
  "#3f51b5", "#8e44ad", "#ff4081", "#795548",
];

// Canvas ka andar ka size fixed hai; points 0..1 (normalized) mein bheje jaate hain,
// isliye laptop aur phone par drawing ek jaisi dikhti hai.
const CANVAS_W = 1000;
const CANVAS_H = 700;
const MIN_POINT_GAP = 0.002; // itne se paas ke points server ko nahi bhejte

// ---------- Canvas helpers ----------

function paintDot(ctx: CanvasRenderingContext2D, p: Point, color: string, size: number) {
  ctx.beginPath();
  ctx.arc(p.x * CANVAS_W, p.y * CANVAS_H, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function paintSegment(ctx: CanvasRenderingContext2D, a: Point, b: Point, color: string, size: number) {
  ctx.beginPath();
  ctx.moveTo(a.x * CANVAS_W, a.y * CANVAS_H);
  ctx.lineTo(b.x * CANVAS_W, b.y * CANVAS_H);
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function repaintAll(canvas: HTMLCanvasElement | null, strokes: Stroke[]) {
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  for (const stroke of strokes) {
    const [first, ...rest] = stroke.points;
    if (!first) continue;
    paintDot(ctx, first, stroke.color, stroke.size);
    let prev = first;
    for (const p of rest) {
      paintSegment(ctx, prev, p, stroke.color, stroke.size);
      prev = p;
    }
  }
}

export default function Game() {
  const navigate = useNavigate();
  const {
    roomId, meId, players: roomPlayers, settings, gameState, roundStart,
    roundEnd, gameOver, chat, canvasStrokes, error,
    leaveRoom, sendGuess, playAgain,
  } = useGame();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]); // canvas ki poori drawing (redraw/undo ke liye)
  const drawingRef = useRef(false);
  const lastSent = useRef<Point | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [color, setColor] = useState("#171717");
  const [brushSize, setBrushSize] = useState(6);
  const [eraser, setEraser] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [text, setText] = useState("");
  const [prefs, setPrefs] = usePrefs();
  const [bubbles, setBubbles] = useState<{ id: string; name: string; text: string }[]>([]);
  const volumeRef = useRef(prefs.volume);
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});

  const players = [...roomPlayers].sort((a, b) => b.score - a.score);
  const me = roomPlayers.find((p) => p.id === meId);
  const phase = gameState?.phase;
  const drawerId = gameState?.drawerId ?? null;
  const isDrawer = drawerId !== null && drawerId === meId;
  const drawer = roomPlayers.find((p) => p.id === drawerId);
  const canDrawNow = isDrawer && phase === GamePhase.DRAWING;
  const canSeeWord = isDrawer || me?.hasGuessed === true;
  const isHost = me?.isHost === true;
  const isPublic = settings ? !settings.isPrivate : false;

  // ---------- Navigation guards ----------

  useEffect(() => {
    if (!roomId) navigate("/");
  }, [roomId, navigate]);

  // Game reset ho gaya (play again / auto restart): lobby par wapas
  useEffect(() => {
    if (roomId && !gameState) navigate(`/room/${roomId}`);
  }, [roomId, gameState, navigate]);

  // ---------- Server se aayi drawing ----------

  // Late joiner ko poori drawing ek saath milti hai (canvas_state)
  useEffect(() => {
    strokesRef.current = canvasStrokes.map((s) => ({ ...s, points: [...s.points] }));
    repaintAll(canvasRef.current, strokesRef.current);
  }, [canvasStrokes]);

  useEffect(() => {
    repaintAll(canvasRef.current, strokesRef.current);

    const onDraw = (data: DrawData) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const strokes = strokesRef.current;

      if (data.type === "start") {
        const p = { x: data.x, y: data.y };
        strokes.push({ points: [p], color: data.color, size: data.size });
        paintDot(ctx, p, data.color, data.size);
      } else if (data.type === "move") {
        const stroke = strokes[strokes.length - 1];
        if (!stroke) return;
        const prev = stroke.points[stroke.points.length - 1];
        const p = { x: data.x, y: data.y };
        stroke.points.push(p);
        if (prev) paintSegment(ctx, prev, p, stroke.color, stroke.size);
      }
    };
    const onClear = () => {
      strokesRef.current = [];
      repaintAll(canvasRef.current, strokesRef.current);
    };
    const onUndo = () => {
      strokesRef.current.pop();
      repaintAll(canvasRef.current, strokesRef.current);
    };

    socket.on(SocketEvent.DRAW_DATA, onDraw);
    socket.on(SocketEvent.CANVAS_CLEAR, onClear);
    socket.on(SocketEvent.DRAW_UNDO, onUndo);
    return () => {
      socket.off(SocketEvent.DRAW_DATA, onDraw);
      socket.off(SocketEvent.CANVAS_CLEAR, onClear);
      socket.off(SocketEvent.DRAW_UNDO, onUndo);
    };
  }, []);

  // Chat neeche tak scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [chat.length]);

  // Volume ref (sounds ke liye)
  useEffect(() => {
    volumeRef.current = prefs.volume;
  }, [prefs.volume]);

  // Sounds: sahi guess, turn shuru, game over, aakhri 5 second
  const lastChat = chat[chat.length - 1];
  useEffect(() => {
    if (lastChat?.kind === "correct") playSound("correct", volumeRef.current);
  }, [lastChat?.id, lastChat?.kind]);

  useEffect(() => {
    if (phase === GamePhase.DRAWING) playSound("turn", volumeRef.current);
  }, [phase]);

  useEffect(() => {
    if (gameOver) playSound("over", volumeRef.current);
  }, [gameOver]);

  const secondsLeft = phase === GamePhase.DRAWING ? gameState?.timeLeft ?? 0 : 0;
  useEffect(() => {
    if (secondsLeft > 0 && secondsLeft <= 5) playSound("tick", volumeRef.current);
  }, [secondsLeft]);

  // Chat bubbles: naya message 4 second canvas par dikhta hai
  useEffect(() => {
    if (!lastChat || lastChat.kind !== "chat") return;
    const bubble = { id: lastChat.id, name: lastChat.playerName ?? "", text: lastChat.text };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBubbles((current) => [...current.slice(-2), bubble]);
    const timer = window.setTimeout(
      () => setBubbles((current) => current.filter((b) => b.id !== bubble.id)),
      4000
    );
    return () => window.clearTimeout(timer);
  }, [lastChat?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Drawer ki drawing (mouse + touch + pen, sab Pointer Events se) ----------

  const toPoint = (clientX: number, clientY: number): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  };

  const strokeColor = eraser ? "#ffffff" : color;
  const strokeSize = eraser ? Math.min(40, brushSize * 3) : brushSize;

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!canDrawNow) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;

    const p = toPoint(event.clientX, event.clientY);
    lastSent.current = p;
    strokesRef.current.push({ points: [p], color: strokeColor, size: strokeSize });
    paintDot(ctx, p, strokeColor, strokeSize);
    socket.emit(SocketEvent.DRAW_START, { x: p.x, y: p.y, color: strokeColor, size: strokeSize });
  };

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !canDrawNow) return;
    const ctx = canvasRef.current?.getContext("2d");
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    if (!ctx || !stroke) return;

    // Phone par ek move event mein kai points aate hain; sab lo taaki line smooth rahe
    const native = event.nativeEvent;
    const events = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    const list = events.length > 0 ? events : [native];

    for (const e of list) {
      const p = toPoint(e.clientX, e.clientY);
      const last = lastSent.current;
      if (last && Math.hypot(p.x - last.x, p.y - last.y) < MIN_POINT_GAP) continue;

      paintSegment(ctx, last ?? p, p, stroke.color, stroke.size);
      stroke.points.push(p);
      lastSent.current = p;
      socket.emit(SocketEvent.DRAW_MOVE, { x: p.x, y: p.y });
    }
  };

  const stopDrawing = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastSent.current = null;
    socket.emit(SocketEvent.DRAW_END);
  }, []);

  // Turn khatam ho jaaye to chalti hui stroke band karo
  useEffect(() => {
    if (!canDrawNow) stopDrawing();
  }, [canDrawNow, stopDrawing]);

  const undoDrawing = () => {
    if (!canDrawNow) return;
    strokesRef.current.pop();
    repaintAll(canvasRef.current, strokesRef.current);
    socket.emit(SocketEvent.DRAW_UNDO);
  };

  const clearCanvas = () => {
    if (!canDrawNow) return;
    strokesRef.current = [];
    repaintAll(canvasRef.current, strokesRef.current);
    socket.emit(SocketEvent.CANVAS_CLEAR);
  };

  // ---------- Hotkeys (B brush, U undo, C clear, S swap) ----------

  useEffect(() => {
    keyHandlerRef.current = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.ctrlKey || e.metaKey || e.altKey || !canDrawNow) return;

      const key = e.key.toLowerCase();
      const hk = prefs.hotkeys;
      if (key === hk.brush) setEraser(false);
      else if (key === hk.swap) setEraser((current) => !current);
      else if (key === hk.undo) undoDrawing();
      else if (key === hk.clear) clearCanvas();
    };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---------- Word / chat ----------

  const chooseWord = (word: string) => socket.emit(SocketEvent.WORD_CHOSEN, { word });

  const submitText = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = text.trim();
    if (!message) return;

    // Guess sirf guesser, DRAWING phase mein, aur jab tak sahi na bola ho
    const isGuess = phase === GamePhase.DRAWING && !isDrawer && !me?.hasGuessed;
    if (isGuess) sendGuess(message);
    else socket.emit(SocketEvent.CHAT, { text: message });
    setText("");
  };

  const sendReaction = (reaction: string) => socket.emit(SocketEvent.CHAT, { text: reaction });

  const handleLeave = () => {
    leaveRoom();
    navigate("/");
  };

  // ---------- Display values ----------

  let wordLabel = "GUESS THIS";
  let wordText = gameState?.maskedWord ?? "";
  if (phase === GamePhase.WORD_SELECTION) {
    wordLabel = "CHOOSING WORD";
    wordText = "?";
  } else if (canSeeWord && gameState?.word) {
    wordLabel = isDrawer ? "DRAW THIS" : "YOU GUESSED IT";
    wordText = gameState.word.toUpperCase();
  } else if (phase === GamePhase.ROUND_END || phase === GamePhase.GAME_OVER) {
    wordLabel = "THE WORD WAS";
    wordText = roundEnd?.word.toUpperCase() ?? "";
  }

  const round = gameState?.round ?? roundStart?.round ?? 1;
  const totalRounds = gameState?.totalRounds ?? settings?.rounds ?? 3;
  const timeLeft = phase === GamePhase.DRAWING ? gameState?.timeLeft ?? 0 : "–";

  const placeholder = isDrawer
    ? "You are drawing — chat here…"
    : me?.hasGuessed
      ? "You guessed it! Chat with others…"
      : "Type your guess here...";

  return (
    <main className="skribbl-game">
      <header className="skribbl-brand">
        <span className="brand-pencil" aria-hidden="true">✏️</span>
        <span className="brand-name">skribbl</span>
        <span className="brand-tagline">Free Multiplayer Drawing</span>
        <span className="room-code-badge">Room: <b>{roomId}</b></span>
        <button className="leave-room-button" onClick={handleLeave}>Leave</button>
      </header>

      <section className="round-bar">
        <div className={`round-timer ${phase === GamePhase.DRAWING && typeof timeLeft === "number" && timeLeft <= 10 ? "urgent" : ""}`}>
          <span className="timer-symbol">◷</span>
          <strong>{timeLeft}</strong>
        </div>

        <strong className="round-number">Round {round} of {totalRounds}</strong>

        <div className="word-display">
          <span>{wordLabel}</span>
          <strong>{wordText}</strong>
        </div>

        <button
          className="settings-button"
          title="Game settings"
          aria-label="Open game settings"
          onClick={() => setShowSettings((current) => !current)}
        >
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path
              d="M19 3h10l2 6 4 2 5-2 5 9-4 5v4l4 5-5 9-6-2-4 5H18l-2-6-4-2-5 2-4-9 4-5v-4l-4-5 5-9 6 2z"
              fill="#666"
              stroke="#191919"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <circle cx="24" cy="24" r="10" fill="#d5d5d5" stroke="#191919" strokeWidth="3" />
            <circle cx="24" cy="24" r="4" fill="#444" stroke="#191919" strokeWidth="2" />
          </svg>
        </button>

        {showSettings && (
          <SettingsPanel prefs={prefs} setPrefs={setPrefs} onClose={() => setShowSettings(false)}>
            {canDrawNow && (
              <button
                className="clear-board-setting"
                onClick={() => {
                  clearCanvas();
                  setShowSettings(false);
                }}
              >
                Clear drawing
              </button>
            )}
          </SettingsPanel>
        )}
      </section>

      <section className="skribbl-layout">
        <aside className="skribbl-players">
          {players.map((player, index) => (
            <div
              className={`skribbl-player ${player.id === meId ? "current-player" : ""} ${player.hasGuessed ? "guessed" : ""} ${player.id === drawerId ? "drawing-now" : ""}`}
              key={player.id}
            >
              <span className="player-rank">#{index + 1}</span>

              <div className="player-info">
                <strong>
                  {player.name}{player.id === meId ? " (You)" : ""}
                  {player.id === drawerId ? " ✏️" : ""}
                  {player.hasGuessed ? " ✅" : ""}
                </strong>
                <span>{player.score} points</span>
              </div>

              <span className="player-face" role="img" aria-label={`${player.name} avatar`}>
                <DoodleAvatar index={toAvatarIndex(player.avatar)} />
              </span>
            </div>
          ))}
        </aside>

        <section className="skribbl-board">
          <div className="board-reactions">
            <button className="reaction-button thumbs-up" title="Nice drawing!" aria-label="Thumbs up" onClick={() => sendReaction("👍")}>
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path d="M15 21 24 7Q28 4 30 9L28 18H39Q44 19 42 25L38 39Q37 43 32 42H17L12 38V24Z" fill="#a7d66d" stroke="#454545" strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M5 21H15V42H5Z" fill="#a7d66d" stroke="#454545" strokeWidth="2.5" />
                <path d="M21 12 26 8" fill="none" stroke="#c6e89a" strokeWidth="2" />
              </svg>
            </button>
            <button className="reaction-button thumbs-down" title="Thumbs down" aria-label="Thumbs down" onClick={() => sendReaction("👎")}>
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path d="M15 27 24 41Q28 44 30 39L28 30H39Q44 29 42 23L38 9Q37 5 32 6H17L12 10V24Z" fill="#e98a8a" stroke="#454545" strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M5 6H15V27H5Z" fill="#e98a8a" stroke="#454545" strokeWidth="2.5" />
                <path d="M22 36 26 41" fill="none" stroke="#f4b2b2" strokeWidth="2" />
              </svg>
            </button>
          </div>

          <canvas
            ref={canvasRef}
            className={`skribbl-canvas ${canDrawNow ? "" : "canvas-disabled"}`}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, flex: "none", height: "auto", touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            onLostPointerCapture={stopDrawing}
            onContextMenu={(e) => e.preventDefault()}
          />

          {/* Word chunna: sirf drawer ko words, baaki ko intezaar */}
          {phase === GamePhase.WORD_SELECTION && (
            <div className="word-choice-overlay" style={{ cursor: "default" }}>
              <div className="word-choice-card">
                <span className="word-choice-pencil">✏️</span>
                {isDrawer ? (
                  <>
                    <h2>Choose a word to draw</h2>
                    <p>Pick one of these words to start your turn.</p>
                    <div className="word-options">
                      {(roundStart?.wordOptions ?? []).map((item) => (
                        <button key={item} onClick={() => chooseWord(item)}>
                          {item.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h2>{drawer?.name ?? "Someone"} is choosing a word…</h2>
                    <p>Get ready to guess!</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Round khatam: word aur scores */}
          {phase === GamePhase.ROUND_END && roundEnd && (
            <div className="word-choice-overlay" style={{ cursor: "default" }}>
              <div className="word-choice-card">
                <span className="word-choice-pencil">⏱️</span>
                <h2>The word was “{roundEnd.word}”</h2>
                <div style={{ textAlign: "left", marginTop: 12 }}>
                  {[...roundEnd.scores].sort((a, b) => b.score - a.score).map((p) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#192b58" }}>
                      <span>{p.name}{p.id === meId ? " (You)" : ""}</span>
                      <strong>{p.score}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Game khatam: leaderboard */}
          {gameOver && (
            <div className="word-choice-overlay" style={{ cursor: "default", zIndex: 5 }}>
              <div className="word-choice-card">
                <span className="word-choice-pencil">🏆</span>
                <h2>{gameOver.winner ? `${gameOver.winner.name} wins!` : "Game over"}</h2>
                <div style={{ textAlign: "left", marginTop: 12 }}>
                  {gameOver.leaderboard.map((p, i) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#192b58" }}>
                      <span>#{i + 1} {p.name}{p.id === meId ? " (You)" : ""}</span>
                      <strong>{p.score}</strong>
                    </div>
                  ))}
                </div>
                <div className="word-options">
                  {isPublic ? (
                    <p style={{ margin: 0 }}>Next game starts automatically…</p>
                  ) : isHost ? (
                    <button onClick={playAgain}>Play again</button>
                  ) : (
                    <p style={{ margin: 0 }}>Waiting for the host to restart…</p>
                  )}
                  <button onClick={handleLeave}>Leave</button>
                </div>
              </div>
            </div>
          )}

          {prefs.bubbles && bubbles.length > 0 && (
            <div className="chat-bubbles" aria-hidden="true">
              {bubbles.map((b) => (
                <div className="chat-bubble" key={b.id}>
                  <strong>{b.name}:</strong> {b.text}
                </div>
              ))}
            </div>
          )}

          {/* Tools sirf drawer ko dikhte hain */}
          {isDrawer && (
            <div className="skribbl-tools">
              <button className={!eraser ? "selected-tool" : ""} onClick={() => setEraser(false)} title="Pencil" aria-label="Pencil">✏️</button>
              <button className={eraser ? "selected-tool" : ""} onClick={() => setEraser(true)} title="Eraser" aria-label="Eraser">🧽</button>
              <button onClick={undoDrawing} title="Undo last stroke" aria-label="Undo last stroke">↶</button>
              <button onClick={clearCanvas} title="Clear canvas" aria-label="Clear canvas">🗑️</button>

              <label htmlFor="skribbl-brush">Size</label>
              <input
                id="skribbl-brush"
                type="range"
                min="2"
                max="24"
                value={brushSize}
                onChange={(event) => setBrushSize(Number(event.target.value))}
              />

              <div className="skribbl-colors">
                {COLORS.map((item) => (
                  <button
                    key={item}
                    aria-label={`Select color ${item}`}
                    title={item}
                    className={color === item && !eraser ? "selected-color" : ""}
                    style={{ backgroundColor: item }}
                    onClick={() => {
                      setColor(item);
                      setEraser(false);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className={`skribbl-chat ${prefs.chatTop ? "chat-input-top" : ""}`}>
          <div className="chat-feed" aria-live="polite">
            {chat.map((m) => (
              <div className={`skribbl-message ${m.kind}`} key={m.id}>
                {m.kind === "chat" ? (
                  <>
                    <strong>{m.playerName}</strong>
                    <p>{m.text}</p>
                  </>
                ) : (
                  <p
                    className="system-message"
                    style={m.kind === "correct" ? { color: "#2e7d32", fontWeight: 700 } : m.kind === "close" ? { color: "#b26a00", fontWeight: 700 } : undefined}
                  >
                    {m.text}
                  </p>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {error && <p className="form-error" role="alert" style={{ margin: "4px 8px", color: "#c62828", fontSize: 12 }}>{error}</p>}

          <form className="skribbl-guess-form" onSubmit={submitText}>
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={placeholder}
              aria-label="Type your guess"
              maxLength={100}
              autoComplete="off"
              autoCapitalize="off"
              enterKeyHint="send"
            />
            <button type="submit" aria-label="Send message">➤</button>
          </form>
        </aside>
      </section>
    </main>
  );
}
