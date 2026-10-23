import { ROOM_CODE_LENGTH } from "../config.js";
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateRoomCode() {
    let code = "";
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return code;
}
