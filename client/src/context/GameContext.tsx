import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { connectSocket, socket } from "../Socket";
import { SocketEvent } from "../enums/SocketEvent";
import type {
  GameState,
  PlayerDTO,
  RoomJoinedData,
  RoomSettings,
  RoundStartData,
} from "../types";

interface GameContextValue {
  connected: boolean;
  roomId: string | null;
  meId: string | null;
  players: PlayerDTO[];
  settings: RoomSettings | null;
  gameState: GameState | null;
  roundStart: RoundStartData | null;
  error: string | null;
  createRoom: (settings: RoomSettings) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  updateSettings: (settings: Partial<RoomSettings>) => void;
  toggleReady: () => void;
  startGame: () => void;
  clearError: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

// Home screen par chuna hua naam aur avatar
function getIdentity() {
  return {
    name: sessionStorage.getItem("playerName") || "Guest",
    avatar: sessionStorage.getItem("playerAvatar") || "0",
  };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(socket.connected);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerDTO[]>([]);
  const [settings, setSettings] = useState<RoomSettings | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roundStart, setRoundStart] = useState<RoundStartData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Room chhodne par saara room ka data saaf
  const resetRoom = useCallback(() => {
    setRoomId(null);
    setMeId(null);
    setPlayers([]);
    setSettings(null);
    setGameState(null);
    setRoundStart(null);
  }, []);

  // Server ke saare events yahin sune jate hain, taaki page badalne par koi event miss na ho
  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => {
      setConnected(false);
      resetRoom();
      setError("Disconnected from server");
    };
    const onRoomJoined = (data: RoomJoinedData) => {
      setRoomId(data.roomId);
      setMeId(data.you.id);
      setPlayers(data.players);
      setSettings(data.settings);
      setGameState(null);
      setRoundStart(null);
      setError(null);
    };
    const onPlayerList = (data: { players: PlayerDTO[] }) => setPlayers(data.players);
    const onSettings = (data: { settings: RoomSettings }) => setSettings(data.settings);
    const onRoomReset = (data: { players: PlayerDTO[]; settings: RoomSettings }) => {
      setPlayers(data.players);
      setSettings(data.settings);
      setGameState(null);
      setRoundStart(null);
    };
    const onGameState = (data: GameState) => setGameState(data);
    const onRoundStart = (data: RoundStartData) => setRoundStart(data);
    const onError = (data: { message: string }) => setError(data.message);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on(SocketEvent.ROOM_JOINED, onRoomJoined);
    socket.on(SocketEvent.PLAYER_JOINED, onPlayerList);
    socket.on(SocketEvent.PLAYER_LEFT, onPlayerList);
    socket.on(SocketEvent.PLAYERS_UPDATED, onPlayerList);
    socket.on(SocketEvent.SETTINGS_UPDATED, onSettings);
    socket.on(SocketEvent.ROOM_RESET, onRoomReset);
    socket.on(SocketEvent.GAME_STATE, onGameState);
    socket.on(SocketEvent.ROUND_START, onRoundStart);
    socket.on(SocketEvent.ERROR, onError);

    connectSocket();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(SocketEvent.ROOM_JOINED, onRoomJoined);
      socket.off(SocketEvent.PLAYER_JOINED, onPlayerList);
      socket.off(SocketEvent.PLAYER_LEFT, onPlayerList);
      socket.off(SocketEvent.PLAYERS_UPDATED, onPlayerList);
      socket.off(SocketEvent.SETTINGS_UPDATED, onSettings);
      socket.off(SocketEvent.ROOM_RESET, onRoomReset);
      socket.off(SocketEvent.GAME_STATE, onGameState);
      socket.off(SocketEvent.ROUND_START, onRoundStart);
      socket.off(SocketEvent.ERROR, onError);
    };
  }, [resetRoom]);

  // ---------- Actions (client -> server) ----------

  const createRoom = useCallback((roomSettings: RoomSettings) => {
    const { name, avatar } = getIdentity();
    setError(null);
    socket.emit(SocketEvent.CREATE_ROOM, { hostName: name, avatar, settings: roomSettings });
  }, []);

  const joinRoom = useCallback((code: string) => {
    const { name, avatar } = getIdentity();
    setError(null);
    socket.emit(SocketEvent.JOIN_ROOM, { roomId: code, playerName: name, avatar });
  }, []);

  const leaveRoom = useCallback(() => {
    socket.emit(SocketEvent.LEAVE_ROOM);
    resetRoom();
  }, [resetRoom]);

  const updateSettings = useCallback((changes: Partial<RoomSettings>) => {
    socket.emit(SocketEvent.UPDATE_SETTINGS, changes);
  }, []);

  const toggleReady = useCallback(() => {
    socket.emit(SocketEvent.TOGGLE_READY);
  }, []);

  const startGame = useCallback(() => {
    socket.emit(SocketEvent.START_GAME);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<GameContextValue>(
    () => ({
      connected,
      roomId,
      meId,
      players,
      settings,
      gameState,
      roundStart,
      error,
      createRoom,
      joinRoom,
      leaveRoom,
      updateSettings,
      toggleReady,
      startGame,
      clearError,
    }),
    [
      connected, roomId, meId, players, settings, gameState, roundStart, error,
      createRoom, joinRoom, leaveRoom, updateSettings, toggleReady, startGame, clearError,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside <GameProvider>");
  return ctx;
}