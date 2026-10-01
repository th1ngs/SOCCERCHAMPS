"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, LogIn, Plus, RefreshCw, Users } from "lucide-react";
import { ARCADE_LEAGUES, teamById, teamsOfLeague } from "@/arcade/teams";
import { LEAGUES } from "@/game";
import type { LeagueId } from "@/game/types";
import { mpApi, type MpOpenRoom, type MpRoom } from "@/lib/mp";
import { useGame } from "@/components/game/GameProvider";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Card, EmptyState } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { OnlineMatch } from "./OnlineMatch";

const TURNS = [20, 30, 40] as const;
const field = "h-11 w-full rounded-xl bg-ink-950/70 px-3 text-snow ring-1 ring-inset ring-white/12 focus:outline-2 focus:outline-gold-400";

/** Lobby do multiplayer 1x1: escolher time, criar sala, entrar por código ou pela lista. */
export function MpLobby() {
  const { account, ready } = useGame();
  const toast = useToast();
  const [league, setLeague] = useState<LeagueId>("bra");
  const [team, setTeam] = useState<string>(() => teamsOfLeague("bra")[0]?.id ?? "");
  const [turns, setTurns] = useState<(typeof TURNS)[number]>(30);
  const [code, setCode] = useState("");
  const [open, setOpen] = useState<MpOpenRoom[]>([]);
  const [room, setRoom] = useState<MpRoom | null>(null);
  const [busy, setBusy] = useState(false);
  const teams = useMemo(() => teamsOfLeague(league), [league]);
  const picked = teamById(team);

  const refresh = useCallback(async () => {
    try {
      const r = await mpApi.list();
      setOpen(r.open);
      return r.mine;
    } catch { return null; }
  }, []);

  // Retoma a sala ativa (recarregou a página no meio do jogo) e atualiza a lista de salas.
  useEffect(() => {
    if (!account) return;
    let alive = true;
    void (async () => {
      const mine = await refresh();
      if (alive && mine) {
        const r = await mpApi.room(mine.code).catch(() => null);
        if (alive && r) setRoom(r.room);
      }
    })();
    const t = setInterval(() => void refresh(), 4000);
    return () => { alive = false; clearInterval(t); };
  }, [account, refresh]);

  // Esperando adversário: consulta até alguém entrar.
  useEffect(() => {
    if (!room || room.status !== "waiting") return;
    const t = setInterval(async () => {
      const r = await mpApi.room(room.code).catch(() => null);
      if (r) setRoom(r.room);
    }, 1500);
    return () => clearInterval(t);
  }, [room]);

  const run = async (fn: () => Promise<{ room: MpRoom }>) => {
    setBusy(true);
    try { setRoom((await fn()).room); } catch (e) { toast((e as Error).message, "bad"); } finally { setBusy(false); }
  };

  if (ready && !account) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-4xl font-extrabold uppercase italic">Multiplayer 1x1</h1>
        <p className="mt-2 text-mist">Entre na sua conta para jogar online contra outros técnicos.</p>
        <Link href="/" className={buttonClasses("primary", "lg", false, "mt-5")}>Entrar</Link>
      </div>
    );
  }

  if (room && room.status === "playing" && room.guest) return <OnlineMatch key={room.code} room={room} onExit={() => { setRoom(null); void refresh(); }} />;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-6 sm:pt-10">
      <Link href="/" className={buttonClasses("ghost", "sm")}><ArrowLeft /> Início</Link>
      <h1 className="mt-4 font-display text-5xl font-extrabold uppercase italic leading-none">Multiplayer 1x1</h1>
      <p className="mt-2 max-w-prose text-sm text-mist">
        Futebol de botão online, 11 contra 11, por turnos. Crie uma sala e passe o código para um amigo, ou entre numa sala aberta.
      </p>

      {room && room.status === "waiting" ? (
        <Card className="mt-6 text-center" tone="highlight">
          <p className="text-sm text-mist">Sala criada. Passe o código para o seu adversário:</p>
          <p className="mt-2 font-display text-6xl font-extrabold tracking-[0.2em] text-gold-400">{room.code}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" size="sm" icon={<Copy />} onClick={() => { void navigator.clipboard?.writeText(room.code); toast("Código copiado."); }}>Copiar código</Button>
            <Button variant="ghost" size="sm" onClick={async () => { await mpApi.leave(room.code).catch(() => {}); setRoom(null); }}>Cancelar sala</Button>
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-mist"><RefreshCw className="size-4 animate-spin" /> Esperando adversário… ({room.turns} jogadas)</p>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card title="Seu time">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-mist">Liga</span>
                <select className={field} value={league} onChange={(e) => { const l = e.target.value as LeagueId; setLeague(l); setTeam(teamsOfLeague(l)[0]?.id ?? ""); }}>
                  {ARCADE_LEAGUES.map((l) => <option key={l} value={l}>{LEAGUES[l].name}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-mist">Time</span>
                <select className={field} value={team} onChange={(e) => setTeam(e.target.value)}>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
            </div>
            {picked && <p className="mt-3 flex items-center gap-2 font-display text-lg font-bold uppercase"><Crest club={picked.club} size={32} /> {picked.name}</p>}

            <span className="mb-1.5 mt-5 block text-xs font-bold uppercase tracking-wider text-mist">Jogadas por partida</span>
            <Segmented ariaLabel="Jogadas por partida" size="sm" value={String(turns)} onChange={(v) => setTurns(Number(v) as (typeof TURNS)[number])} options={TURNS.map((t) => ({ value: String(t), label: `${t} (${t / 2} cada)` }))} />
            <Button variant="primary" size="lg" block icon={<Plus />} className="mt-4" loading={busy} disabled={!team} onClick={() => run(() => mpApi.create(team, turns))}>Criar sala</Button>

            <div className="mt-5 border-t border-white/8 pt-4">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mist">Tenho um código</span>
              <div className="flex gap-2">
                <input className={`${field} font-display text-lg uppercase tracking-[0.2em]`} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 5))} placeholder="ABCDE" aria-label="Código da sala" />
                <Button variant="secondary" icon={<LogIn />} loading={busy} disabled={code.length !== 5 || !team} onClick={() => run(() => mpApi.join(code, team))}>Entrar</Button>
              </div>
            </div>
          </Card>

          <Card title={<span className="flex items-center gap-2"><Users className="size-4" /> Salas abertas</span>} action={<Button variant="ghost" size="sm" icon={<RefreshCw />} onClick={() => void refresh()}>Atualizar</Button>}>
            {open.length ? (
              <ul className="space-y-1.5">
                {open.map((r) => {
                  const t = teamById(r.team);
                  return (
                    <li key={r.code} className="flex items-center gap-3 rounded-xl bg-ink-900/55 px-3 py-2 ring-1 ring-inset ring-white/6">
                      {t && <Crest club={t.club} size={28} />}
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-sm font-semibold">{r.host}</span>
                        <span className="block truncate text-xs text-mist">{t?.name ?? "?"} • {r.turns} jogadas</span>
                      </span>
                      <Button variant="primary" size="sm" disabled={busy || !team} onClick={() => run(() => mpApi.join(r.code, team))}>Jogar</Button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState>Nenhuma sala aberta agora. Crie a sua e chame um amigo.</EmptyState>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
