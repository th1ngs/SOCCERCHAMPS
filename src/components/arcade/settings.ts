// Preferências do arcade de lances (por aparelho).
import type { CupScope } from "@/arcade/cup";
import { ARCADE_LEAGUES } from "@/arcade/teams";
import type { LeagueId } from "@/game/types";
import { BOT_LEVELS, type BotSetting } from "@/lances/difficulty";

export interface ArcadeSettings {
  bot: BotSetting;
  /** Lances de ataque por partida. */
  chances: number;
  sound: boolean;
  /** Liga aberta na seleção de times. */
  league: LeagueId;
  /** Sorteio da Copa arcade. */
  cupScope: CupScope;
}

const KEY = "scm.arcade.lances";
export const CHANCE_OPTIONS = [5, 7, 9];
export const DEFAULT_SETTINGS: ArcadeSettings = { bot: "auto", chances: 5, sound: true, league: "bra", cupScope: "mixed" };

export function loadSettings(): ArcadeSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null") as Partial<ArcadeSettings> | null;
    const s = { ...DEFAULT_SETTINGS, ...(raw || {}) };
    if (s.bot !== "auto" && !BOT_LEVELS.includes(s.bot)) s.bot = DEFAULT_SETTINGS.bot;
    if (!CHANCE_OPTIONS.includes(s.chances)) s.chances = DEFAULT_SETTINGS.chances;
    s.sound = s.sound !== false;
    if (!ARCADE_LEAGUES.includes(s.league)) s.league = DEFAULT_SETTINGS.league;
    if (s.cupScope !== "mixed" && s.cupScope !== "league") s.cupScope = DEFAULT_SETTINGS.cupScope;
    return s;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: ArcadeSettings): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sem armazenamento */ }
}
