"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, CloudDownload, Plus } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { divisionName } from "@/game";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { useGame } from "@/components/game/GameProvider";
import { CloudLoadForm } from "@/components/start/CloudLoadForm";

/** Chamadas da abertura: continuar a carreira salva, começar uma nova ou carregar da nuvem. */
export function HeroActions() {
  const g = useGame();
  const router = useRouter();
  const toast = useToast();
  const [cloudOpen, setCloudOpen] = useState(false);
  const save = g.ready ? g.world : null;
  const club = save ? save.clubs[save.userClub] : null;

  const loadCloud = async (code: string) => {
    await g.loadFromCloud(code);
    setCloudOpen(false);
    router.push("/jogo");
    toast("Carreira carregada da nuvem.", "good");
  };

  return (
    <div className="flex flex-col gap-4">
      {!g.ready ? (
        <div className="h-12 w-72 animate-pulse rounded-xl bg-white/6" aria-hidden />
      ) : save && club ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button variant="primary" size="lg" onClick={() => router.push("/jogo")} iconRight={<ChevronRight />}>
            Continuar carreira
          </Button>
          <Link href="/nova-carreira" className={buttonClasses("outline", "lg")}>
            <Plus /> Nova carreira
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/nova-carreira" className={buttonClasses("primary", "lg")}>
            Começar carreira <ChevronRight />
          </Link>
          <Button variant="outline" size="lg" icon={<CloudDownload />} onClick={() => setCloudOpen(true)}>
            Tenho um código da nuvem
          </Button>
        </div>
      )}

      {save && club && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-mist">
          <Crest club={club} size={18} />
          <b className="font-semibold text-snow">{club.name}</b>
          <span className="inline-flex items-center gap-1.5">
            <Flag code={club.league} /> {divisionName(club.div)}
          </span>
          <span>• {save.manager.name} • temporada {save.season}</span>
        </p>
      )}
      {g.incompatibleSave && !save && (
        <Alert tone="warn" className="max-w-xl">
          Sua carreira anterior é de uma versão antiga do jogo e não pode ser aberta com as novas ligas.
          <button type="button" onClick={g.dismissIncompatible} className="font-semibold text-snow underline underline-offset-2">
            Entendi
          </button>
        </Alert>
      )}

      <Modal open={cloudOpen} onClose={() => setCloudOpen(false)} title="Carregar da nuvem">
        <p className="mb-4 text-sm text-mist">Digite o código gerado em Clube → Nuvem no outro aparelho.</p>
        <CloudLoadForm onLoad={loadCloud} />
      </Modal>
    </div>
  );
}
