"use client";

import { useMemo } from "react";
import { ArrowRight, Trophy } from "lucide-react";
import { formatMoney } from "@/game";
import type { TransferRecord } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { ClubLabel } from "./ClubLabel";
import { DeadlineBanner } from "./DeadlineBanner";
import { KIND_LABEL, newsData, windowInfo } from "./transferDerive";

function Move({ r, rank, onOpen }: { r: TransferRecord; rank?: number; onOpen: (pid: string) => void }) {
  const { world } = useWorld();
  const p = world.players[r.pid];
  const mine = r.from === world.userClub || r.to === world.userClub;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-ink-900/60 px-3 py-2.5 ring-1 ring-inset ring-white/6">
      {rank != null && <span className="w-5 shrink-0 text-center font-display text-lg font-extrabold text-gold-400 tabular">{rank}</span>}
      <div className="min-w-0 flex-1 basis-52">
        <p className="flex min-w-0 items-center gap-2">
          {p ? (
            <button type="button" onClick={() => onOpen(r.pid)} className="min-h-9 truncate rounded-md text-left font-semibold hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-gold-400">
              {r.name}
            </button>
          ) : (
            <span className="truncate font-semibold">{r.name}</span>
          )}
          {p && <span className="shrink-0 text-xs text-mist">{p.pos}</span>}
          {mine && <Badge tone="gold">Seu clube</Badge>}
        </p>
        <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-mist">
          <ClubLabel club={r.from ? world.clubs[r.from] : null} short flag />
          <ArrowRight className="size-3.5 shrink-0" aria-label="para" />
          <ClubLabel club={r.to ? world.clubs[r.to] : null} short flag empty="Sem clube" />
        </p>
      </div>
      <div className="ml-auto text-right">
        <p className="font-display text-lg font-extrabold tabular text-gold-300">{r.fee ? formatMoney(r.fee) : KIND_LABEL[r.kind]}</p>
        <p className="text-xs text-mist">
          T{r.season}, sem. {r.week}
        </p>
      </div>
    </li>
  );
}

/** Notícias do mercado: dia do fechamento, maiores negócios da temporada e transferências recentes em todas as ligas. */
export function NewsTab({ onOpen }: { onOpen: (pid: string) => void }) {
  const { world, version } = useWorld();
  const data = useMemo(
    () => ({ ...newsData(world), win: windowInfo(world) }),
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, version],
  );

  return (
    <div className="space-y-4">
      {data.win.deadline && <DeadlineBanner />}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title={
            <span className="inline-flex items-center gap-2">
              <Trophy className="size-4" aria-hidden /> Maiores negócios da temporada {world.season}
            </span>
          }
        >
          {data.top.length === 0 ? (
            <EmptyState>Nenhuma transferência com valor nesta temporada ainda.</EmptyState>
          ) : (
            <ol className="space-y-2">
              {data.top.map((r, i) => (
                <Move key={`${r.pid}-${r.season}-${r.week}-${i}`} r={r} rank={i + 1} onOpen={onOpen} />
              ))}
            </ol>
          )}
        </Card>
        <Card title="Últimas do mercado (8 semanas)">
          {data.feed.length === 0 ? (
            <EmptyState>O mercado está parado. As notícias aparecem quando os clubes fecham negócios nas janelas.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {data.feed.map((r, i) => (
                <Move key={`${r.pid}-${r.season}-${r.week}-${i}`} r={r} onOpen={onOpen} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
