"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Gamepad2, MapPin, Play, SlidersHorizontal, Star, Ticket, TriangleAlert, Users, Zap } from "lucide-react";
import { FORMATIONS, Sim, TACTICS, autoLineup, ensureLineup, expectedGate, formatMoney, isDerby, sectors } from "@/game";
import type { Club, World } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Alert, Badge, OvrBadge, PosBadge, SectionTitle } from "@/components/ui/primitives";
import { StatBar } from "./StatBars";
import { compName, findMatch, settleMatch, simOptions, venueName } from "./matchUtils";

function LineupList({ w, club }: { w: World; club: Club }) {
  const slots = FORMATIONS[club.formation];
  return (
    <ul className="divide-y divide-white/6">
      {club.lineup.map((id, i) => {
        const p = id ? w.players[id] : undefined;
        return (
          <li key={id ?? `vaga-${i}`} className="flex min-h-9 items-center gap-2 py-1 text-sm">
            <PosBadge pos={slots[i].pos} />
            <span className="min-w-0 flex-1 truncate">{p ? p.name : <em className="text-mist">Vaga aberta</em>}</span>
            {p?.star && <Star className="size-3.5 shrink-0 fill-gold-400 text-gold-400" aria-label="Craque" />}
            {p && club.captain === p.id && (
              <Badge tone="gold" title="Capitão">
                C
              </Badge>
            )}
            {p && <OvrBadge value={p.ovr} size="sm" />}
          </li>
        );
      })}
    </ul>
  );
}

/** Pré-jogo: confronto, setores, escalações e escolha de como jogar a partida. */
export function PrematchModal({ matchId }: { matchId: string }) {
  const g = useWorld();
  const { world: w, version, commit, setOverlay, setMatchMode, scratch } = g;
  const router = useRouter();
  const [m] = useState(() => findMatch(w, matchId));

  // Como no legado: ao abrir, corrige a escalação do usuário e escala o adversário.
  const [changes] = useState<string[]>(() => {
    if (!m) return [];
    const uid = w.userClub;
    const ch = ensureLineup(w, w.clubs[uid]);
    autoLineup(w, w.clubs[m.h === uid ? m.a : m.h]);
    return ch;
  });
  useEffect(() => {
    // Persiste os ajustes automáticos feitos acima.
    if (m) commit();
    // Só na abertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const info = useMemo(() => {
    if (!m) return null;
    void version;
    const u = w.clubs[w.userClub];
    const opp = w.clubs[m.h === u.id ? m.a : m.h];
    const home = m.h === u.id;
    return {
      u, opp, home,
      su: sectors(w, u),
      so: sectors(w, opp),
      derby: isDerby(w, m),
      gate: home && !m.neutral ? expectedGate(w, m) : null,
      comp: compName(w, m),
      venue: venueName(w, m),
    };
  }, [w, m, version]);

  const close = () => setOverlay(null);

  if (!m || !info) {
    return (
      <Modal open onClose={close} title="Jogo não encontrado" footer={<Button onClick={close}>Voltar</Button>}>
        <p className="text-sm text-mist">Esta partida não está na rodada atual.</p>
      </Modal>
    );
  }

  const { u, opp, su, so, derby, gate } = info;
  const hc = w.clubs[m.h], ac = w.clubs[m.a];

  const quick = () => {
    const sim = new Sim(w, m.h, m.a, simOptions(m)).runToEnd();
    settleMatch(w, m, sim.result(), scratch);
    commit();
    setOverlay({ kind: "summary", matchId });
  };
  const live = () => {
    setOverlay(null);
    setMatchMode({ kind: "live", matchId });
  };
  const button = () => {
    setOverlay(null);
    setMatchMode({ kind: "button", matchId });
  };
  const adjust = () => {
    setOverlay(null);
    router.push("/jogo/escalacao");
  };

  const sectorRows: [string, number, number][] = [
    ["Goleiro", su.G, so.G],
    ["Defesa", su.D, so.D],
    ["Meio", su.M, so.M],
    ["Ataque", su.A, so.A],
  ];

  return (
    <Modal
      open
      onClose={close}
      size="lg"
      title="Dia de jogo"
      footer={
        <>
          <Button variant="ghost" icon={<SlidersHorizontal />} onClick={adjust} className="max-sm:flex-1">
            Ajustar escalação
          </Button>
          <Button variant="secondary" icon={<Gamepad2 />} onClick={button} className="max-sm:flex-1">
            Jogar no botão
          </Button>
          <Button variant="secondary" icon={<Zap />} onClick={quick} className="max-sm:flex-1">
            Resultado rápido
          </Button>
          <Button variant="primary" icon={<Play />} onClick={live} className="max-sm:w-full" data-autofocus>
            Assistir ao vivo
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Confronto */}
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-b from-ink-700/80 to-ink-800 px-3 py-4 ring-1 ring-inset ring-white/8">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="flex min-w-0 flex-col items-center gap-2 text-center">
              <Crest club={hc} size={52} />
              <b className="line-clamp-2 font-display text-lg font-bold uppercase leading-tight">{hc.name}</b>
            </div>
            <div className="flex flex-col items-center gap-1 px-1 text-center">
              <small className="text-xs text-mist">{info.comp}</small>
              <b className="font-display text-3xl font-extrabold italic text-gold-400">VS</b>
              {derby && (
                <Badge tone="red" className="h-6 gap-1 px-2 text-xs">
                  <Flame className="size-3.5" /> Clássico
                </Badge>
              )}
            </div>
            <div className="flex min-w-0 flex-col items-center gap-2 text-center">
              <Crest club={ac} size={52} />
              <b className="line-clamp-2 font-display text-lg font-bold uppercase leading-tight">{ac.name}</b>
            </div>
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-mist">
            <MapPin className="size-4 shrink-0" aria-hidden /> {info.venue}
          </p>
        </div>

        {derby && (
          <Alert tone="warn">
            <Flame className="size-4 shrink-0 text-warn-400" aria-hidden />
            <span>
              <b>É clássico!</b> Estádio lotado, renda 40% maior e o dobro de moral e de torcida em jogo.
            </span>
          </Alert>
        )}

        {gate && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-ink-900/60 px-3 py-2.5 ring-1 ring-inset ring-white/6">
              <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-mist">
                <Users className="size-3.5" aria-hidden /> Público esperado
              </span>
              <b className="font-display text-xl tabular">{gate.attendance.toLocaleString("pt-BR")}</b>
            </div>
            <div className="rounded-xl bg-ink-900/60 px-3 py-2.5 ring-1 ring-inset ring-white/6">
              <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-mist">
                <Ticket className="size-3.5" aria-hidden /> Bilheteria prevista
              </span>
              <b className="font-display text-xl tabular text-pitch-400">{formatMoney(gate.income)}</b>
            </div>
          </div>
        )}

        {changes.length > 0 && (
          <Alert tone="warn">
            <TriangleAlert className="size-4 shrink-0 text-warn-400" aria-hidden />
            <span>Fora deste jogo (lesão/suspensão), substituídos automaticamente: {changes.join(", ")}.</span>
          </Alert>
        )}

        {/* Setores */}
        <section>
          <div className="mb-1 flex items-center justify-between gap-3">
            <SectionTitle className="truncate">{u.name}</SectionTitle>
            <SectionTitle className="truncate text-info-400">{opp.name}</SectionTitle>
          </div>
          {sectorRows.map(([label, a, b]) => (
            <StatBar key={label} label={label} left={String(Math.round(a))} right={String(Math.round(b))} a={a} b={b} />
          ))}
        </section>

        {/* Escalações */}
        <div className="grid gap-5 sm:grid-cols-2">
          <section className="min-w-0">
            <SectionTitle className="mb-1">
              Seu time • {u.formation} • {TACTICS[u.tactic].name}
            </SectionTitle>
            <LineupList w={w} club={u} />
          </section>
          <section className="min-w-0">
            <SectionTitle className="mb-1 text-info-400">
              {opp.name} • {opp.formation}
            </SectionTitle>
            <LineupList w={w} club={opp} />
          </section>
        </div>

        <p className="text-xs text-mist">No modo botão você decide a partida jogando futebol de botão. O placar vale para a temporada.</p>
      </div>
    </Modal>
  );
}
