import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
const socket = io(SERVER_URL);

export default function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [lastPong, setLastPong] = useState<number | null>(null);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onPong = (data: { time: number }) => setLastPong(data.time);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("pong", onPong);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("pong", onPong);
    };
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>skribbl clone</h1>
      <p>Status: {connected ? "Connected" : "Disconnected"}</p>
      <button onClick={() => socket.emit("ping")}>Ping server</button>
      {lastPong && <p>Pong received at {new Date(lastPong).toLocaleTimeString()}</p>}
    </div>
  );
}