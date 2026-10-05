"use client";

import { useMemo } from "react";
import { CircleAlert, CircleCheck, CircleX, Clock3 } from "lucide-react";
import { divisionFullName, goalProgress, user, type GoalState } from "@/game";
import { Card, Meter } from "@/components/ui/primitives";
import { Flag } from "@/components/ui/Flag";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";
import { BoardArt } from "./BoardArt";
import { confidenceTone } from "./derive";

const STATE: Record<GoalState, { icon: typeof CircleCheck; cls: string; label: string }> = {
  done: { icon: CircleCheck, cls: "text-pitch-400", label: "Cumprida" },
  on: { icon: Clock3, cls: "text-info-400", label: "No caminho" },
  risk: { icon: CircleAlert, cls: "text-warn-400", label: "Em risco" },
  failed: { icon: CircleX, cls: "text-danger-400", label: "Não cumprida" },
};

/** Diretoria: ilustração da sala, confiança no treinador e as metas da temporada com o progresso de cada uma. */
export function BoardCard() {
  const { world: w, version } = useWorld();
  const conf = Math.round(w.board.conf);
  const t = confidenceTone(conf);
  const u = user(w);
  const goals = useMemo(
    () => (w.board.goals?.length ? w.board.goals : [{ id: "league", kind: "league" as const, label: w.board.label, weight: 3, target: w.board.target }]).map((g) => ({ g, p: goalProgress(w, g) })),
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [w, version],
  );
  const done = goals.filter((x) => x.p.state === "done" || x.p.state === "on").length;

  return (
    <Card title="Diretoria" className="overflow-hidden">
      <div className="-mx-4 -mt-1 mb-3 sm:-mx-5">
        <BoardArt club={u} mood={conf} className="block h-auto w-full" />
      </div>
      <div className="flex items-center gap-4">
        <span className={cn("font-display text-5xl font-extrabold leading-none tabular", t.cls)}>
          {conf}<span className="text-2xl">%</span>
        </span>
        <span className="min-w-0">
          <span className="block font-semibold">Confiança no treinador</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-mist">
            <Flag code={u.league} /> {divisionFullName(u.div)}
          </span>
        </span>
      </div>
      <Meter value={conf} label="Confiança da diretoria" className="mt-3 h-2 w-full" />
      <p className="mt-2 text-sm text-mist">{t.text}</p>

      <h4 className="mt-4 flex items-center justify-between font-display text-xs font-bold uppercase tracking-wider text-mist">
        Metas da temporada <span className="tabular">{done}/{goals.length} em dia</span>
      </h4>
      <ul className="mt-2 space-y-1.5">
        {goals.map(({ g, p }) => {
          const s = STATE[p.state];
          const Icon = s.icon;
          return (
            <li key={g.id} className={cn("flex items-start gap-2 rounded-lg px-2 py-1.5 ring-1 ring-inset ring-white/6", g.kind === "league" ? "bg-gold-400/8" : "bg-ink-950/40")}>
              <Icon className={cn("mt-0.5 size-4 shrink-0", s.cls)} aria-label={s.label} />
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm leading-tight", g.kind === "league" ? "font-semibold text-snow" : "text-snow/90")}>{g.label.charAt(0).toUpperCase() + g.label.slice(1)}</span>
                <span className="block text-xs text-mist">{p.text}</span>
              </span>
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-mist" title="Peso da meta na avaliação da diretoria">
                {"●".repeat(Math.max(1, Math.round(g.weight)))}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
