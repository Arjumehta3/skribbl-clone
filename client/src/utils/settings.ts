// Player ki game settings (is browser mein save rehti hain)
export interface Hotkeys {
  brush: string;
  undo: string;
  clear: string;
  swap: string;
}

export interface GamePrefs {
  volume: number; // 0-100
  hotkeys: Hotkeys;
  chatTop: boolean; // chat input upar ya neeche
  bubbles: boolean; // chat messages canvas par bubble mein
}

export const DEFAULT_HOTKEYS: Hotkeys = { brush: "b", undo: "u", clear: "c", swap: "s" };

export const DEFAULT_PREFS: GamePrefs = {
  volume: 100,
  hotkeys: DEFAULT_HOTKEYS,
  chatTop: false,
  bubbles: true,
};

const KEY = "skribblPrefs";

export function loadPrefs(): GamePrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<GamePrefs>;
    return {
      volume: typeof raw.volume === "number" ? Math.min(100, Math.max(0, raw.volume)) : DEFAULT_PREFS.volume,
      hotkeys: { ...DEFAULT_HOTKEYS, ...(raw.hotkeys ?? {}) },
      chatTop: raw.chatTop === true,
      bubbles: raw.bubbles !== false,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: GamePrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // storage band ho to bas save nahi hoga
  }
}
