"use client";

import { useId, useState, type FormEvent } from "react";
import { CloudDownload } from "lucide-react";
import { CODE_PATTERN } from "@/lib/cloud";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

/** Normaliza a digitação para XXXXX-XXXXX (maiúsculas, hífen automático). */
export function formatCode(raw: string): string {
  const chars = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  return chars.length > 5 ? `${chars.slice(0, 5)}-${chars.slice(5)}` : chars;
}

/** Carregar uma carreira salva na nuvem pelo código. `onLoad` deve lançar erro com a mensagem da API. */
export function CloudLoadForm({ onLoad }: { onLoad: (code: string) => Promise<void> }) {
  const id = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!CODE_PATTERN.test(code)) {
      setError("Código inválido. Use o formato XXXXX-XXXXX (letras e números).");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onLoad(code);
    } catch (err) {
      setError((err as Error).message || "Não foi possível carregar a carreira.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Carregar da nuvem">
      <p className="mb-3 text-sm text-mist">Salvou a carreira em outro aparelho? Digite o código gerado em Clube → Nuvem.</p>
      <form onSubmit={submit} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="sr-only">Código da carreira</label>
          <input
            id={id}
            value={code}
            onChange={(e) => {
              setCode(formatCode(e.target.value));
              if (error) setError(null);
            }}
            placeholder="XXXXX-XXXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            maxLength={11}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-err` : undefined}
            className={cn(
              "h-11 w-full rounded-xl bg-ink-950/70 px-4 font-display text-xl font-bold uppercase tracking-[0.2em] text-snow ring-1 ring-inset placeholder:text-mist/50 focus:outline-none focus:ring-2",
              error ? "ring-danger-500/70 focus:ring-danger-400" : "ring-white/10 focus:ring-gold-400",
            )}
          />
          {error && (
            <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm text-danger-400">
              {error}
            </p>
          )}
        </div>
        <Button type="submit" variant="secondary" loading={loading} icon={<CloudDownload />} className="h-11">
          Carregar carreira
        </Button>
      </form>
    </Card>
  );
}
