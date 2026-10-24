import { WORD_LISTS } from "../data/wordLists.js";
import type { Language } from "../types/index.js";

// Har language ki saari words ek flat list mein
const ALL_WORDS: Record<Language, string[]> = {
  English: Object.values(WORD_LISTS.English).flat(),
  Hindi: Object.values(WORD_LISTS.Hindi).flat(),
  Spanish: Object.values(WORD_LISTS.Spanish).flat(),
  French: Object.values(WORD_LISTS.French).flat(),
};

// count jitne alag-alag random words deta hai.
// exclude mein jo words hain (pehle use ho chuke), wo nahi aayenge.
export function getRandomWords(count: number, exclude: Set<string> = new Set(), language: Language = "English"): string[] {
  const all = ALL_WORDS[language] ?? ALL_WORDS.English;
  let pool = all.filter((w) => !exclude.has(w));
  if (pool.length < count) pool = [...all]; // sab words use ho gaye to reset

  const result: string[] = [];

  while (result.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    const [word] = pool.splice(index, 1); // pool se nikal diya, repeat nahi hoga
    if (word) result.push(word);
  }
  return result;
}

// "apple", revealed={1} -> "_ p _ _ _"
export function maskWord(word: string, revealed: Set<number>): string {
  return word
    .split("")
    .map((letter, i) => (revealed.has(i) ? letter : "_"))
    .join(" ");
}

// Abhi tak na khule hue letters mein se ek random index deta hai
export function pickHintIndex(word: string, revealed: Set<number>): number | null {
  const hidden: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (!revealed.has(i)) hidden.push(i);
  }
  if (hidden.length === 0) return null;
  return hidden[Math.floor(Math.random() * hidden.length)] ?? null;
}