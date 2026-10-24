import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import "./RoomSetup.css";

export default function JoinRoom() {
  const navigate = useNavigate();
  const { connected, roomId, error, joinRoom, clearError } = useGame();
  const [roomCode, setRoomCode] = useState("");
  const [localError, setLocalError] = useState("");

  // Join ho gaya (room_joined aaya) to lobby kholo
  useEffect(() => {
    if (roomId) navigate(`/room/${roomId}`);
  }, [roomId, navigate]);

  const handleJoin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (code.length < 4) {
      setLocalError("Enter a valid room code (at least 4 characters).");
      return;
    }
    joinRoom(code);
  };

  return (
    <main className="room-setup-page">
      <section className="room-setup-card join-card">
        <button className="back-link" onClick={() => navigate("/")}>← Home</button>
        <div className="setup-logo">✏️ skribbl</div>
        <h1>Join a room</h1>
        <p className="setup-subtitle">Enter the room code shared by the host.</p>
        <form onSubmit={handleJoin}>
          <label className="room-code-label" htmlFor="room-code">Room code</label>
          <input
            id="room-code"
            className="room-code-input"
            value={roomCode}
            onChange={(e) => {
              setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
              setLocalError("");
              clearError();
            }}
            placeholder="E.G. A1B2C3"
            autoComplete="off"
          />
          {!connected && <p className="form-error" role="alert">Connecting to server… (server chal raha hai?)</p>}
          {(localError || error) && <p className="form-error" role="alert">{localError || error}</p>}
          <button className="primary-setup-button" type="submit" disabled={!connected} style={{ marginTop: 16 }}>
            Join lobby
          </button>
        </form>
      </section>
    </main>
  );
}