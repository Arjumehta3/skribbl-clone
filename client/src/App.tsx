import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import GameOver from "./pages/GameOver";
import CreateRoom from "./pages/CreateRoom";
import JoinRoom from "./pages/JoinRoom";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create-room" element={<CreateRoom />} />
      <Route path="/join-room" element={<JoinRoom />} />
      <Route path="/lobby" element={<Lobby />} />
      <Route path="/game" element={<Game />} />
      <Route path="/game-over" element={<GameOver />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
