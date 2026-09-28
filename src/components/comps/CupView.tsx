"use client";

import { useMemo } from "react";
import { Card, Alert, EmptyState } from "@/components/ui/primitives";
import { Crest } from "@/components/ui/Crest";
import { useWorld } from "@/components/game/GameProvider";
import { ResultList } from "./Results";
import { cupRounds } from "./derive";

/** Copa: situação do usuário e as cinco fases (jogo único, pênaltis no empate). */
export function CupView() {
  const { world: w, version } = useWorld();
  const rounds = useMemo(() => {
    void version;
    return cupRounds(w);
  }, [w, version]);
  const champ = w.cup.champion ? w.clubs[w.cup.champion] : null;
  const alive = w.cup.alive.includes(w.userClub);

  return (
    <div className="flex flex-col gap-4">
      {champ ? (
        <Alert tone="info">
          <Crest club={champ} size={26} />
          <span>Campeão da Copa: <b>{champ.name}</b></span>
        </Alert>
      ) : alive ? (
        <Alert tone="good">Seu time segue vivo na Copa. Jogo único; empate vai para os pênaltis.</Alert>
      ) : (
        <Alert tone="warn">Seu time foi eliminado da Copa.</Alert>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {rounds.map((r) => (
          <Card key={r.round} title={r.name} action={r.week ? <span className="text-xs text-mist">Semana {r.week}</span> : null}>
            {r.matches.length ? (
              <ResultList matches={r.matches} />
            ) : (
              <EmptyState>{r.week ? `Sorteio na semana ${r.week}.` : "Sorteio a definir."}</EmptyState>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
