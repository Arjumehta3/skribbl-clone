import type { Server, Socket } from "socket.io";
import { RoomManager } from "../classes/RoomManager.js";
import { Player } from "../classes/Player.js";
import { SocketEvent } from "../enums/SocketEvent.js";
import type { RoomSettings } from "../types/index.js";

interface CreateRoomData {
  hostName?: string;
  settings?: Partial<RoomSettings>;
}

interface JoinRoomData {
  roomId?: string;
  playerName?: string;
}

export function registerRoomHandlers(io: Server, socket: Socket, rooms: RoomManager): void {
 
  const handleLeave = (): void => {
    const result = rooms.leaveRoom(socket.id);
    if (!result) return;

    socket.leave(result.room.id);
    if (!result.room.isEmpty()) {
      result.room.broadcast(SocketEvent.PLAYER_LEFT, {
        playerId: result.player.id,
        players: result.room.getPlayersDTO(),
      });
    }
  };

  socket.on(SocketEvent.CREATE_ROOM, (data: CreateRoomData) => {
    const name = data?.hostName?.trim();
    if (!name) {
      socket.emit(SocketEvent.ERROR, { message: "Name is required" });
      return;
    }

    handleLeave(); 

    const room = rooms.createRoom(data.settings);
    const player = new Player(socket.id, name);
    rooms.joinRoom(room.id, player);
    socket.join(room.id);

    socket.emit(SocketEvent.ROOM_JOINED, {
      roomId: room.id,
      players: room.getPlayersDTO(),
      settings: room.settings,
      you: player.toDTO(),
    });
  });

  socket.on(SocketEvent.JOIN_ROOM, (data: JoinRoomData) => {
    const name = data?.playerName?.trim();
    if (!name || !data.roomId) {
      socket.emit(SocketEvent.ERROR, { message: "Name and room code are required" });
      return;
    }

    handleLeave();

    try {
      const player = new Player(socket.id, name);
      const room = rooms.joinRoom(data.roomId, player); 
      socket.join(room.id);

      socket.emit(SocketEvent.ROOM_JOINED, {
        roomId: room.id,
        players: room.getPlayersDTO(),
        settings: room.settings,
        you: player.toDTO(),
      });

      
      socket.to(room.id).emit(SocketEvent.PLAYER_JOINED, {
        player: player.toDTO(),
        players: room.getPlayersDTO(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not join room";
      socket.emit(SocketEvent.ERROR, { message });
    }
  });

 
  socket.on(SocketEvent.LEAVE_ROOM, handleLeave);

  socket.on("disconnect", handleLeave);
}