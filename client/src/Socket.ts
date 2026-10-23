import { io, type Socket } from "socket.io-client";

/**
 * Socket.IO client factory.
 * Set VITE_SOCKET_URL in client/.env once the backend is available.
 * No connection is attempted when the variable is missing.
 */
let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const url = import.meta.env.VITE_SOCKET_URL;
  if (!url) return null;

  if (!socket) {
    socket = io(url, { autoConnect: false, transports: ["websocket", "polling"] });
  }
  return socket;
}

export function connectSocket(): Socket | null {
  const client = getSocket();
  if (client && !client.connected) client.connect();
  return client;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}
