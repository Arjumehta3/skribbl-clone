import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const PORT = Number(process.env.PORT) || 3000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_URL }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_URL },
});

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("ping", () => {
    socket.emit("pong", { time: Date.now() });
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});