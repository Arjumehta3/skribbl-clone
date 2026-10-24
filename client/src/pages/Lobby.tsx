import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGame } from "../context/GameContext";
import DoodleAvatar from "../components/DoodleAvatar";
import { toAvatarIndex } from "../utils/avatar";
import { usePrefs } from "../utils/usePrefs";
import SettingsPanel from "../components/SettingsPanel";
import { GamePhase } from "../enums/GamePhase";
import { WordMode } from "../enums/WordMode";
import type { RoomSettings } from "../types";
import "./RoomSetup.css";
import "./Lobby.css";

export default function Lobby() {
  const { roomId: urlRoomId } = useParams();
  const navigate = useNavigate();
  const {
    connected, roomId, meId, players, settings, gameState, error, autoStartIn,
    joinRoom, leaveRoom, updateSettings, toggleReady, startGame, clearError,
  } = useGame();

  const [hasIdentity, setHasIdentity] = useState(Boolean(sessionStorage.getItem("playerName")));
  const [nameInput, setNameInput] = useState("");
  const [copied, setCopied] = useState<"" | "code" | "link">("");
  const [draft, setDraft] = useState<Partial<RoomSettings>>({});
  const autoJoinTried = useRef(false);
  const [prefs, setPrefs] = usePrefs();
  const [showSettings, setShowSettings] = useState(false);

  // Invite link se aaya hai (/room/ABC123): naam pata ho to apne aap join karo
  useEffect(() => {
    if (!connected || roomId || !urlRoomId || !hasIdentity || autoJoinTried.current) return;
    autoJoinTried.current = true;
    joinRoom(urlRoomId);
  }, [connected, roomId, urlRoomId, hasIdentity, joinRoom]);

  // Host ne game start kiya: server ne game_state bheja, ab game page kholo
  useEffect(() => {
    if (gameState && gameState.phase !== GamePhase.LOBBY) navigate("/game");
  }, [gameState, navigate]);

  const me = players.find((p) => p.id === meId);
  const isHost = me?.isHost === true;
  const everyoneReady = players.every((p) => p.isHost || p.isReady);
  const canStart = isHost && players.length >= 2 && everyoneReady;
  const isPublic = settings ? !settings.isPrivate : false; // Quick Play room: game apne aap shuru hota hai

  const inviteLink = `${window.location.origin}/room/${roomId ?? urlRoomId ?? ""}`;

  const copy = async (what: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(what === "code" ? (roomId ?? "") : inviteLink);
      setCopied(what);
      window.setTimeout(() => setCopied(""), 1500);
    } catch {
      // clipboard allowed nahi hai to kuch nahi
    }
  };

  const handleLeave = () => {
    leaveRoom();
    navigate("/");
  };

  const submitName = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = nameInput.trim();
    if (!clean) return;
    sessionStorage.setItem("playerName", clean);
    if (sessionStorage.getItem("playerAvatar") === null) {
      sessionStorage.setItem("playerAvatar", String(Math.floor(Math.random() * 8)));
    }
    setHasIdentity(true);
  };

  // ---------- Room mein nahi hain abhi ----------
  if (!roomId || !settings) {
    return (
      <main className="room-setup-page">
        <section className="room-setup-card join-card">
          <div className="setup-logo">✏️ skribbl</div>
          {!hasIdentity ? (
            <form className="name-form" onSubmit={submitName}>
              <h1>Enter your name</h1>
              <p className="setup-subtitle">You are joining room {urlRoomId}</p>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name"
                maxLength={20}
                autoFocus
              />
              <button className="primary-setup-button" type="submit">Join room</button>
            </form>
          ) : (
            <>
              <h1>{error ? "Could not join" : "Joining room…"}</h1>
              {error ? (
                <p className="form-error" role="alert">{error}</p>
              ) : (
                <p className="setup-subtitle">{connected ? `Room ${urlRoomId}` : "Connecting to server…"}</p>
              )}
              <button
                className="primary-setup-button"
                onClick={() => { clearError(); navigate("/"); }}
              >
                Back to Home
              </button>
            </>
          )}
        </section>
      </main>
    );
  }

  // ---------- Settings (host badal sakta hai) ----------
  const view: RoomSettings = { ...settings, ...draft };

  const commit = (key: keyof RoomSettings) => {
    if (!isHost || draft[key] === undefined) return;
    updateSettings({ [key]: draft[key] });
    setDraft((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const slider = (key: "maxPlayers" | "rounds" | "drawTime" | "wordCount" | "hints", label: string, min: number, max: number, step = 1) => (
    <div className="setting-row">
      <span>{label}</span>
      <span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={view[key]}
          disabled={!isHost || isPublic}
          aria-label={label}
          onChange={(e) => setDraft((current) => ({ ...current, [key]: Number(e.target.value) }))}
          onPointerUp={() => commit(key)}
          onKeyUp={() => commit(key)}
        />{" "}
        <strong>{view[key]}</strong>
      </span>
    </div>
  );

  return (
    <main className="room-setup-page">
      <section className="room-setup-card lobby-card">
        <div className="lobby-settings-anchor">
          <button
            className="lobby-gear"
            onClick={() => setShowSettings((v) => !v)}
            aria-label="Open settings"
            title="Settings"
          >
            ⚙️
          </button>
          {showSettings && (
            <SettingsPanel prefs={prefs} setPrefs={setPrefs} onClose={() => setShowSettings(false)} />
          )}
        </div>
        <div className="setup-logo">✏️ skribbl</div>
        <h1>Game lobby</h1>

        <div className="lobby-code-box">
          <div>
            <span className="code-label">Room code</span>
            <span className="code-value">{roomId}</span>
            <span className="link-value">{inviteLink}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="copy-button" onClick={() => copy("code")}>
              {copied === "code" ? "Copied!" : "Copy code"}
            </button>
            <button className="copy-button" onClick={() => copy("link")}>
              {copied === "link" ? "Copied!" : "Copy invite link"}
            </button>
          </div>
        </div>

        <div className="lobby-columns">
          <div className="lobby-panel">
            <h2>Players ({players.length}/{view.maxPlayers})</h2>
            {players.map((p) => (
              <div className={`lobby-player ${p.id === meId ? "is-you" : ""}`} key={p.id}>
                <div className="room-avatar">
                  <DoodleAvatar index={toAvatarIndex(p.avatar)} />
                </div>
                <span className="player-name">{p.name}{p.id === meId ? " (You)" : ""}</span>
                {p.isHost ? (
                  <span className="badge host">Host</span>
                ) : (
                  <span className={`badge ${p.isReady ? "ready" : "waiting"}`}>
                    {p.isReady ? "Ready" : "Not ready"}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="lobby-panel lobby-settings">
            <h2>Settings {isHost ? "" : "(host only)"}</h2>
            {slider("maxPlayers", "Max players", 2, 20)}
            {slider("rounds", "Rounds", 2, 10)}
            {slider("drawTime", "Draw time (s)", 15, 240, 15)}
            {slider("wordCount", "Words per turn", 1, 5)}
            {slider("hints", "Hints", 0, 5)}
            <div className="setting-row">
              <span>Word mode</span>
              <select
                value={view.wordMode}
                disabled={!isHost || isPublic}
                onChange={(e) => updateSettings({ wordMode: e.target.value as RoomSettings["wordMode"] })}
              >
                <option value={WordMode.NORMAL}>Normal</option>
                <option value={WordMode.HIDDEN}>Hidden</option>
                <option value={WordMode.COMBINATION}>Combination</option>
              </select>
            </div>
          </div>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="lobby-actions">
          <button className="secondary" onClick={handleLeave}>Leave</button>
          {isPublic ? null : isHost ? (
            <button onClick={startGame} disabled={!canStart}>Start game</button>
          ) : (
            <button onClick={toggleReady}>{me?.isReady ? "Not ready" : "I'm ready"}</button>
          )}
        </div>
        {isPublic && (
          <p className="lobby-hint">
            {players.length < 2
              ? "Waiting for other players… game starts automatically when someone joins."
              : autoStartIn
                ? `Game starting in ${autoStartIn} seconds…`
                : "Game is about to start…"}
          </p>
        )}
        {!isPublic && isHost && !canStart && (
          <p className="lobby-hint">
            {players.length < 2 ? "Need at least 2 players to start." : "Waiting for everyone to be ready."}
          </p>
        )}
      </section>
    </main>
  );
}