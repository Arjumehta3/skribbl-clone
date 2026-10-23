import type { Server, Socket } from "socket.io";
import { RoomManager } from "../classes/RoomManager.js";
import { Player } from "../classes/Player.js";
import { SocketEvent } from "../enums/SocketEvent.js";
import { GamePhase } from "../enums/GamePhase.js";
import { cleanName } from "../utils/cleanName.js";
import type { RoomSettings } from "../types/index.js";

interface CreateRoomData {
  hostName?: string;
  settings?: Partial<RoomSettings>;
}

interface JoinRoomData {
  roomId?: string;
  playerName?: string;
}

export function registerRoomHandlers(_io: Server, socket: Socket, rooms: RoomManager): void {
  // Player leave kare ya disconnect ho, dono mein yahi chalega
  const handleLeave = (): void => {
    const result = rooms.leaveRoom(socket.id);
    if (!result) return;

    socket.leave(result.room.id);
    if (!result.room.isEmpty()) {
      result.room.broadcast(SocketEvent.PLAYER_LEFT, {
        playerId: result.player.id,
        players: result.room.getPlayersDTO(),
      });
      // Game chal raha ho to usko bhi batao (drawer gaya? 2 se kam bache?)
      result.room.game?.handlePlayerLeft(result.player.id);
    }
  };

  socket.on(SocketEvent.CREATE_ROOM, (data: CreateRoomData) => {
    const name = cleanName(data?.hostName);
    if (!name) {
      socket.emit(SocketEvent.ERROR, { message: "Name is required" });
      return;
    }

    handleLeave(); // agar pehle kisi room mein tha

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
    const name = cleanName(data?.playerName);
    if (!name || typeof data?.roomId !== "string" || !data.roomId.trim()) {
      socket.emit(SocketEvent.ERROR, { message: "Name and room code are required" });
      return;
    }

    handleLeave();

    try {
      const player = new Player(socket.id, name);
      const room = rooms.joinRoom(data.roomId, player); // not found / full ho to error
      socket.join(room.id);

      socket.emit(SocketEvent.ROOM_JOINED, {
        roomId: room.id,
        players: room.getPlayersDTO(),
        settings: room.settings,
        you: player.toDTO(),
      });

      // Game pehle se chal raha ho to naye player ko current state aur drawing do
      if (room.game) {
        socket.emit(SocketEvent.GAME_STATE, room.game.getStateFor(socket.id));
        socket.emit(SocketEvent.CANVAS_STATE, { strokes: room.game.getStrokes() });
      }

      // Baaki players ko batao (naye player ko chhodkar)
      socket.to(room.id).emit(SocketEvent.PLAYER_JOINED, {
        player: player.toDTO(),
        players: room.getPlayersDTO(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not join room";
      socket.emit(SocketEvent.ERROR, { message });
    }
  });

  socket.on(SocketEvent.UPDATE_SETTINGS, (data: Partial<RoomSettings>) => {
    const room = rooms.getRoomByPlayer(socket.id);
    if (!room) return;

    if (!room.isHost(socket.id)) {
      socket.emit(SocketEvent.ERROR, { message: "Only the host can change settings" });
      return;
    }

    try {
      // Purani settings par naya data mila ke dobara limits ke andar rakho
      room.updateSettings(rooms.sanitizeSettings({ ...room.settings, ...(data ?? {}) }));
      room.broadcast(SocketEvent.SETTINGS_UPDATED, { settings: room.settings });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update settings";
      socket.emit(SocketEvent.ERROR, { message });
    }
  });

  socket.on(SocketEvent.TOGGLE_READY, () => {
    const room = rooms.getRoomByPlayer(socket.id);
    const player = room?.getPlayer(socket.id);
    if (!room || !player) return;
    if (room.game && room.game.phase !== GamePhase.GAME_OVER) return; // game ke beech nahi

    player.isReady = !player.isReady;
    room.broadcast(SocketEvent.PLAYERS_UPDATED, { players: room.getPlayersDTO() });
  });

  socket.on(SocketEvent.PLAY_AGAIN, () => {
    const room = rooms.getRoomByPlayer(socket.id);
    if (!room) return;

    if (!room.isHost(socket.id)) {
      socket.emit(SocketEvent.ERROR, { message: "Only the host can restart" });
      return;
    }
    if (room.game?.phase !== GamePhase.GAME_OVER) return;

    room.resetToLobby();
    room.broadcast(SocketEvent.ROOM_RESET, {
      players: room.getPlayersDTO(),
      settings: room.settings,
    });
  });

  // Leave button dabane par
  socket.on(SocketEvent.LEAVE_ROOM, handleLeave);

  socket.on("disconnect", handleLeave);
}