import { useEffect, useRef, useState } from "react";
import type { FormEvent, PointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import DoodleAvatar from "../components/DoodleAvatar";
import { toAvatarIndex } from "../utils/avatar";
import "./RoomLobby.css";

type ChatMessage = {
  id: string;
  name: string;
  text: string;
  type?: "system" | "guess" | "reaction";
};

const COLORS = [
  "#171717", "#ffffff", "#e53935", "#ff8a00",
  "#ffd600", "#55b84a", "#00bcd4", "#1684e8",
  "#3f51b5", "#8e44ad", "#ff4081", "#795548",
];

function getStoredPlayer() {
  return { name: sessionStorage.getItem("playerName")?.trim() || "Guest" };
}

function createMessage(name: string, text: string, type?: ChatMessage["type"]): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random()}`,
    name,
    text,
    type,
  };
}

export default function Game() {
  const navigate = useNavigate();
  const { roomId, meId, players: roomPlayers } = useGame();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });
  const undoStack = useRef<ImageData[]>([]);

  const [currentPlayer] = useState(getStoredPlayer);

  // Asli players server se aate hain, score ke hisaab se sort
  const players = [...roomPlayers].sort((a, b) => b.score - a.score);

  const roomSettings = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("roomSettings") || "{}") as { rounds?: number; drawTime?: number; maxPlayers?: number };
    } catch {
      return {};
    }
  })();
  const totalRounds = roomSettings.rounds ?? 3;
  const drawTime = roomSettings.drawTime ?? 80;
  const roomCode = roomId ?? "";
  useEffect(() => {
    if (!roomId) navigate("/");
  }, [roomId, navigate]);
  const [timeLeft, setTimeLeft] = useState(drawTime);
  const [round, setRound] = useState(1);
  const [word, setWord] = useState("");
  const [choosingWord, setChoosingWord] = useState(true);
  const [color, setColor] = useState("#171717");
  const [brushSize, setBrushSize] = useState(6);
  const [eraser, setEraser] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [guess, setGuess] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage("System", "Welcome to the game!", "system"),
    createMessage("System", "Choose a word to start drawing.", "system"),
  ]);

  useEffect(() => {
    if (choosingWord) return;

    const timerId = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timerId);
          setChoosingWord(true);
          setWord("");
          setRound((currentRound) => currentRound >= totalRounds ? 1 : currentRound + 1);

          setMessages((currentMessages) => [
            ...currentMessages,
            createMessage("System", "Round ended. Choose a new word!", "system"),
          ]);

          return drawTime;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [choosingWord, drawTime, totalRounds]);

  const getCanvasPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (choosingWord) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    try {
      undoStack.current.push(context.getImageData(0, 0, canvas.width, canvas.height));
      if (undoStack.current.length > 30) undoStack.current.shift();
    } catch {
      // Canvas snapshot may be unavailable in restricted browser contexts.
    }
    drawingRef.current = true;
    lastPoint.current = getCanvasPoint(event);

    context.beginPath();
    context.arc(
      lastPoint.current.x,
      lastPoint.current.y,
      (eraser ? brushSize * 3 : brushSize) / 2,
      0,
      Math.PI * 2
    );
    context.fillStyle = eraser ? "#ffffff" : color;
    context.fill();
  };

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || choosingWord) return;

    const context = canvasRef.current?.getContext("2d");
    if (!context) return;

    const point = getCanvasPoint(event);

    context.beginPath();
    context.moveTo(lastPoint.current.x, lastPoint.current.y);
    context.lineTo(point.x, point.y);
    context.strokeStyle = eraser ? "#ffffff" : color;
    context.lineWidth = eraser ? brushSize * 3 : brushSize;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.globalAlpha = 0.9;
    context.stroke();
    context.globalAlpha = 1;

    lastPoint.current = point;
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (canvas && context) {
      try {
        undoStack.current.push(context.getImageData(0, 0, canvas.width, canvas.height));
      } catch {
        // Ignore unavailable snapshots.
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const undoDrawing = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const previous = undoStack.current.pop();
    if (canvas && context && previous) {
      context.putImageData(previous, 0, 0);
    }
  };

  const chooseWord = (selectedWord: string) => {
    setWord(selectedWord);
    setTimeLeft(drawTime);
    setChoosingWord(false);

    setMessages((currentMessages) => [
      ...currentMessages,
      createMessage("System", `${currentPlayer.name} started drawing.`, "system"),
    ]);
  };

  const sendGuess = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const message = guess.trim();
    if (!message) return;

    const isCorrect = !choosingWord && message.toLowerCase() === word.toLowerCase();
    setMessages((currentMessages) => [
      ...currentMessages,
      createMessage(currentPlayer.name, isCorrect ? `🎉 ${message} — correct! (demo only)` : message, "guess"),
    ]);

    if (isCorrect) {
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage("System", "Correct guess detected locally. Server-side scoring is BACKEND REQUIRED.", "system"),
      ]);
      setChoosingWord(true);
      setWord("");
      setRound((currentRound) => currentRound >= totalRounds ? 1 : currentRound + 1);
      clearCanvas();
    }

    setGuess("");
  };

  const sendReaction = (reaction: "👍" | "👎") => {
    setMessages((currentMessages) => [
      ...currentMessages,
      createMessage(currentPlayer.name, reaction, "reaction"),
    ]);
  };

  return (
    <main className="skribbl-game">
      <header className="skribbl-brand">
        <span className="brand-pencil" aria-hidden="true">✏️</span>
        <span className="brand-name">skribbl</span>
        <span className="brand-tagline">Free Multiplayer Drawing</span>
        <span className="room-code-badge">Room: <b>{roomCode}</b></span>
        <button className="leave-room-button" onClick={() => { window.location.href = "/"; }}>Leave</button>
      </header>
      <div className="frontend-demo-notice">
        Frontend demo only — multiplayer sync, server timer, authoritative scoring and room validation are <b>BACKEND REQUIRED</b>.
      </div>

      <section className="round-bar">
        <div className="round-timer">
          <span className="timer-symbol">◷</span>
          <strong>{timeLeft}</strong>
        </div>

        <strong className="round-number">Round {round} of {totalRounds}</strong>

        <div className="word-display">
          <span>{choosingWord ? "CHOOSE A WORD" : "GUESS THIS"}</span>
          <strong>
            {choosingWord
              ? "?"
              : word.split("").map(() => "_").join(" ")}
          </strong>
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
          <div className="game-settings-panel">
            <div className="settings-panel-header">
              <strong>Game settings</strong>
              <button
                onClick={() => setShowSettings(false)}
                aria-label="Close settings"
              >
                ×
              </button>
            </div>

            <label className="setting-row">
              <span>Sound effects</span>
              <input
                type="checkbox"
                checked={soundOn}
                onChange={(event) => setSoundOn(event.target.checked)}
              />
            </label>

            <button
              className="clear-board-setting"
              onClick={() => {
                clearCanvas();
                setShowSettings(false);
              }}
            >
              Clear drawing
            </button>
          </div>
        )}
      </section>

      <section className="skribbl-layout">
        <aside className="skribbl-players">
          {players.map((player, index) => (
            <div
              className={`skribbl-player ${player.id === meId ? "current-player" : ""}`}
              key={player.id}
            >
              <span className="player-rank">#{index + 1}</span>

              <div className="player-info">
                <strong>{player.name}{player.id === meId ? " (You)" : ""}</strong>
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
            <button
              className="reaction-button thumbs-up"
              title="Nice drawing!"
              aria-label="Thumbs up"
              onClick={() => sendReaction("👍")}
            >
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path
                  d="M15 21 24 7Q28 4 30 9L28 18H39Q44 19 42 25L38 39Q37 43 32 42H17L12 38V24Z"
                  fill="#a7d66d"
                  stroke="#454545"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 21H15V42H5Z"
                  fill="#a7d66d"
                  stroke="#454545"
                  strokeWidth="2.5"
                />
                <path d="M21 12 26 8" fill="none" stroke="#c6e89a" strokeWidth="2" />
              </svg>
            </button>

            <button
              className="reaction-button thumbs-down"
              title="Thumbs down"
              aria-label="Thumbs down"
              onClick={() => sendReaction("👎")}
            >
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path
                  d="M15 27 24 41Q28 44 30 39L28 30H39Q44 29 42 23L38 9Q37 5 32 6H17L12 10V24Z"
                  fill="#e98a8a"
                  stroke="#454545"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 6H15V27H5Z"
                  fill="#e98a8a"
                  stroke="#454545"
                  strokeWidth="2.5"
                />
                <path d="M22 36 26 41" fill="none" stroke="#f4b2b2" strokeWidth="2" />
              </svg>
            </button>
          </div>

          <canvas
            ref={canvasRef}
            className={`skribbl-canvas ${choosingWord ? "canvas-disabled" : ""}`}
            width={1000}
            height={700}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            onLostPointerCapture={stopDrawing}
          />

          {choosingWord && (
            <div className="word-choice-overlay">
              <div className="word-choice-card">
                <span className="word-choice-pencil">✏️</span>
                <h2>Choose a word to draw</h2>
                <p>Pick one of these words to start the round.</p>

                <div className="word-options">
                  {["APPLE", "HOUSE", "RAINBOW"].map((item) => (
                    <button key={item} onClick={() => chooseWord(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="skribbl-tools">
            <button
              className={!eraser ? "selected-tool" : ""}
              onClick={() => setEraser(false)}
              title="Pencil"
              aria-label="Pencil"
            >
              ✏️
            </button>

            <button
              className={eraser ? "selected-tool" : ""}
              onClick={() => setEraser(true)}
              title="Eraser"
              aria-label="Eraser"
            >
              🧽
            </button>

            <button onClick={undoDrawing} title="Undo last stroke" aria-label="Undo last stroke">
              ↶
            </button>

            <button onClick={clearCanvas} title="Clear canvas" aria-label="Clear canvas">
              🗑️
            </button>

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
        </section>

        <aside className="skribbl-chat">
          <div className="chat-feed" aria-live="polite">
            {messages.map((message) => (
              <div className={`skribbl-message ${message.type || ""}`} key={message.id}>
                {message.type === "system" ? (
                  <p className="system-message">{message.text}</p>
                ) : (
                  <>
                    <strong>{message.name}</strong>
                    <p>{message.text}</p>
                  </>
                )}
              </div>
            ))}
          </div>

          <form className="skribbl-guess-form" onSubmit={sendGuess}>
            <input
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              placeholder="Type your guess here..."
              aria-label="Type your guess"
              maxLength={200}
            />
            <button type="submit" aria-label="Send message">➤</button>
          </form>
        </aside>
      </section>
    </main>
  );
}