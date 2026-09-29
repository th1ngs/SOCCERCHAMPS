"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  competitionName,
  divisionLevel,
  isDivision,
  knockoutStatus,
  position,
  projectedCont,
  table,
  user,
  userCompetitions,
  type KnockoutStatus,
} from "@/game";
import type { Competition, KnockoutId, World } from "@/game/types";
import { buttonClasses } from "@/components/ui/Button";
import { Badge, Card, type BadgeTone } from "@/components/ui/primitives";
import { CompName } from "@/components/comps/labels";
import { knockoutRounds, zoneOf } from "@/components/comps/derive";
import { useWorld } from "@/components/game/GameProvider";

interface CompRow {
  comp: Competition;
  status: string;
  tone: BadgeTone;
  detail?: string;
}

const KO: Record<KnockoutStatus, { text: string; tone: BadgeTone }> = {
  alive: { text: "Vivo", tone: "green" },
  eliminated: { text: "Eliminado", tone: "red" },
  champion: { text: "Campeão", tone: "gold" },
  out: { text: "Não disputa", tone: "neutral" },
};

/** Próxima fase de uma copa ainda por jogar: "Oitavas de final • sem. 10". */
function nextRound(w: World, comp: KnockoutId): string | undefined {
  const r = knockoutRounds(w, comp).find((x) => x.week > w.week || (x.week === w.week && x.matches.some((m) => !m.played)));
  return r ? `${r.name} • semana ${r.week}` : undefined;
}

function rowsOf(w: World): CompRow[] {
  const u = user(w);
  const rows: CompRow[] = [];
  for (const comp of userCompetitions(w)) {
    if (isDivision(comp)) {
      const t = table(w, comp);
      if (!t.some((r) => r.j > 0)) {
        rows.push({ comp, status: "A começar", tone: "neutral", detail: w.board.label ? `Meta: ${w.board.label}` : undefined });
        continue;
      }
      const pos = position(w, u.id);
      const zone = zoneOf(comp, pos - 1, t.length);
      const tone: BadgeTone = zone === "champ" ? "gold" : zone === "up" ? "green" : zone === "down" ? "red" : "neutral";
      const detail = zone === "champ" ? "Líder" : zone === "up" ? "Zona de acesso" : zone === "down" ? "Zona de rebaixamento" : undefined;
      rows.push({ comp, status: `${pos}º lugar`, tone, detail });
      continue;
    }
    const st = knockoutStatus(w, comp, u.id);
    rows.push({ comp, status: KO[st].text, tone: KO[st].tone, detail: st === "alive" ? nextRound(w, comp) : undefined });
  }
  // Fora da Copa dos Campeões: mostra a projeção para a próxima edição (só na primeira divisão).
  if (!rows.some((r) => r.comp === "cont") && divisionLevel(u.div) === 1) {
    const started = table(w, u.div).some((r) => r.j > 0);
    const proj = started && projectedCont(w).includes(u.id);
    rows.push({
      comp: "cont",
      status: proj ? "Classificação projetada" : "Fora da zona",
      tone: proj ? "blue" : "neutral",
      detail: `Próxima edição: os 3 primeiros de cada primeira divisão (${w.season + 1})`,
    });
  }
  return rows;
}

function Line({ comp, children, detail }: { comp: Competition; children: ReactNode; detail?: string }) {
  return (
    <li className="flex min-h-12 items-center justify-between gap-3 border-b border-white/6 py-2 last:border-0">
      <span className="min-w-0">
        <CompName comp={comp} className="max-w-full font-semibold" />
        {detail && <span className="block truncate text-xs text-mist">{detail}</span>}
      </span>
      <span className="shrink-0">{children}</span>
    </li>
  );
}

/** Competições do usuário nesta temporada e a situação em cada uma. */
export function CompetitionsCard() {
  const { world: w, version } = useWorld();
  const rows = useMemo(() => {
    void version;
    return rowsOf(w);
  }, [w, version]);

  return (
    <Card
      title="Competições da temporada"
      action={
        <Link href="/jogo/competicoes" className={buttonClasses("ghost", "sm", false, "-mr-2")}>
          Ver todas <ChevronRight />
        </Link>
      }
    >
      <ul>
        {rows.map((r) => (
          <Line key={r.comp} comp={r.comp} detail={r.detail}>
            <Badge tone={r.tone} className="h-6 px-2 text-xs" title={competitionName(r.comp)}>{r.status}</Badge>
          </Line>
        ))}
      </ul>
    </Card>
  );
}
