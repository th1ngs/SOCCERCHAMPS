"use client";

import { Award, Trophy } from "lucide-react";
import { career, careerPlayer } from "@/game";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Modal } from "@/components/ui/Modal";

/** Fim de temporada do jogador: números, campanha do time, títulos e prêmios. */
export function CareerSeasonModal({ onNext }: { onNext: () => void }) {
  const { world: w } = useWorld();
  const c = career(w);
  const p = careerPlayer(w);
  const s = c?.seasons.at(-1);
  if (!c || !p) return null;
  const club = s?.club ? w.clubs[s.club] : null;
  const contractEnds = p.contract <= 1;
  return (
    <Modal
      open
      dismissible={false}
      title={`Temporada ${w.season}`}
      footer={<Button variant="primary" size="lg" onClick={onNext} data-autofocus>Próxima temporada</Button>}
    >
      {s ? (
        <>
          <div className="flex items-center gap-3">
            {club && <Crest club={club} size={44} />}
            <p className="text-sm text-mist">
              {club ? <>{club.name}{s.teamPos ? <> terminou em <b className="text-snow">{s.teamPos}º</b></> : null}.</> : "Temporada sem clube."}
            </p>
          </div>
          <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
            {[["Jogos", s.apps], ["Gols", s.goals], ["Assist.", s.assists], ["Nota", s.rating?.toFixed(2).replace(".", ",") ?? "—"]].map(([k, v]) => (
              <div key={k as string} className="rounded-xl bg-ink-950/50 p-2 ring-1 ring-inset ring-white/8">
                <dt className="text-[11px] uppercase tracking-wider text-mist">{k}</dt>
                <dd className="mt-1 font-display text-2xl font-extrabold tabular">{v}</dd>
              </div>
            ))}
          </dl>
          {(s.titles.length > 0 || s.awards.length > 0) && (
            <ul className="mt-4 space-y-1.5">
              {s.titles.map((t) => <li key={t} className="flex items-center gap-2 rounded-lg bg-gold-400/12 px-3 py-2 text-sm font-semibold text-gold-300"><Trophy className="size-4" /> Campeão: {t}</li>)}
              {s.awards.map((a) => <li key={a} className="flex items-center gap-2 rounded-lg bg-info-500/15 px-3 py-2 text-sm font-semibold text-info-400"><Award className="size-4" /> {a}</li>)}
            </ul>
          )}
          <p className="mt-4 text-sm text-mist">
            Overall {Math.round(p.ovr)} aos {p.age} anos.{" "}
            {p.clubId && contractEnds ? "Seu contrato termina agora: sem renovação, você fica livre." : p.clubId ? `Contrato: mais ${p.contract - 1} temporada(s).` : ""}
          </p>
        </>
      ) : (
        <p className="text-sm text-mist">A temporada terminou.</p>
      )}
    </Modal>
  );
}
