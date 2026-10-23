export const WordMode = {
  NORMAL: "normal",
  HIDDEN: "hidden",
  COMBINATION: "combination",
} as const;
export type WordMode = (typeof WordMode)[keyof typeof WordMode];
