"use client";

import { useState } from "react";
import { Flag as FlagIcon, Medal } from "lucide-react";
import {
  ATTRS, ATTRS_FOR, CAREER_RETIRE_MIN, LEAGUES, POS_NAME, TRAITS, attr, canRetire, career, careerPlayer, careerTotalsFor, formatMoney, retireCareer,
} from "@/game";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { Modal } from "@/components/ui/Modal";
import { Card, KV, OvrBadge, PosBadge, Stars } from "@/components/ui/primitives";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";
import { potentialStars, yearsText } from "@/components/player/playerInfo";
import { CareerSeasonsTable } from "@/components/playercareer/CareerSeasonsTable";

const MILESTONE_NAMES: Record<string, string> = {
  debut: "Estreia profissional", goal1: "Primeiro gol", apps50: "50 jogos", apps100: "100 jogos", apps250: "250 jogos", apps500: "500 jogos",
  goals50: "50 gols", goals100: "100 gols", goals200: "200 gols", ovr75: "Overall 75", ovr80: "Overall 80", ovr85: "Overall 85", ovr90: "Overall 90",
  intl: "Seleção", title1: "Primeiro título", ballon: "Bola de Ouro",
};

/** Perfil do jogador: atributos, contrato, números da carreira, temporadas e marcos. */
export default function CareerProfilePage() {
  const { world: w, mutate } = useWorld();
  const [confirm, setConfirm] = useState(false);
  const c = career(w);
  const p = careerPlayer(w);
  if (!c || !p) return null;
  const club = p.clubId ? w.clubs[p.clubId] : null;
  const t = careerTotalsFor(w);

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Carreira</h1>
      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card>
          <div className="flex items-center gap-4">
            <PlayerAvatar player={p} size={84} className="ring-2 ring-gold-400/60" />
            <div className="min-w-0">
              <p className="truncate font-display text-2xl font-extrabold uppercase leading-tight">{p.name}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-mist">
                <PosBadge pos={p.pos} /> {POS_NAME[p.pos]} • {p.age} anos
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-mist"><Flag code={p.nat} /> {LEAGUES[p.nat].country}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <OvrBadge value={p.ovr} size="lg" />
            <span className="text-sm text-mist">Potencial <Stars value={potentialStars(p, true)} /></span>
          </div>
          <ul className="mt-4 space-y-2">
            {ATTRS_FOR[p.pos].map((k) => {
              const v = attr(p, k);
              return (
                <li key={k} className="grid grid-cols-[96px_1fr_28px] items-center gap-2 text-sm">
                  <span className="text-mist">{ATTRS[k].name}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-white/8"><span className="block h-full rounded-full bg-linear-to-r from-pitch-500 to-gold-400" style={{ width: `${v}%` }} /></span>
                  <span className="text-right font-display font-bold tabular">{v}</span>
                </li>
              );
            })}
          </ul>
          {p.traits.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {p.traits.map((tr) => <span key={tr} className="rounded-full bg-info-500/15 px-2.5 py-1 text-xs font-semibold text-info-400" title={TRAITS[tr].desc}>{TRAITS[tr].name}</span>)}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[["Jogos", t.apps], ["Gols", t.goals], ["Assist.", t.assists], ["Títulos", t.titles], ["Prêmios", t.awards]].map(([k, v]) => (
              <div key={k as string} className="rounded-2xl bg-ink-800 p-3 ring-1 ring-inset ring-white/8">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-mist">{k}</span>
                <span className="font-display text-3xl font-extrabold tabular">{v}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Contrato">
              {club ? (
                <>
                  <p className="mb-2 flex items-center gap-2 font-semibold"><Crest club={club} size={24} /> {club.name}</p>
                  <KV label="Salário">{formatMoney(p.wage)}/sem</KV>
                  <KV label="Contrato">{yearsText(p.contract)}</KV>
                  <KV label="Multa rescisória">{formatMoney(p.releaseClause)}</KV>
                </>
              ) : (
                <p className="text-sm text-mist">Sem clube no momento.</p>
              )}
              <KV label="Patrimônio">{formatMoney(c.money)}</KV>
            </Card>
            <Card title={<span className="flex items-center gap-2"><FlagIcon className="size-4" /> Seleção</span>}>
              <KV label="Jogos">{p.intl?.[0] ?? 0}</KV>
              <KV label="Gols">{p.intl?.[1] ?? 0}</KV>
              <p className="mt-2 text-xs text-mist">A Copa das Nações acontece a cada 4 anos; são convocados os 23 melhores de cada país.</p>
            </Card>
          </div>
          <Card title={<span className="flex items-center gap-2"><Medal className="size-4" /> Marcos</span>}>
            {c.milestones.length ? (
              <div className="flex flex-wrap gap-1.5">
                {c.milestones.map((m) => <span key={m} className="rounded-full bg-gold-400/15 px-2.5 py-1 text-xs font-semibold text-gold-300">{MILESTONE_NAMES[m] ?? m}</span>)}
              </div>
            ) : (
              <p className="text-sm text-mist">Os marcos aparecem conforme a carreira avança: estreia, primeiro gol, 100 jogos…</p>
            )}
          </Card>
        </div>
      </div>

      <CareerSeasonsTable />

      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="text-xs text-mist">{canRetire(w) ? "Você pode encerrar a carreira quando quiser." : `Aposentadoria a partir dos ${CAREER_RETIRE_MIN} anos (obrigatória aos 40).`}</span>
        <Button variant="danger" disabled={!canRetire(w)} onClick={() => setConfirm(true)}>Pendurar as chuteiras</Button>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Encerrar a carreira?"
        footer={<><Button variant="ghost" onClick={() => setConfirm(false)}>Continuar jogando</Button><Button variant="danger" onClick={() => { mutate((x) => retireCareer(x)); setConfirm(false); }}>Aposentar</Button></>}
      >
        <p className="text-sm text-mist">A carreira termina agora, com {t.apps} jogos e {t.goals} gols. Isso não pode ser desfeito.</p>
      </Modal>
    </div>
  );
}
