import { io, type Socket } from "socket.io-client";

// 1) .env mein VITE_SERVER_URL ho to wahi (frontend aur backend alag deploy hon to)
// 2) Production mein jab server hi website dikha raha ho: isi origin par
// 3) Local dev: isi host ka port 3000 (phone se http://<pc-ip>:5173 kholo to server <pc-ip>:3000)
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : window.location.origin);

// Poore app mein sirf ek socket. autoConnect off hai, hum khud connect karenge.
export const socket: Socket = io(SERVER_URL, { autoConnect: false });

export function connectSocket(): Socket {
  if (!socket.connected) socket.connect();
  return socket;
}
