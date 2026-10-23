import { WORDS } from "../data/words.js";
const ALL_WORDS = Object.values(WORDS).flat();
// count jitne alag-alag random words deta hai.
// exclude mein jo words hain (pehle use ho chuke), wo nahi aayenge.
export function getRandomWords(count, exclude = new Set()) {
    let pool = ALL_WORDS.filter((w) => !exclude.has(w));
    if (pool.length < count)
        pool = [...ALL_WORDS]; // sab words use ho gaye to reset
    const result = [];
    while (result.length < count && pool.length > 0) {
        const index = Math.floor(Math.random() * pool.length);
        const [word] = pool.splice(index, 1); // pool se nikal diya, repeat nahi hoga
        if (word)
            result.push(word);
    }
    return result;
}
// "apple", revealed={1} -> "_ p _ _ _"
export function maskWord(word, revealed) {
    return word
        .split("")
        .map((letter, i) => (revealed.has(i) ? letter : "_"))
        .join(" ");
}
// Abhi tak na khule hue letters mein se ek random index deta hai
export function pickHintIndex(word, revealed) {
    const hidden = [];
    for (let i = 0; i < word.length; i++) {
        if (!revealed.has(i))
            hidden.push(i);
    }
    if (hidden.length === 0)
        return null;
    return hidden[Math.floor(Math.random() * hidden.length)] ?? null;
}
