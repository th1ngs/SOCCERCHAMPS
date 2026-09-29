"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { World } from "@/game/types";
import { migrateWorld } from "@/game";
import { cloud } from "@/lib/cloud";
import { clearLegacyLocal, clearLocal, hasLegacyLocal, hasLocal, readLocal, writeLocal } from "@/lib/storage";

const CLOUD_KEY = "scm.cloud.code";
/** Versão mínima do save compatível com as ligas atuais. */
const MIN_VERSION = 3;

export type CloudStatus = "off" | "idle" | "saving" | "saved" | "error";

/** Diálogos globais do jogo (abertos de qualquer tela). */
export type Overlay =
  | { kind: "player"; pid: string }
  | { kind: "weekResults" }
  | { kind: "prematch"; matchId: string }
  | { kind: "summary"; matchId: string }
  | { kind: "seasonEnd" }
  | { kind: "fired" }
  | null;

export type MatchMode = { kind: "live" | "button"; matchId: string } | null;

interface GameState {
  world: World | null;
  /** Incrementa a cada mutação: use em deps de useMemo. */
  version: number;
  ready: boolean;
  /** Aplica uma mutação no mundo, re-renderiza e agenda o salvamento. */
  mutate: (fn: (w: World) => void) => void;
  /** Re-renderiza e salva após mutações feitas diretamente no objeto. */
  commit: () => void;
  setWorld: (w: World | null) => void;
  hasLocalSave: () => boolean;
  loadLocal: () => World | null;
  clearLocal: () => void;
  /** Havia uma carreira de versão antiga (incompatível) neste aparelho. */
  incompatibleSave: boolean;
  dismissIncompatible: () => void;

  overlay: Overlay;
  setOverlay: (o: Overlay) => void;
  matchMode: MatchMode;
  setMatchMode: (m: MatchMode) => void;
  /** Resultado pendente (ex.: sumário após jogo) guardado fora do World. */
  scratch: Record<string, unknown>;

  cloudCode: string | null;
  cloudStatus: CloudStatus;
  cloudError: string | null;
  enableCloud: () => Promise<string | null>;
  syncCloud: () => Promise<void>;
  loadFromCloud: (code: string) => Promise<void>;
  disconnectCloud: () => void;
}

const Ctx = createContext<GameState | null>(null);

/** Converte dados salvos em um World atual, ou null se forem de uma versão incompatível. */
function toWorld(data: unknown): World | null {
  try {
    const w = migrateWorld(data as World);
    return w && typeof w.version === "number" && w.version >= MIN_VERSION ? w : null;
  } catch {
    return null;
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const worldRef = useRef<World | null>(null);
  const [world, setWorldState] = useState<World | null>(null);
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [matchMode, setMatchMode] = useState<MatchMode>(null);
  const [cloudCode, setCloudCode] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("off");
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [incompatibleSave, setIncompatible] = useState(false);
  const [scratch] = useState<Record<string, unknown>>(() => ({}));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const raw = await readLocal();
      if (!alive) return;
      const w = raw ? toWorld(raw) : null;
      worldRef.current = w;
      setWorldState(w);
      setIncompatible((!!raw && !w) || hasLegacyLocal());
      try {
        codeRef.current = w ? localStorage.getItem(CLOUD_KEY) : null;
      } catch {
        codeRef.current = null;
      }
      setCloudCode(codeRef.current);
      setCloudStatus(codeRef.current ? "idle" : "off");
      setReady(true);
      setVersion((v) => v + 1);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const pushCloud = useCallback(async () => {
    const w = worldRef.current, code = codeRef.current;
    if (!w || !code) return;
    setCloudStatus("saving");
    try {
      await cloud.update(code, w);
      setCloudStatus("saved");
      setCloudError(null);
    } catch (e) {
      setCloudStatus("error");
      setCloudError((e as Error).message);
    }
  }, []);

  const persist = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const w = worldRef.current;
      if (!w) return;
      void writeLocal(w);
      if (codeRef.current) {
        if (cloudTimer.current) clearTimeout(cloudTimer.current);
        cloudTimer.current = setTimeout(pushCloud, 2500);
      }
    }, 300);
  }, [pushCloud]);

  const commit = useCallback(() => {
    setVersion((v) => v + 1);
    persist();
  }, [persist]);

  const mutate = useCallback(
    (fn: (w: World) => void) => {
      const w = worldRef.current;
      if (!w) return;
      fn(w);
      commit();
    },
    [commit],
  );

  const setWorld = useCallback(
    (w: World | null) => {
      worldRef.current = w ? toWorld(w) : null;
      setWorldState(worldRef.current);
      setOverlay(null);
      setMatchMode(null);
      commit();
    },
    [commit],
  );

  const enableCloud = useCallback(async () => {
    const w = worldRef.current;
    if (!w) return null;
    setCloudStatus("saving");
    try {
      const r = await cloud.create(w);
      codeRef.current = r.code;
      localStorage.setItem(CLOUD_KEY, r.code);
      setCloudCode(r.code);
      setCloudStatus("saved");
      setCloudError(null);
      return r.code;
    } catch (e) {
      setCloudStatus("error");
      setCloudError((e as Error).message);
      return null;
    }
  }, []);

  const loadFromCloud = useCallback(
    async (code: string) => {
      const norm = code.trim().toUpperCase();
      const r = await cloud.load(norm);
      const w = toWorld(r.data);
      if (!w) throw new Error("Esta carreira é de uma versão antiga do jogo e não pode mais ser carregada.");
      codeRef.current = norm;
      try {
        localStorage.setItem(CLOUD_KEY, norm);
      } catch {
        /* sem armazenamento */
      }
      setCloudCode(norm);
      setCloudStatus("saved");
      setWorld(w);
    },
    [setWorld],
  );

  const disconnectCloud = useCallback(() => {
    codeRef.current = null;
    try {
      localStorage.removeItem(CLOUD_KEY);
    } catch {
      /* sem armazenamento */
    }
    setCloudCode(null);
    setCloudStatus("off");
  }, []);

  const value = useMemo<GameState>(
    () => ({
      world,
      version,
      ready,
      mutate,
      commit,
      setWorld,
      hasLocalSave: hasLocal,
      loadLocal: () => worldRef.current,
      clearLocal,
      incompatibleSave,
      dismissIncompatible: () => {
        clearLegacyLocal();
        setIncompatible(false);
      },
      overlay,
      setOverlay,
      matchMode,
      setMatchMode,
      scratch,
      cloudCode,
      cloudStatus,
      cloudError,
      enableCloud,
      syncCloud: pushCloud,
      loadFromCloud,
      disconnectCloud,
    }),
    // version muda a cada mutação no mesmo objeto world.
    [world, version, ready, mutate, commit, setWorld, incompatibleSave, overlay, matchMode, scratch, cloudCode, cloudStatus, cloudError, enableCloud, pushCloud, loadFromCloud, disconnectCloud],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useGame precisa estar dentro de <GameProvider>.");
  return c;
}

/** Atalho para telas dentro do jogo: garante que há um mundo carregado. */
export function useWorld(): GameState & { world: World } {
  const g = useGame();
  if (!g.world) throw new Error("Nenhuma carreira carregada.");
  return g as GameState & { world: World };
}
