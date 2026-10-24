import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { connectSocket, socket } from "../Socket";
import { SocketEvent } from "../enums/SocketEvent";
import type {
  ChatItem,
  Language,
  ChatMessageData,
  GameOverData,
  GameState,
  GuessResultData,
  PlayerDTO,
  RoomJoinedData,
  RoomSettings,
  RoundEndData,
  RoundStartData,
  Stroke,
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
  roundEnd: RoundEndData | null;
  gameOver: GameOverData | null;
  chat: ChatItem[];
  canvasStrokes: Stroke[];
  autoStartIn: number | null;
  quickPlay: () => void;
  kickPlayer: (playerId: string) => void;
  banPlayer: (playerId: string) => void;
  voteKick: (playerId: string) => void;
  playAgain: () => void;
  sendGuess: (text: string) => void;
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
    language: (sessionStorage.getItem("selectedLanguage") || "English") as Language,
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
  const [roundEnd, setRoundEnd] = useState<RoundEndData | null>(null);
  const [gameOver, setGameOver] = useState<GameOverData | null>(null);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [canvasStrokes, setCanvasStrokes] = useState<Stroke[]>([]);
  const [autoStartIn, setAutoStartIn] = useState<number | null>(null);

  const addChat = useCallback((item: Omit<ChatItem, "id">) => {
    setChat((current) =>
      [...current, { ...item, id: `${Date.now()}-${Math.random()}` }].slice(-100)
    );
  }, []);

  // Room chhodne par saara room ka data saaf
  const resetRoom = useCallback(() => {
    setRoomId(null);
    setMeId(null);
    setPlayers([]);
    setSettings(null);
    setGameState(null);
    setRoundStart(null);
    setRoundEnd(null);
    setGameOver(null);
    setChat([]);
    setCanvasStrokes([]);
    setAutoStartIn(null);
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
      setRoundEnd(null);
      setGameOver(null);
      setChat([]);
      setCanvasStrokes([]);
      setAutoStartIn(null);
      setError(null);
    };
    const onPlayerList = (data: { players: PlayerDTO[] }) => setPlayers(data.players);
    const onSettings = (data: { settings: RoomSettings }) => setSettings(data.settings);
    const onRoomReset = (data: { players: PlayerDTO[]; settings: RoomSettings }) => {
      setPlayers(data.players);
      setSettings(data.settings);
      setGameState(null);
      setRoundStart(null);
      setRoundEnd(null);
      setGameOver(null);
      setChat([]);
      setCanvasStrokes([]);
    };
    const onGameState = (data: GameState) => setGameState(data);
    const onRoundStart = (data: RoundStartData) => {
      setRoundStart(data);
      setRoundEnd(null);
      setGameOver(null);
      setAutoStartIn(null);
      setCanvasStrokes([]);
      setPlayers((current) => current.map((p) => ({ ...p, hasGuessed: false })));
    };
    const onTimer = (data: { timeLeft: number }) =>
      setGameState((current) => (current ? { ...current, timeLeft: data.timeLeft } : current));
    const onHint = (data: { maskedWord: string }) =>
      setGameState((current) => (current ? { ...current, maskedWord: data.maskedWord } : current));
    const onRoundEnd = (data: RoundEndData) => {
      setRoundEnd(data);
      setPlayers(data.scores);
      addChat({ kind: "system", text: `The word was "${data.word}"` });
    };
    const onGameOver = (data: GameOverData) => {
      setGameOver(data);
      setRoundEnd(null);
    };
    const onGuessResult = (data: GuessResultData) => {
      if (data.correct) {
        setPlayers((current) =>
          current.map((p) => (p.id === data.playerId ? { ...p, hasGuessed: true } : p))
        );
        addChat({ kind: "correct", playerName: data.playerName, text: `${data.playerName} guessed the word! (+${data.points})` });
      } else if (data.close) {
        addChat({ kind: "close", text: "That was close!" });
      }
    };
    const onChatMessage = (data: ChatMessageData) =>
      addChat({ kind: "chat", playerName: data.playerName, text: data.text });
    const onCanvasState = (data: { strokes: Stroke[] }) => setCanvasStrokes(data.strokes ?? []);
    const onAutoStart = (data: { seconds: number }) => setAutoStartIn(data.seconds);
    const onError = (data: { message: string }) => setError(data.message);
    // Host ne kick/ban kiya: room se bahar, Home par reason dikhega
    const onKicked = (data: { message: string }) => {
      resetRoom();
      setError(data.message);
    };
    const onSystemMessage = (data: { text: string }) => addChat({ kind: "system", text: data.text });

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
    socket.on(SocketEvent.TIMER_TICK, onTimer);
    socket.on(SocketEvent.HINT_UPDATE, onHint);
    socket.on(SocketEvent.ROUND_END, onRoundEnd);
    socket.on(SocketEvent.GAME_OVER, onGameOver);
    socket.on(SocketEvent.GUESS_RESULT, onGuessResult);
    socket.on(SocketEvent.CHAT_MESSAGE, onChatMessage);
    socket.on(SocketEvent.CANVAS_STATE, onCanvasState);
    socket.on(SocketEvent.AUTO_START, onAutoStart);
    socket.on(SocketEvent.KICKED, onKicked);
    socket.on(SocketEvent.SYSTEM_MESSAGE, onSystemMessage);
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
      socket.off(SocketEvent.TIMER_TICK, onTimer);
      socket.off(SocketEvent.HINT_UPDATE, onHint);
      socket.off(SocketEvent.ROUND_END, onRoundEnd);
      socket.off(SocketEvent.GAME_OVER, onGameOver);
      socket.off(SocketEvent.GUESS_RESULT, onGuessResult);
      socket.off(SocketEvent.CHAT_MESSAGE, onChatMessage);
      socket.off(SocketEvent.CANVAS_STATE, onCanvasState);
      socket.off(SocketEvent.AUTO_START, onAutoStart);
      socket.off(SocketEvent.KICKED, onKicked);
      socket.off(SocketEvent.SYSTEM_MESSAGE, onSystemMessage);
      socket.off(SocketEvent.ERROR, onError);
    };
  }, [resetRoom, addChat]);

  // ---------- Actions (client -> server) ----------

  // Play button: random public room + random players (server dhoondhta hai ya banata hai)
  const quickPlay = useCallback(() => {
    const { name, avatar, language } = getIdentity();
    setError(null);
    socket.emit(SocketEvent.QUICK_PLAY, { playerName: name, avatar, language });
  }, []);

  const kickPlayer = useCallback((playerId: string) => {
    socket.emit(SocketEvent.KICK_PLAYER, { playerId });
  }, []);

  const banPlayer = useCallback((playerId: string) => {
    socket.emit(SocketEvent.BAN_PLAYER, { playerId });
  }, []);

  const voteKick = useCallback((playerId: string) => {
    socket.emit(SocketEvent.VOTE_KICK, { playerId });
  }, []);

  const playAgain = useCallback(() => {
    socket.emit(SocketEvent.PLAY_AGAIN);
  }, []);

  const sendGuess = useCallback((text: string) => {
    socket.emit(SocketEvent.GUESS, { text });
  }, []);

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
      roundEnd,
      gameOver,
      chat,
      canvasStrokes,
      autoStartIn,
      quickPlay,
      kickPlayer,
      banPlayer,
      voteKick,
      playAgain,
      sendGuess,
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
      roundEnd, gameOver, chat, canvasStrokes, autoStartIn, quickPlay, kickPlayer, banPlayer, voteKick, playAgain, sendGuess,
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