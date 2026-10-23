import { io } from "socket.io-client";

type Joined = { roomId: string; players: { name: string }[] };

const a = io("http://localhost:3000");
const b = io("http://localhost:3000");
const c = io("http://localhost:3000");

// A room banata hai
a.on("room_joined", (d: Joined) => {
  console.log("1. A created room:", d.roomId, d.players.map((p) => p.name));
  b.emit("join_room", { roomId: d.roomId, playerName: "Riya" });
});

a.on("player_joined", (d: { player: { name: string } }) => {
  console.log("3. A sees player_joined:", d.player.name);
});

a.on("player_left", (d: { players: unknown[] }) => {
  console.log("5. A sees player_left, remaining:", d.players.length);
});

// B join karta hai, phir leave_room bhejta hai
b.on("room_joined", (d: Joined) => {
  console.log("2. B joined:", d.players.map((p) => p.name));
  setTimeout(() => b.emit("leave_room"), 500);
});

// C galat code se join karne ki koshish karta hai
c.on("error", (e: { message: string }) => {
  console.log("4. C error (expected):", e.message);
});
c.on("connect", () => {
  c.emit("join_room", { roomId: "WRONG1", playerName: "Karan" });
});

a.emit("create_room", { hostName: "Aman", settings: { rounds: 3 } });

setTimeout(() => process.exit(0), 2000);