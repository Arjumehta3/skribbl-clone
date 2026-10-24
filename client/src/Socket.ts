import { io, type Socket } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

// Poore app mein sirf ek socket. autoConnect off hai, hum khud connect karenge.
export const socket: Socket = io(SERVER_URL, { autoConnect: false });

export function connectSocket(): Socket {
  if (!socket.connected) socket.connect();
  return socket;
}