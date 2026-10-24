import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { loadPrefs, savePrefs } from "./settings";
import type { GamePrefs } from "./settings";

// Settings state + browser mein auto-save. Lobby aur Game dono isi ko use karte hain.
export function usePrefs(): [GamePrefs, Dispatch<SetStateAction<GamePrefs>>] {
  const [prefs, setPrefs] = useState<GamePrefs>(loadPrefs);
  useEffect(() => savePrefs(prefs), [prefs]);
  return [prefs, setPrefs];
}
