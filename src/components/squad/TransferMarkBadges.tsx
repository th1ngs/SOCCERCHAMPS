import { AlertTriangle, Handshake, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { ROLE_SHORT, type TransferMarks } from "./transferMarks";

/** Papel prometido (TIT/ROT/RES) com o alerta "cobra promessa". */
export function PromiseBadge({ marks }: { marks: TransferMarks | undefined }) {
  const pr = marks?.promise;
  if (!pr) return <span className="text-mist">—</span>;
  const r = ROLE_SHORT[pr.role];
  return (
    <span className="inline-flex items-center gap-1">
      <Badge tone={r.tone} title={pr.text}>
        <Handshake className="size-3" aria-hidden />
        <span aria-hidden>{r.label}</span>
        <span className="sr-only">Prometido: {r.name}</span>
      </Badge>
      {pr.warn && (
        <Badge tone="red" title={pr.text}>
          <AlertTriangle className="size-3" aria-hidden />
          <span>Cobra</span>
          <span className="sr-only">{pr.text}</span>
        </Badge>
      )}
    </span>
  );
}

/** Empréstimo em andamento: de onde veio e quando volta. */
export function LoanBadge({ marks }: { marks: TransferMarks | undefined }) {
  const l = marks?.loan;
  if (!l) return null;
  const Icon = l.dir === "in" ? PlaneLanding : PlaneTakeoff;
  return (
    <Badge tone="blue" title={l.text}>
      <Icon className="size-3" aria-hidden />
      <span aria-hidden>Emp. até T{l.until}</span>
      <span className="sr-only">{l.text}</span>
    </Badge>
  );
}
