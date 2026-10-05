// Save local da carreira: JSON compactado com gzip + base64 no localStorage.
import type { World } from "@/game/types";
import { packWorld } from "@/game/pack";
import { canCompress, fromBase64, gunzip, gzip, toBase64 } from "./compress";

const KEY = "scm.save.v3";
/** Saves de versões anteriores, que não são compatíveis com as ligas atuais. */
const LEGACY_KEYS = ["scm.save.v2"];
const GZ = "gz:";

export async function writeLocal(w: World): Promise<boolean> {
  try {
    const json = JSON.stringify(packWorld(w));
    const value = canCompress() ? GZ + toBase64(await gzip(json)) : json;
    localStorage.setItem(KEY, value);
    return true;
  } catch {
    return false; // armazenamento cheio ou bloqueado: a nuvem continua valendo
  }
}

export async function readLocal(): Promise<unknown | null> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw.startsWith(GZ) ? await gunzip(fromBase64(raw.slice(GZ.length))) : raw);
  } catch {
    return null;
  }
}

export function hasLegacyLocal(): boolean {
  try {
    return LEGACY_KEYS.some((k) => localStorage.getItem(k) !== null);
  } catch {
    return false;
  }
}

export function clearLegacyLocal() {
  try {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* sem armazenamento */
  }
}

export function hasLocal(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function clearLocal() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* sem armazenamento */
  }
}
