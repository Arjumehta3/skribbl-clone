import { useEffect, useState } from "react";
import { connectSocket, disconnectSocket, getSocket } from "../Socket";

/**
 * Backend integration hook. Returns null when VITE_SOCKET_URL is not configured.
 * Components can migrate to this hook when the Socket.IO backend is ready.
 */
export function useSocket() {
  const [connected, setConnected] = useState(Boolean(getSocket()?.connected));

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    setConnected(socket.connected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      disconnectSocket();
    };
  }, []);

  return { socket: getSocket(), connected };
}
