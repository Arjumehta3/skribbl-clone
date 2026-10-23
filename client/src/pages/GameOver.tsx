
import { useNavigate } from "react-router-dom";

function GameOver() {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Game Over!</h1>
      <p>Thanks for playing.</p>

      <button onClick={() => navigate("/")}>
        Back to Home
      </button>

      <button onClick={() => navigate("/lobby")}>
        Play Again
      </button>
    </div>
  );
}

export default GameOver;
