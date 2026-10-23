
export function isCorrectGuess(guess: string, word: string): boolean {
  return guess.trim().toLowerCase() === word.trim().toLowerCase();
}

export function isCloseGuess(guess: string, word: string): boolean {
  const g = guess.trim().toLowerCase();
  const w = word.trim().toLowerCase();

  if (g.length !== w.length || g === w) return false;

  let differences = 0;
  for (let i = 0; i < w.length; i++) {
    if (g[i] !== w[i]) differences++;
    if (differences > 1) return false;
  }
  return differences === 1;
}