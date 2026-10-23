import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RoomSetup.css";

export default function JoinRoom() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");

  const joinRoom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (code.length < 4) {
      setError("Enter a valid room code (at least 4 characters).");
      return;
    }
    sessionStorage.setItem("roomId", code);
    sessionStorage.removeItem("roomHost");
    // BACKEND REQUIRED: validate code, join room, and receive current players/settings.
    navigate("/lobby");
  };

  return (
    <main className="room-setup-page">
      <section className="room-setup-card join-card">
        <button className="back-link" onClick={() => navigate("/")}>← Home</button>
        <div className="setup-logo">✏️ skribbl</div>
        <h1>Join a room</h1>
        <p className="setup-subtitle">Enter the room code shared by the host.</p>
        <form onSubmit={joinRoom}>
          <label className="room-code-label" htmlFor="room-code">Room code</label>
          <input id="room-code" className="room-code-input" value={roomCode} onChange={(e) => { setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)); setError(""); }} placeholder="E.G. A1B2C3" autoComplete="off" />
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="backend-notice">BACKEND REQUIRED: room code verification and real player joining will work after Socket.IO/API integration.</div>
          <button className="primary-setup-button" type="submit">Join lobby</button>
        </form>
      </section>
    </main>
  );
}
