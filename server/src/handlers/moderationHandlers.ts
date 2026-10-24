import type { Server, Socket } from "socket.io";
import { RoomManager } from "../classes/RoomManager.js";
import { SocketEvent } from "../enums/SocketEvent.js";

interface TargetData {
  playerId?: string;
}

const MIN_PLAYERS_FOR_VOTEKICK = 3;

export function registerModerationHandlers(
  io: Server,
  socket: Socket,
  rooms: RoomManager
): void {
  // Player ko room se nikalo aur baaki sabko batao
  const removePlayer = (roomId: string, targetId: string, reason: "kicked" | "banned"): void => {
    const room = rooms.getRoom(roomId);
    const target = room?.getPlayer(targetId);
    if (!room || !target) return;

    const targetSocket = io.sockets.sockets.get(targetId);
    targetSocket?.emit(SocketEvent.KICKED, {
      reason,
      message:
        reason === "banned"
          ? "You were banned from the room by the host."
          : "You were kicked from the room.",
    });
    targetSocket?.leave(room.id);

    const result = rooms.leaveRoom(targetId);
    if (!result) return;

    if (!result.room.isEmpty()) {
      result.room.broadcast(SocketEvent.PLAYER_LEFT, {
        playerId: result.player.id,
        players: result.room.getPlayersDTO(),
      });
      result.room.broadcast(SocketEvent.SYSTEM_MESSAGE, {
        text: `${result.player.name} was ${reason}.`,
      });
      result.room.game?.handlePlayerLeft(result.player.id);
      result.room.cancelAutoStartIfNeeded();
    }
  };

  // Host: kick ya ban
  const hostAction = (data: TargetData, reason: "kicked" | "banned"): void => {
    const room = rooms.getRoomByPlayer(socket.id);
    if (!room) return;

    if (!room.isHost(socket.id)) {
      socket.emit(SocketEvent.ERROR, { message: "Only the host can do that" });
      return;
    }

    const targetId = data?.playerId;
    const target = typeof targetId === "string" ? room.getPlayer(targetId) : undefined;
    if (!target || target.id === socket.id) return;

    if (reason === "banned") room.ban(target.name);
    removePlayer(room.id, target.id, reason);
  };

  socket.on(SocketEvent.KICK_PLAYER, (data: TargetData) => hostAction(data, "kicked"));
  socket.on(SocketEvent.BAN_PLAYER, (data: TargetData) => hostAction(data, "banned"));

  // Koi bhi player: votekick
  socket.on(SocketEvent.VOTE_KICK, (data: TargetData) => {
    const room = rooms.getRoomByPlayer(socket.id);
    const voter = room?.getPlayer(socket.id);
    if (!room || !voter) return;

    const targetId = data?.playerId;
    const target = typeof targetId === "string" ? room.getPlayer(targetId) : undefined;
    if (!target || target.id === socket.id) return;

    if (room.getPlayers().length < MIN_PLAYERS_FOR_VOTEKICK) {
      socket.emit(SocketEvent.ERROR, {
        message: `Votekick needs at least ${MIN_PLAYERS_FOR_VOTEKICK} players`,
      });
      return;
    }

    const { votes, needed } = room.addKickVote(target.id, socket.id);
    room.broadcast(SocketEvent.SYSTEM_MESSAGE, {
      text: `${voter.name} voted to kick ${target.name} (${votes}/${needed})`,
    });

    if (votes >= needed) removePlayer(room.id, target.id, "kicked");
  });
}
