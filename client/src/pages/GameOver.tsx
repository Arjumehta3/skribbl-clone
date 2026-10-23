import { useNavigate } from "react-router-dom";
import "./RoomSetup.css";

export default function GameOver() {
  const navigate = useNavigate();
  const playerName = sessionStorage.getItem("playerName") || "Player";
  return (
    <main className="room-setup-page">
      <section className="room-setup-card join-card">
        <div className="setup-logo">🏆 skribbl</div>
        <h1>Game Over!</h1>
        <p className="setup-subtitle">Thanks for playing, {playerName}.</p>
        <div className="backend-notice">BACKEND REQUIRED: final scores, winner and leaderboard will be supplied by the game server.</div>
        <button className="primary-setup-button" onClick={() => navigate("/lobby")}>Play again</button>
        <button className="back-link" style={{ display: "block", margin: "16px auto 0" }} onClick={() => navigate("/")}>Back to Home</button>
      </section>
    </main>
  );
}
