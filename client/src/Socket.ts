import { io, type Socket } from "socket.io-client";

// .env mein VITE_SERVER_URL ho to wahi; warna isi host ka port 3000
// (phone se http://<pc-ip>:5173 kholo to server bhi <pc-ip>:3000 par milega)
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:3000`;

// Poore app mein sirf ek socket. autoConnect off hai, hum khud connect karenge.
export const socket: Socket = io(SERVER_URL, { autoConnect: false });

export function connectSocket(): Socket {
  if (!socket.connected) socket.connect();
  return socket;
}
