"use client";

import { useRef, useState } from "react";
import { Cloud, CloudAlert, CloudOff, CloudUpload, Copy, LoaderCircle, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { useWorld, type CloudStatus } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";

const STATUS: Record<CloudStatus, { text: string; cls: string; Icon: typeof Cloud }> = {
  off: { text: "Salvo só neste aparelho.", cls: "text-mist", Icon: CloudOff },
  idle: { text: "Nuvem conectada. Cada mudança é enviada automaticamente.", cls: "text-info-400", Icon: Cloud },
  saving: { text: "Salvando na nuvem…", cls: "text-info-400", Icon: LoaderCircle },
  saved: { text: "Tudo salvo na nuvem.", cls: "text-pitch-400", Icon: Cloud },
  error: { text: "Falha ao salvar na nuvem.", cls: "text-danger-400", Icon: CloudAlert },
};

/** Salvar a carreira na nuvem e mostrar o código para continuar em outro aparelho. Âncora: #nuvem. */
export function CloudCard() {
  const { cloudCode, cloudStatus, cloudError, enableCloud, syncCloud, disconnectCloud } = useWorld();
  const toast = useToast();
  const [busy, setBusy] = useState<"enable" | "sync" | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const st = STATUS[cloudStatus];

  const enable = async () => {
    setBusy("enable");
    const code = await enableCloud();
    setBusy(null);
    toast(code ? `Carreira salva na nuvem. Código: ${code}` : "Não foi possível salvar na nuvem.", code ? "good" : "bad");
  };

  const sync = async () => {
    setBusy("sync");
    await syncCloud();
    setBusy(null);
  };

  const copy = async () => {
    if (!cloudCode) return;
    try {
      await navigator.clipboard.writeText(cloudCode);
      toast("Código copiado.", "good");
    } catch {
      // Sem acesso à área de transferência: seleciona o código para cópia manual.
      const el = codeRef.current;
      el?.focus();
      el?.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      toast(ok ? "Código copiado." : "Código selecionado: copie manualmente.", ok ? "good" : "info");
    }
  };

  return (
    <Card id="nuvem" title="Salvar na nuvem" className="scroll-mt-32">
      <p className={cn("mb-3 flex items-start gap-2 text-sm", st.cls)} role="status">
        <st.Icon className={cn("mt-0.5 size-4 shrink-0", cloudStatus === "saving" && "animate-spin")} aria-hidden />
        <span>{cloudStatus === "error" && cloudError ? `${st.text} ${cloudError}` : st.text}</span>
      </p>

      {cloudCode ? (
        <>
          <span className="block text-xs uppercase tracking-wider text-mist">Código da carreira</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              ref={codeRef}
              readOnly
              value={cloudCode}
              aria-label="Código da carreira na nuvem"
              onFocus={(e) => e.currentTarget.select()}
              className="h-12 min-w-0 flex-1 rounded-xl bg-ink-950/70 px-3 font-display text-2xl font-extrabold tracking-[0.18em] text-gold-300 ring-1 ring-inset ring-gold-400/30 focus:outline-none focus:ring-2 focus:ring-gold-400 sm:text-3xl"
            />
            <Button variant="secondary" icon={<Copy />} onClick={copy} className="h-12">
              Copiar
            </Button>
          </div>
          <p className="mt-3 text-sm text-mist">
            Em outro aparelho, abra o jogo e use <b className="text-snow">Carregar da nuvem</b> na tela inicial com este código. Guarde-o: quem tiver o
            código pode continuar a carreira.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" icon={<RefreshCw />} loading={busy === "sync" || cloudStatus === "saving"} onClick={sync}>
              Sincronizar agora
            </Button>
            <Button variant="ghost" icon={<Unplug />} onClick={disconnectCloud}>
              Desconectar deste aparelho
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-mist">
            Hoje a carreira fica guardada só neste navegador. Salve na nuvem para receber um código e continuar de qualquer aparelho. Depois disso,
            cada semana é sincronizada automaticamente.
          </p>
          <Button variant="primary" icon={<CloudUpload />} loading={busy === "enable"} onClick={enable} className="mt-4">
            Salvar na nuvem
          </Button>
        </>
      )}
    </Card>
  );
}
