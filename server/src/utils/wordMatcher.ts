
// Case, extra spaces aur accents ignore (Spanish/French: "montaña" == "montana")
function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/œ/g, "oe")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isCorrectGuess(guess: string, word: string): boolean {
  return normalize(guess) === normalize(word);
}

export function isCloseGuess(guess: string, word: string): boolean {
  const g = normalize(guess);
  const w = normalize(word);

  if (g.length !== w.length || g === w) return false;

  let differences = 0;
  for (let i = 0; i < w.length; i++) {
    if (g[i] !== w[i]) differences++;
    if (differences > 1) return false;
  }
  return differences === 1;
}