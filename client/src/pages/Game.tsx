import { useNavigate } from "react-router-dom";
import "./RoomSetup.css";

export default function Game() {
  const navigate = useNavigate();
  return (
    <main className="room-setup-page">
      <section className="room-setup-card join-card">
        <div className="setup-logo">✏️ skribbl</div>
        <h1>Game screen</h1>
        <p className="setup-subtitle">The drawing board, timer, word selection and chat are currently implemented on the Lobby screen.</p>
        <div className="backend-notice">BACKEND REQUIRED: server-managed turns, real-time drawing sync, shared guesses and scores.</div>
        <button className="primary-setup-button" onClick={() => navigate("/lobby")}>Open drawing board</button>
      </section>
    </main>
  );
}
