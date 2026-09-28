import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SortKey, SortState } from "./squadSort";

/** Cabeçalho de coluna ordenável com aria-sort. */
export function SortableTh({ k, label, sort, onSort, align = "left" }: { k: SortKey; label: string; sort: SortState; onSort: (k: SortKey) => void; align?: "left" | "right" | "center" }) {
  const on = sort.key === k;
  const Icon = !on ? ChevronsUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={cn("px-1 py-1", align === "right" && "text-right", align === "center" && "text-center")}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn(
          "inline-flex h-9 items-center gap-1 rounded-md px-1.5 font-display text-[12px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-gold-400",
          on ? "text-gold-400" : "text-mist hover:text-snow",
        )}
      >
        {label}
        <Icon className={cn("size-3.5", !on && "opacity-40")} aria-hidden />
      </button>
    </th>
  );
}
