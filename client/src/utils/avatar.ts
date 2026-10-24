export const AVATAR_COLORS = [
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#f9ca24",
  "#a55eea",
  "#26de81",
  "#fd9644",
  "#fc5c65",
];

// Server avatar ko string ("0"-"7") mein rakhta hai, usse number banata hai
export function toAvatarIndex(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n < AVATAR_COLORS.length ? n : 0;
}