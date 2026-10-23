import { WORDS } from "../data/words.js";

const ALL_WORDS: string[] = Object.values(WORDS).flat();


export function getRandomWords(count: number): string[] {
  const pool = [...ALL_WORDS];
  const result: string[] = [];

  while (result.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    const [word] = pool.splice(index, 1); 
    if (word) result.push(word);
  }
  return result;
}


export function maskWord(word: string, revealed: Set<number>): string {
  return word
    .split("")
    .map((letter, i) => (revealed.has(i) ? letter : "_"))
    .join(" ");
}

export function pickHintIndex(word: string, revealed: Set<number>): number | null {
  const hidden: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (!revealed.has(i)) hidden.push(i);
  }
  if (hidden.length === 0) return null;
  return hidden[Math.floor(Math.random() * hidden.length)] ?? null;
}