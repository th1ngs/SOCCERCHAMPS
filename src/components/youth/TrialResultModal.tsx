"use client";

import { useEffect, useState } from "react";
import { Check, Gem, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Flag } from "@/components/ui/Flag";
import { Badge, OvrBadge, PosBadge } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { countryName, type YouthView } from "./derive";
import { PotentialBar } from "./PotentialBar";
import { YouthTraits } from "./YouthTraits";

const STEP_MS = 750;

const prefersReducedMotion = (): boolean => {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

/** Resultado da peneira: revela os garotos um a um (tudo de uma vez com movimento reduzido). */
export function TrialResultModal({ trialKey, views, onClose }: { trialKey: number; views: YouthView[] | null; onClose: () => void }) {
  if (!views) return null;
  // `key` reinicia a revelação a cada peneira.
  return <Reveal key={trialKey} views={views} onClose={onClose} />;
}

function Reveal({ views, onClose }: { views: YouthView[]; onClose: () => void }) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? views.length : 0));
  const done = shown >= views.length;

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 350 : STEP_MS);
    return () => clearTimeout(t);
  }, [shown, done]);

  const gems = views.filter((v) => v.gem).length;

  return (
    <Modal
      open
      onClose={onClose}
      title="Resultado da peneira"
      footer={
        done ? (
          <Button variant="primary" icon={<Check />} onClick={onClose}>
            Levar para a base
          </Button>
        ) : (
          <Button variant="ghost" icon={<SkipForward />} onClick={() => setShown(views.length)}>
            Revelar todos
          </Button>
        )
      }
    >
      <p className="mb-3 text-sm text-mist" aria-live="polite">
        {done
          ? `Os olheiros aprovaram ${views.length} ${views.length === 1 ? "garoto" : "garotos"}${gems ? ` — ${gems === 1 ? "uma joia" : `${gems} joias`} à vista!` : "."}`
          : `Avaliando garoto ${Math.min(shown + 1, views.length)} de ${views.length}…`}
      </p>
      <ul className="space-y-2">
        {views.map((v, i) => {
          const open = i < shown;
          const p = v.p;
          return (
            <li
              key={p.id}
              className={cn(
                "rounded-xl px-3 py-3 ring-1 ring-inset",
                open ? "animate-pop bg-ink-800" : "bg-ink-900/50",
                open && v.gem ? "ring-gold-400/50" : "ring-white/8",
              )}
            >
              {open ? (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <PosBadge pos={p.pos} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{p.name}</span>
                      <span className="flex items-center gap-1.5 text-xs text-mist">
                        <Flag code={p.nat} decorative /> {countryName(p.nat)} • {p.age} anos
                      </span>
                    </span>
                    {v.gem && (
                      <Badge tone="gold">
                        <Gem className="size-3" aria-hidden /> Joia
                      </Badge>
                    )}
                    <OvrBadge value={p.ovr} />
                  </div>
                  <PotentialBar range={v.range} ovr={p.ovr} />
                  <YouthTraits traits={v.traits} star={p.star} short />
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-mist" aria-hidden>
                  <span className="grid h-5 w-9 place-items-center rounded-md bg-white/8 font-display text-xs font-bold">?</span>
                  <span className="h-3 w-32 rounded bg-white/8" />
                  <span className="ml-auto h-6 w-8 rounded-lg bg-white/8" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
