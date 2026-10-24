export const WordMode = {
  NORMAL: "NORMAL",
  HIDDEN: "HIDDEN",
  COMBINATION: "COMBINATION",
} as const;
export type WordMode = (typeof WordMode)[keyof typeof WordMode];