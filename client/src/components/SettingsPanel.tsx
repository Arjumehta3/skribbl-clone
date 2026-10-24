import type { Dispatch, ReactNode, SetStateAction } from "react";
import { DEFAULT_HOTKEYS } from "../utils/settings";
import type { GamePrefs, Hotkeys } from "../utils/settings";
import { playSound } from "../utils/sound";

interface Props {
  prefs: GamePrefs;
  setPrefs: Dispatch<SetStateAction<GamePrefs>>;
  onClose: () => void;
  children?: ReactNode; // extra buttons (jaise Clear drawing)
}

// Lobby aur Game dono mein ek hi settings panel
export default function SettingsPanel({ prefs, setPrefs, onClose, children }: Props) {
  const setHotkey = (name: keyof Hotkeys, key: string) => {
    if (key.length !== 1) return;
    setPrefs((c) => ({ ...c, hotkeys: { ...c.hotkeys, [name]: key.toLowerCase() } }));
  };

  return (
    <div className="game-settings-panel wide-settings">
      <div className="settings-panel-header">
        <strong>Settings</strong>
        <button onClick={onClose} aria-label="Close settings">×</button>
      </div>

      <h3 className="settings-title">🔊 Volume {prefs.volume}%</h3>
      <input
        className="volume-slider"
        id="setting-volume"
        name="volume"
        type="range"
        min="0"
        max="100"
        value={prefs.volume}
        aria-label="Volume"
        onChange={(e) => setPrefs((c) => ({ ...c, volume: Number(e.target.value) }))}
        onPointerUp={() => playSound("correct", prefs.volume)}
      />

      <div className="settings-title-row">
        <h3 className="settings-title">⌨️ Hotkeys</h3>
        <button className="reset-hotkeys" onClick={() => setPrefs((c) => ({ ...c, hotkeys: DEFAULT_HOTKEYS }))}>
          Reset
        </button>
      </div>
      <div className="hotkey-grid">
        {(["brush", "undo", "clear", "swap"] as const).map((name) => (
          <label key={name}>
            <span>{name[0]!.toUpperCase() + name.slice(1)}</span>
            <input
              readOnly
              id={`hotkey-${name}`}
              name={`hotkey-${name}`}
              value={prefs.hotkeys[name].toUpperCase()}
              aria-label={`${name} hotkey`}
              onKeyDown={(e) => {
                e.preventDefault();
                setHotkey(name, e.key);
              }}
            />
          </label>
        ))}
      </div>
      <p className="settings-note">Box me click karke nayi key dabao. Hotkeys sirf drawer ke turn me chalte hain.</p>

      <h3 className="settings-title">❓ Miscellaneous</h3>
      <label className="settings-select">
        Chat input position
        <select
          id="setting-chat-position"
          name="chatPosition"
          value={prefs.chatTop ? "top" : "bottom"}
          onChange={(e) => setPrefs((c) => ({ ...c, chatTop: e.target.value === "top" }))}
        >
          <option value="bottom">Bottom</option>
          <option value="top">Top</option>
        </select>
      </label>
      <label className="settings-select">
        Chat bubbles (messages on drawing board)
        <select
          id="setting-chat-bubbles"
          name="chatBubbles"
          value={prefs.bubbles ? "on" : "off"}
          onChange={(e) => setPrefs((c) => ({ ...c, bubbles: e.target.value === "on" }))}
        >
          <option value="on">Enabled</option>
          <option value="off">Disabled</option>
        </select>
      </label>

      {children}
    </div>
  );
}
