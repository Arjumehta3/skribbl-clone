import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RoomSetup.css";

type RoomSettings = {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordCount: number;
  hints: number;
  wordMode: "normal" | "hidden" | "combination";
  isPrivate: boolean;
};

export default function CreateRoom() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<RoomSettings>({
    maxPlayers: 8, rounds: 3, drawTime: 80, wordCount: 3, hints: 2,
    wordMode: "normal", isPrivate: true,
  });

  const update = <K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  const createRoom = () => {
    const roomCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    sessionStorage.setItem("roomId", roomCode);
    sessionStorage.setItem("roomSettings", JSON.stringify(settings));
    sessionStorage.setItem("roomHost", "true");
    // BACKEND REQUIRED: create the room on the server and receive its authoritative room ID.
    navigate("/lobby");
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
              <option value="normal">Normal</option>
              <option value="hidden">Hidden</option>
              <option value="combination">Combination</option>
            </select>
          </label>
        </div>
        <label className="private-toggle">
          <input type="checkbox" checked={settings.isPrivate} onChange={(e) => update("isPrivate", e.target.checked)} />
          Private room (invite using a room code)
        </label>
        <div className="backend-notice">Frontend demo: settings are stored in this browser. Server room creation is marked <b>BACKEND REQUIRED</b>.</div>
        <button className="primary-setup-button" onClick={createRoom}>Create room &amp; open lobby</button>
      </section>
    </main>
  );
}
