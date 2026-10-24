
import type { Server, Socket } from "socket.io";
import { RoomManager } from "../classes/RoomManager.js";
import { Player } from "../classes/Player.js";
import { SocketEvent } from "../enums/SocketEvent.js";
import { GamePhase } from "../enums/GamePhase.js";
import { cleanName } from "../utils/cleanName.js";
import type { RoomSettings } from "../types/index.js";

interface CreateRoomData {
  hostName?: string;
  avatar?: string;
  settings?: Partial<RoomSettings>;
}

interface JoinRoomData {
  roomId?: string;
  playerName?: string;
  avatar?: string;
}

interface QuickPlayData {
  playerName?: string;
  avatar?: string;
  language?: string;
}

export function registerRoomHandlers(
  _io: Server,
  socket: Socket,
  rooms: RoomManager
): void {
  // Player leave kare ya disconnect ho
  const handleLeave = (): void => {
    const result = rooms.leaveRoom(socket.id);
    if (!result) return;

    socket.leave(result.room.id);

    if (!result.room.isEmpty()) {
      result.room.broadcast(SocketEvent.PLAYER_LEFT, {
        playerId: result.player.id,
        players: result.room.getPlayersDTO(),
      });

      result.room.game?.handlePlayerLeft(result.player.id);
      result.room.cancelAutoStartIfNeeded();
    }
  };

  // Naya room create karna
  socket.on(SocketEvent.CREATE_ROOM, (data: CreateRoomData) => {
    const name = cleanName(data?.hostName);

    if (!name) {
      socket.emit(SocketEvent.ERROR, {
        message: "Name is required",
      });
      return;
    }

    handleLeave();

    const room = rooms.createRoom(data?.settings);

    const player = new Player(
      socket.id,
      name,
      false,
      typeof data?.avatar === "string" ? data.avatar : "0"
    );

    rooms.joinRoom(room.id, player);
    socket.join(room.id);

    socket.emit(SocketEvent.ROOM_JOINED, {
      roomId: room.id,
      players: room.getPlayersDTO(),
      settings: room.settings,
      you: player.toDTO(),
    });
  });

  // Existing room join karna
  socket.on(SocketEvent.JOIN_ROOM, (data: JoinRoomData) => {
    const name = cleanName(data?.playerName);

    if (
      !name ||
      typeof data?.roomId !== "string" ||
      !data.roomId.trim()
    ) {
      socket.emit(SocketEvent.ERROR, {
        message: "Name and room code are required",
      });
      return;
    }

    handleLeave();

    try {
      const player = new Player(
        socket.id,
        name,
        false,
        typeof data?.avatar === "string" ? data.avatar : "0"
      );

      const room = rooms.joinRoom(data.roomId, player);

      socket.join(room.id);

      socket.emit(SocketEvent.ROOM_JOINED, {
        roomId: room.id,
        players: room.getPlayersDTO(),
        settings: room.settings,
        you: player.toDTO(),
      });

      if (room.game) {
        socket.emit(
          SocketEvent.GAME_STATE,
          room.game.getStateFor(socket.id)
        );

        socket.emit(SocketEvent.CANVAS_STATE, {
          strokes: room.game.getStrokes(),
        });
      }

      socket.to(room.id).emit(SocketEvent.PLAYER_JOINED, {
        player: player.toDTO(),
        players: room.getPlayersDTO(),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not join room";

      socket.emit(SocketEvent.ERROR, { message });
    }
  });

  // Quick Play: public room join karo, ya naya room banao
  socket.on(SocketEvent.QUICK_PLAY, (data: QuickPlayData) => {
    const name = cleanName(data?.playerName);

    if (!name) {
      socket.emit(SocketEvent.ERROR, {
        message: "Name is required",
      });
      return;
    }

    handleLeave();

    try {
      // Language ke hisaab se room: same language wala dhoondho, warna naya banao
      const language = rooms.sanitizeSettings({ language: data?.language as RoomSettings["language"] }).language;
      let room = rooms.findPublicRoom(language, name);

      if (!room) {
        room = rooms.createRoom({
          isPrivate: false,
          language,
        });
      }

      const player = new Player(
        socket.id,
        name,
        false,
        typeof data?.avatar === "string" ? data.avatar : "0"
      );

      rooms.joinRoom(room.id, player);
      socket.join(room.id);

      socket.emit(SocketEvent.ROOM_JOINED, {
        roomId: room.id,
        players: room.getPlayersDTO(),
        settings: room.settings,
        you: player.toDTO(),
      });

      // Chalta hua game ho to late joiner ko current state + drawing bhejo
      if (room.game && room.game.phase !== GamePhase.GAME_OVER) {
        socket.emit(SocketEvent.GAME_STATE, room.game.getStateFor(socket.id));
        socket.emit(SocketEvent.CANVAS_STATE, { strokes: room.game.getStrokes() });
      }

      socket.to(room.id).emit(SocketEvent.PLAYER_JOINED, {
        player: player.toDTO(),
        players: room.getPlayersDTO(),
      });

      room.scheduleAutoStart();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Quick Play failed";

      socket.emit(SocketEvent.ERROR, { message });
    }
  });

  // Room settings update karna
  socket.on(
    SocketEvent.UPDATE_SETTINGS,
    (data: Partial<RoomSettings>) => {
      const room = rooms.getRoomByPlayer(socket.id);
      if (!room) return;

      if (!room.isHost(socket.id)) {
        socket.emit(SocketEvent.ERROR, {
          message: "Only the host can change settings",
        });
        return;
      }

      try {
        room.updateSettings(
          rooms.sanitizeSettings({
            ...room.settings,
            ...(data ?? {}),
          })
        );

        room.broadcast(SocketEvent.SETTINGS_UPDATED, {
          settings: room.settings,
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Could not update settings";

        socket.emit(SocketEvent.ERROR, { message });
      }
    }
  );

  // Ready / not ready
  socket.on(SocketEvent.TOGGLE_READY, () => {
    const room = rooms.getRoomByPlayer(socket.id);
    const player = room?.getPlayer(socket.id);

    if (!room || !player) return;

    if (room.game && room.game.phase !== GamePhase.GAME_OVER) {
      return;
    }

    player.isReady = !player.isReady;

    room.broadcast(SocketEvent.PLAYERS_UPDATED, {
      players: room.getPlayersDTO(),
    });
  });

  // Game over hone ke baad dobara khelna
  socket.on(SocketEvent.PLAY_AGAIN, () => {
    const room = rooms.getRoomByPlayer(socket.id);
    if (!room) return;

    if (!room.isHost(socket.id)) {
      socket.emit(SocketEvent.ERROR, {
        message: "Only the host can restart",
      });
      return;
    }

    if (room.game?.phase !== GamePhase.GAME_OVER) return;

    room.resetToLobby(); // ye room_reset khud broadcast karta hai
  });

  // Leave button
  socket.on(SocketEvent.LEAVE_ROOM, handleLeave);

  // Disconnect hone par room se remove karo
  socket.on("disconnect", handleLeave);
}
