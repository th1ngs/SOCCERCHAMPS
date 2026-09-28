import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Crown, Medal } from "lucide-react";
import { hallOfFame, type HallOfFame } from "@/server/careers";
import { CLUBS } from "@/game/clubs";
import { Crest } from "@/components/ui/Crest";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { buttonClasses } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Hall da Fama • Soccer Champs Manager" };
export const dynamic = "force-dynamic";

const clubOf = (id: string) => CLUBS.find((c) => c.id === id);

export default async function HallPage() {
  let data: HallOfFame | null = null;
  try {
    data = await hallOfFame();
  } catch {
    data = null;
  }
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <Link href="/" className={buttonClasses("ghost", "sm", false, "mb-6")}>
        <ArrowLeft /> Voltar
      </Link>
      <PageHeader title="Hall da Fama" subtitle="Os treinadores mais vitoriosos entre todas as carreiras salvas na nuvem." />
      {!data ? (
        <EmptyState>O Hall da Fama está indisponível agora: o banco de dados não respondeu.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title={<span className="inline-flex items-center gap-2"><Crown className="size-4" /> Mais títulos</span>}>
            {data.managers.length ? (
              <ol className="divide-y divide-white/6">
                {data.managers.map((m, i) => {
                  const c = clubOf(m.clubId);
                  return (
                    <li key={`${m.managerName}-${i}`} className="flex items-center gap-3 py-2.5">
                      <span className="w-6 text-right font-display text-lg font-bold text-mist tabular">{i + 1}</span>
                      {c && <Crest club={c} size={24} />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{m.managerName}</span>
                        <span className="block truncate text-xs text-mist">{m.clubName} • temporada {m.season}</span>
                      </span>
                      <span className="font-display text-xl font-extrabold text-gold-400 tabular">{m.titles}</span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState>Nenhum título registrado ainda. Seja o primeiro!</EmptyState>
            )}
          </Card>
          <Card title={<span className="inline-flex items-center gap-2"><Medal className="size-4" /> Conquistas recentes</span>}>
            {data.recent.length ? (
              <ul className="divide-y divide-white/6">
                {data.recent.map((r, i) => {
                  const c = clubOf(r.clubId);
                  return (
                    <li key={i} className="flex items-center gap-3 py-2.5">
                      {c && <Crest club={c} size={24} />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{r.competition} {r.season}</span>
                        <span className="block truncate text-xs text-mist">{r.managerName} • {r.clubName}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState>As conquistas aparecem aqui quando alguém é campeão.</EmptyState>
            )}
          </Card>
        </div>
      )}
    </main>
  );
}
