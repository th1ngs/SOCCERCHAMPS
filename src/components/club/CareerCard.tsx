"use client";

import { useRouter } from "next/navigation";
import { LogOut, Trophy } from "lucide-react";
import { user } from "@/game";
import { Button } from "@/components/ui/Button";
import { Card, KV, Meter, SectionTitle } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { confidenceTone } from "@/components/home/derive";

/** Diretoria (meta e confiança) e carreira do treinador, com a saída para a tela inicial. */
export function CareerCard() {
  const { world: w, commit } = useWorld();
  const router = useRouter();
  const u = user(w);
  const conf = Math.round(w.board.conf);
  const t = confidenceTone(conf);

  const quit = () => {
    commit();
    router.push("/");
  };

  return (
    <Card title="Diretoria">
      <KV label="Meta da temporada">{w.board.label}</KV>
      <KV label="Confiança">
        <span className="inline-flex items-center gap-2">
          <Meter value={conf} label="Confiança da diretoria" /> <span className={t.cls}>{conf}%</span>
        </span>
      </KV>
      <p className="mt-1 text-sm text-mist">{t.text}</p>

      <SectionTitle className="mb-1 mt-5">Carreira</SectionTitle>
      <KV label="Treinador">{w.manager.name}</KV>
      <KV label="Temporadas concluídas">{w.history.length}</KV>
      <KV label="Títulos do clube">{u.trophies.length}</KV>
      {u.trophies.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {u.trophies.slice(-6).map((tr, i) => (
            <li key={`${tr.comp}-${tr.season}-${i}`} className="inline-flex items-center gap-1.5 rounded-lg bg-gold-400/10 px-2 py-1 text-xs font-semibold text-gold-300">
              <Trophy className="size-3.5" aria-hidden /> {tr.comp} {tr.season}
            </li>
          ))}
        </ul>
      )}
      <Button variant="ghost" icon={<LogOut />} block className="mt-5" onClick={quit}>
        Salvar e sair para o início
      </Button>
    </Card>
  );
}
