import { RoomManager } from "../classes/RoomManager.js";
import { SocketEvent } from "../enums/SocketEvent.js";
// Client par bharosa nahi: har value server par saaf hoti hai
function toCoord(value) {
    const n = Number(value);
    if (!Number.isFinite(n))
        return null;
    return Math.min(1, Math.max(0, n)); // 0 se 1 ke andar
}
function toColor(value) {
    return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
}
function toSize(value) {
    const n = Number(value);
    if (!Number.isFinite(n))
        return 4;
    return Math.min(40, Math.max(1, Math.round(n)));
}
export function registerDrawHandlers(_io, socket, rooms) {
    // Game tabhi milega jab ye player drawer ho aur DRAWING phase ho
    const getDrawingGame = () => {
        const room = rooms.getRoomByPlayer(socket.id);
        if (!room?.game || !room.game.canDraw(socket.id))
            return null;
        return { room, game: room.game };
    };
    socket.on(SocketEvent.DRAW_START, (data) => {
        const ctx = getDrawingGame();
        const x = toCoord(data?.x);
        const y = toCoord(data?.y);
        if (!ctx || x === null || y === null)
            return;
        const color = toColor(data.color);
        const size = toSize(data.size);
        ctx.game.beginStroke({ x, y }, color, size);
        socket.to(ctx.room.id).emit(SocketEvent.DRAW_DATA, { type: "start", x, y, color, size });
    });
    socket.on(SocketEvent.DRAW_MOVE, (data) => {
        const ctx = getDrawingGame();
        const x = toCoord(data?.x);
        const y = toCoord(data?.y);
        if (!ctx || x === null || y === null)
            return;
        if (!ctx.game.addPoint({ x, y }))
            return; // stroke nahi chal rahi ya limit puri
        socket.to(ctx.room.id).emit(SocketEvent.DRAW_DATA, { type: "move", x, y });
    });
    socket.on(SocketEvent.DRAW_END, () => {
        const ctx = getDrawingGame();
        if (!ctx)
            return;
        ctx.game.endStroke();
        socket.to(ctx.room.id).emit(SocketEvent.DRAW_DATA, { type: "end" });
    });
    socket.on(SocketEvent.DRAW_UNDO, () => {
        const ctx = getDrawingGame();
        if (!ctx)
            return;
        if (ctx.game.undoStroke()) {
            socket.to(ctx.room.id).emit(SocketEvent.DRAW_UNDO);
        }
    });
    // TODO (khud likho): CANVAS_CLEAR handler
    socket.on(SocketEvent.CANVAS_CLEAR, () => {
        const ctx = getDrawingGame();
        if (!ctx)
            return;
        ctx.game.clearCanvas();
        socket.to(ctx.room.id).emit(SocketEvent.CANVAS_CLEAR);
    });
}
