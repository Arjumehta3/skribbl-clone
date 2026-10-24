import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { WordMode } from "../enums/WordMode";
import type { RoomSettings } from "../types";
import "./RoomSetup.css";

export default function CreateRoom() {
  const navigate = useNavigate();
  const { connected, roomId, error, createRoom, clearError } = useGame();
  const [settings, setSettings] = useState<RoomSettings>({
    maxPlayers: 8, rounds: 3, drawTime: 80, wordCount: 3, hints: 2,
    wordMode: WordMode.NORMAL, isPrivate: true,
  });

  const update = <K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  
  useEffect(() => {
    if (roomId) navigate(`/room/${roomId}`);
  }, [roomId, navigate]);

  const handleCreate = () => {
    clearError();
    createRoom(settings);
  };

  return (
    <main className="room-setup-page">
      <section className="room-setup-card">
        <button className="back-link" onClick={() => navigate("/")}>← Home</button>
        <div className="setup-logo">✏️ skribbl</div>
        <h1>Create a room</h1>
        <p className="setup-subtitle">Choose how your drawing game should work.</p>
        <div className="setup-grid">
          <label>Maximum players <strong>{settings.maxPlayers}</strong>
            <input type="range" min="2" max="20" value={settings.maxPlayers} onChange={(e) => update("maxPlayers", Number(e.target.value))} />
            <small>2–20 players</small>
          </label>
          <label>Rounds <strong>{settings.rounds}</strong>
            <input type="range" min="2" max="10" value={settings.rounds} onChange={(e) => update("rounds", Number(e.target.value))} />
            <small>2–10 rounds</small>
          </label>
          <label>Drawing time <strong>{settings.drawTime}s</strong>
            <input type="range" min="15" max="240" step="15" value={settings.drawTime} onChange={(e) => update("drawTime", Number(e.target.value))} />
            <small>15–240 seconds per turn</small>
          </label>
          <label>Words per turn <strong>{settings.wordCount}</strong>
            <input type="range" min="1" max="5" value={settings.wordCount} onChange={(e) => update("wordCount", Number(e.target.value))} />
            <small>Number of words shown to drawer</small>
          </label>
          <label>Hints <strong>{settings.hints === 0 ? "Off" : settings.hints}</strong>
            <input type="range" min="0" max="5" value={settings.hints} onChange={(e) => update("hints", Number(e.target.value))} />
          </label>
          <label>Word mode
            <select value={settings.wordMode} onChange={(e) => update("wordMode", e.target.value as RoomSettings["wordMode"])}>
              <option value={WordMode.NORMAL}>Normal</option>
              <option value={WordMode.HIDDEN}>Hidden</option>
              <option value={WordMode.COMBINATION}>Combination</option>
            </select>
          </label>
        </div>
        <label className="private-toggle">
          <input type="checkbox" checked={settings.isPrivate} onChange={(e) => update("isPrivate", e.target.checked)} />
          Private room (invite using a room code)
        </label>
        {!connected && <p className="form-error" role="alert">Connecting to server… (server chal raha hai?)</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-setup-button" onClick={handleCreate} disabled={!connected}>
          Create room &amp; open lobby
        </button>
      </section>
    </main>
  );
}