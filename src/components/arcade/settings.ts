// Preferências do modo arcade (por aparelho).
import type { Level } from "@/arcade/ai";
import type { CupScope } from "@/arcade/cup";
import { ARCADE_LEAGUES } from "@/arcade/teams";
import type { LeagueId } from "@/game/types";

export interface ArcadeSettings {
  difficulty: Level;
  /** Duração da partida em segundos. */
  duration: number;
  sound: boolean;
  /** Liga aberta na seleção de times. */
  league: LeagueId;
  /** Sorteio da Copa arcade. */
  cupScope: CupScope;
}

const KEY = "scm.arcade.settings";
export const DEFAULT_SETTINGS: ArcadeSettings = { difficulty: "medium", duration: 180, sound: true, league: "bra", cupScope: "mixed" };
export const LEVEL_ORDER: Level[] = ["easy", "medium", "hard"];
export const DURATIONS = [120, 180, 300];

export function loadSettings(): ArcadeSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null") as Partial<ArcadeSettings> | null;
    const s = { ...DEFAULT_SETTINGS, ...(raw || {}) };
    if (!LEVEL_ORDER.includes(s.difficulty)) s.difficulty = DEFAULT_SETTINGS.difficulty;
    if (!DURATIONS.includes(s.duration)) s.duration = DEFAULT_SETTINGS.duration;
    s.sound = s.sound !== false;
    if (!ARCADE_LEAGUES.includes(s.league)) s.league = DEFAULT_SETTINGS.league;
    if (s.cupScope !== "mixed" && s.cupScope !== "league") s.cupScope = DEFAULT_SETTINGS.cupScope;
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
