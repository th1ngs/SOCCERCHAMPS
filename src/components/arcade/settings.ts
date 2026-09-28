// Preferências do modo arcade (por aparelho).
import type { Level } from "@/arcade/ai";

export interface ArcadeSettings {
  difficulty: Level;
  /** Duração da partida em segundos. */
  duration: number;
  sound: boolean;
}

const KEY = "scm.arcade.settings";
export const DEFAULT_SETTINGS: ArcadeSettings = { difficulty: "medium", duration: 180, sound: true };
export const LEVEL_ORDER: Level[] = ["easy", "medium", "hard"];
export const DURATIONS = [120, 180, 300];

export function loadSettings(): ArcadeSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null") as Partial<ArcadeSettings> | null;
    const s = { ...DEFAULT_SETTINGS, ...(raw || {}) };
    if (!LEVEL_ORDER.includes(s.difficulty)) s.difficulty = DEFAULT_SETTINGS.difficulty;
    if (!DURATIONS.includes(s.duration)) s.duration = DEFAULT_SETTINGS.duration;
    s.sound = s.sound !== false;
    return s;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: ArcadeSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sem armazenamento */
  }
}
