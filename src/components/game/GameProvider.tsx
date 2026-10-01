"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { World } from "@/game/types";
import { migrateWorld } from "@/game/migrate";
import { accountApi, cloud, type Account, type SlotMeta } from "@/lib/cloud";
import { hasLegacyLocal, readLocal } from "@/lib/storage";

const MIN_VERSION = 3;
export type CloudStatus = "off" | "idle" | "saving" | "saved" | "error";
export type Overlay =
  | { kind: "player"; pid: string } | { kind: "weekResults" } | { kind: "prematch"; matchId: string }
  | { kind: "summary"; matchId: string } | { kind: "seasonEnd" } | { kind: "fired" }
  | { kind: "calendar" }
  | { kind: "signing"; pid: string; how: "transfer" | "free" | "loan" | "option"; fee: number; from: string | null } | null;
export type MatchMode = { kind: "live" | "button"; matchId: string } | null;

interface GameState {
  world: World | null;
  version: number;
  ready: boolean;
  account: Account | null;
  slots: SlotMeta[];
  activeSlot: number | null;
  auth: (action: "login" | "register", nickname: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  selectSlot: (slot: number) => Promise<void>;
  createSlot: (slot: number, world: World) => Promise<void>;
  importLegacy: (slot: number) => Promise<void>;
  importCode: (slot: number, code: string) => Promise<void>;
  refreshSlots: () => Promise<void>;
  mutate: (fn: (w: World) => void) => void;
  commit: () => void;
  setWorld: (w: World | null) => void;
  hasLocalSave: () => boolean;
  loadLocal: () => World | null;
  clearLocal: () => void;
  incompatibleSave: boolean;
  legacySaveAvailable: boolean;
  dismissIncompatible: () => void;
  overlay: Overlay;
  setOverlay: (o: Overlay) => void;
  matchMode: MatchMode;
  setMatchMode: (m: MatchMode) => void;
  scratch: Record<string, unknown>;
  cloudStatus: CloudStatus;
  cloudError: string | null;
  syncCloud: () => Promise<void>;
}

const Ctx = createContext<GameState | null>(null);
const LAST_ACTIVE = "scm.active.last";

function lastActive(): { accountId: string; slot: number } | null {
  try {
    const raw = localStorage.getItem(LAST_ACTIVE);
    if (!raw) return null;
    const value = JSON.parse(raw) as { accountId?: unknown; slot?: unknown };
    return typeof value.accountId === "string" && [1, 2, 3].includes(Number(value.slot))
      ? { accountId: value.accountId, slot: Number(value.slot) } : null;
  } catch { return null; }
}

function toWorld(data: unknown): World | null {
  try {
    const w = migrateWorld(data as World);
    return w && typeof w.version === "number" && w.version >= MIN_VERSION ? w : null;
  } catch { return null; }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const worldRef = useRef<World | null>(null);
  const slotRef = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const [world, setWorldState] = useState<World | null>(null);
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [slots, setSlots] = useState<SlotMeta[]>([]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [matchMode, setMatchMode] = useState<MatchMode>(null);
  const [scratch] = useState<Record<string, unknown>>(() => ({}));
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("off");
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [incompatibleSave, setIncompatible] = useState(false);
  const [legacySaveAvailable, setLegacySaveAvailable] = useState(false);

  const clearPending = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  const showWorld = useCallback((w: World | null, slot: number | null, accountId?: string) => {
    clearPending();
    worldRef.current = w;
    slotRef.current = slot;
    setWorldState(w);
    setActiveSlot(slot);
    setOverlay(null);
    setMatchMode(null);
    setVersion((v) => v + 1);
    setCloudStatus(slot ? "saved" : "off");
    setCloudError(null);
    if (accountId) localStorage.setItem(`scm.active.${accountId}`, slot ? String(slot) : "");
    if (accountId && slot) localStorage.setItem(LAST_ACTIVE, JSON.stringify({ accountId, slot }));
    else localStorage.removeItem(LAST_ACTIVE);
  }, []);

  const refreshSlots = useCallback(async () => { setSlots((await accountApi.slots()).slots); }, []);
  const queueSave = useCallback((slot: number, w: World) => {
    const snapshot = structuredClone(w);
    const next = saveQueue.current.catch(() => {}).then(async () => { await accountApi.save(slot, snapshot); });
    saveQueue.current = next;
    return next;
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const hint = lastActive();
        const { account: found, slots: listed, slot: fetchedSlot, data } = await accountApi.bootstrap(hint?.slot ?? null);
        if (!alive) return;
        setAccount(found);
        if (found) {
          setSlots(listed);
          const remembered = Number(localStorage.getItem(`scm.active.${found.id}`));
          if (listed.some((s) => s.slot === remembered)) {
            const saved = fetchedSlot === remembered ? data : (await accountApi.load(remembered)).data;
            const loaded = toWorld(saved);
            if (alive && loaded) showWorld(loaded, remembered, found.id);
          }
        }
      } catch (e) {
        if (alive) setCloudError((e as Error).message);
      } finally {
        if (alive) setReady(true);
        // O save antigo só interessa à tela de importação e não deve bloquear a entrada no jogo.
        void readLocal().then((legacy) => {
          if (!alive) return;
          const valid = legacy ? toWorld(legacy) : null;
          setLegacySaveAvailable(!!valid);
          setIncompatible((!!legacy && !valid) || hasLegacyLocal());
        });
      }
    })();
    return () => { alive = false; };
  }, [showWorld]);

  const syncCloud = useCallback(async () => {
    const w = worldRef.current, slot = slotRef.current;
    if (!w || !slot) return;
    setCloudStatus("saving");
    try {
      await queueSave(slot, w);
      setCloudStatus("saved");
      setCloudError(null);
      await refreshSlots();
    } catch (e) {
      setCloudStatus("error");
      setCloudError((e as Error).message);
    }
  }, [refreshSlots, queueSave]);

  const commit = useCallback(() => {
    setVersion((v) => v + 1);
    clearPending();
    timer.current = setTimeout(() => { void syncCloud(); }, 800);
  }, [syncCloud]);

  const mutate = useCallback((fn: (w: World) => void) => {
    if (!worldRef.current) return;
    fn(worldRef.current);
    commit();
  }, [commit]);

  const selectSlot = useCallback(async (slot: number) => {
    if (!account || !slots.some((s) => s.slot === slot)) throw new Error("Save não encontrado.");
    clearPending();
    if (worldRef.current && slotRef.current) await queueSave(slotRef.current, worldRef.current);
    else await saveQueue.current;
    const w = toWorld((await accountApi.load(slot)).data);
    if (!w) throw new Error("Este save é incompatível com a versão atual.");
    showWorld(w, slot, account.id);
  }, [account, slots, showWorld, queueSave]);

  const createSlot = useCallback(async (slot: number, w: World) => {
    if (!account || ![1, 2, 3].includes(slot)) throw new Error("Entre na conta e escolha um slot válido.");
    const valid = toWorld(w);
    if (!valid) throw new Error("Save inválido.");
    clearPending();
    if (worldRef.current && slotRef.current && slotRef.current !== slot) await queueSave(slotRef.current, worldRef.current);
    await queueSave(slot, valid);
    showWorld(valid, slot, account.id);
    await refreshSlots();
  }, [account, showWorld, refreshSlots, queueSave]);

  const importLegacy = useCallback(async (slot: number) => {
    const w = toWorld(await readLocal());
    if (!w) throw new Error("Nenhum save antigo compatível neste navegador.");
    await createSlot(slot, w);
  }, [createSlot]);

  const importCode = useCallback(async (slot: number, code: string) => {
    const w = toWorld((await cloud.load(code)).data);
    if (!w) throw new Error("Este código não contém uma carreira compatível.");
    await createSlot(slot, w);
  }, [createSlot]);

  const auth = useCallback(async (action: "login" | "register", nickname: string, password: string) => {
    const result = await accountApi.auth(action, nickname, password);
    showWorld(null, null);
    setAccount(result.account);
    setSlots((await accountApi.slots()).slots);
  }, [showWorld]);

  const logout = useCallback(async () => {
    clearPending();
    if (worldRef.current && slotRef.current) await queueSave(slotRef.current, worldRef.current);
    else await saveQueue.current;
    await accountApi.logout();
    showWorld(null, null);
    setSlots([]);
    setAccount(null);
  }, [showWorld, queueSave]);

  const value = useMemo<GameState>(() => ({
    world, version, ready, account, slots, activeSlot, auth, logout, selectSlot, createSlot, importLegacy, importCode, refreshSlots,
    mutate, commit, setWorld: (w) => showWorld(w ? toWorld(w) : null, slotRef.current, account?.id),
    hasLocalSave: () => !!worldRef.current, loadLocal: () => worldRef.current, clearLocal: () => showWorld(null, null, account?.id),
    incompatibleSave, legacySaveAvailable, dismissIncompatible: () => setIncompatible(false), overlay, setOverlay, matchMode, setMatchMode, scratch,
    cloudStatus, cloudError, syncCloud,
  }), [world, version, ready, account, slots, activeSlot, auth, logout, selectSlot, createSlot, importLegacy, importCode, refreshSlots,
    mutate, commit, showWorld, incompatibleSave, legacySaveAvailable, overlay, matchMode, scratch, cloudStatus, cloudError, syncCloud]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useGame precisa estar dentro de <GameProvider>.");
  return c;
}

export function useWorld(): GameState & { world: World } {
  const g = useGame();
  if (!g.world) throw new Error("Nenhuma carreira carregada.");
  return g as GameState & { world: World };
}
