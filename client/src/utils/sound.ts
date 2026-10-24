// Chhote beep sounds (koi audio file nahi chahiye). volume: 0-100
type Kind = "correct" | "turn" | "over" | "tick";

const NOTES: Record<Kind, number[]> = {
  correct: [660, 880],
  turn: [523, 659],
  over: [523, 659, 784, 1046],
  tick: [440],
};

let ctx: AudioContext | null = null;

export function playSound(kind: Kind, volume: number): void {
  if (volume <= 0) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const start = ctx.currentTime;
    NOTES[kind].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      const t = start + i * 0.12;
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime((volume / 100) * 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  } catch {
    // browser audio allow nahi karta to chup raho
  }
}
