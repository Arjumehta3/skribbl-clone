import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { RoomManager } from "./classes/RoomManager.js";
import { registerRoomHandlers } from "./handlers/roomHandlers.js";
import { registerGameHandlers } from "./handlers/gameHandlers.js";
import { registerDrawHandlers } from "./handlers/drawHandlers.js";
import { registerModerationHandlers } from "./handlers/moderationHandlers.js";
const PORT = Number(process.env.PORT) || 3000;
// CLIENT_URL set ho to sirf wahi (comma se alag kar sakte ho); warna dev mein sab allowed (phone LAN testing ke liye)
const ORIGIN = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",").map((u) => u.trim()) : true;
const app = express();
app.use(cors({ origin: ORIGIN }));
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: ORIGIN },
});
const rooms = new RoomManager(io);
io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);
    registerRoomHandlers(io, socket, rooms);
    registerGameHandlers(io, socket, rooms);
    registerDrawHandlers(io, socket, rooms);
    registerModerationHandlers(io, socket, rooms);
    socket.on("ping", () => {
        socket.emit("pong", { time: Date.now() });
    });
    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.id);
    });
});
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
