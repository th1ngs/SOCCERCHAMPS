import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

/** Estrelas do nível da liga (meias estrelas incluídas). */
export function LeagueStars({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`Nível ${value.toFixed(1).replace(".", ",")} de 5`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }} aria-hidden>
            <Star className="absolute inset-0 text-white/15" style={{ width: size, height: size }} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="fill-gold-400 text-gold-400" style={{ width: size, height: size }} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
