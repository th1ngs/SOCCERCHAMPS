"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleCheck, CircleAlert, Info } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "info" | "good" | "bad";
interface ToastItem { id: number; text: string; tone: Tone }
const ToastCtx = createContext<(text: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const toast = useCallback((text: string, tone: Tone = "info") => {
    const id = ++seq.current;
    setItems((xs) => [...xs.slice(-2), { id, text, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200);
  }, []);
  const value = useMemo(() => toast, [toast]);
  const Icon = { info: Info, good: CircleCheck, bad: CircleAlert };
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4">
        {items.map((t) => {
          const I = Icon[t.tone];
          return (
            <div key={t.id} className={cn("flex max-w-md items-center gap-2 rounded-xl bg-snow px-4 py-2.5 text-sm font-semibold text-ink-950 shadow-xl animate-pop")}>
              <I className={cn("size-4 shrink-0", t.tone === "good" ? "text-pitch-500" : t.tone === "bad" ? "text-danger-500" : "text-info-500")} aria-hidden />
              {t.text}
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
